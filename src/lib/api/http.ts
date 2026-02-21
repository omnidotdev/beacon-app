// HTTP/WebSocket API client for web mode

import type {
  ApiClient,
  ConfigureProviderParams,
  ConfigureProviderResponse,
  Conversation,
  InstallPersonaParams,
  InstallSkillParams,
  MarketplacePersona,
  MarketplacePersonaListResponse,
  Message,
  PersonaInfo,
  PersonaListResponse,
  ProvidersResponse,
  ProviderType,
  SearchPersonasParams,
  SearchSkillsParams,
  Skill,
  SkillListResponse,
  SystemStatus,
  VoiceApi,
  VoiceState,
  VoiceTranscriptResult,
} from "./types";

// Use /gateway prefix for gateway API in web mode
// The /api path is reserved for the app's own API routes (auth, etc.)
const API_BASE = "/gateway";

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: { code: "unknown", message: response.statusText },
    }));
    throw new Error(error.error.message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

// Generate a session ID for the web client
function getSessionId(): string {
  const stored = localStorage.getItem("beacon-session-id");
  if (stored) return stored;

  const id = `web-${crypto.randomUUID()}`;
  localStorage.setItem("beacon-session-id", id);
  return id;
}

interface WsIncoming {
  type:
    | "chat_chunk"
    | "chat_complete"
    | "error"
    | "pong"
    | "connected"
    | "tool_start"
    | "tool_result";
  // chat_chunk
  content?: string;
  // chat_complete
  message_id?: string;
  // connected
  session_id?: string;
  // error
  code?: string;
  message?: string;
  // tool_start / tool_result
  tool_id?: string;
  name?: string;
  // tool_result only
  invocation?: string;
  output?: string;
  is_error?: boolean;
}

// Voice capabilities response from server
interface VoiceCapabilities {
  stt_available: boolean;
  tts_available: boolean;
}

// Create web voice implementation
function createWebVoice(): VoiceApi {
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  const voiceState: VoiceState = { enabled: false, listening: false };
  let capabilitiesChecked = false;
  let capabilitiesAvailable = false;

  // Check if voice services are available
  async function checkCapabilities(): Promise<boolean> {
    if (capabilitiesChecked) return capabilitiesAvailable;

    try {
      const response = await fetch(`${API_BASE}/voice/capabilities`);
      if (response.ok) {
        const caps: VoiceCapabilities = await response.json();
        capabilitiesAvailable = caps.stt_available && caps.tts_available;
      }
    } catch {
      capabilitiesAvailable = false;
    }
    capabilitiesChecked = true;
    return capabilitiesAvailable;
  }

  return {
    async getState(): Promise<VoiceState> {
      await checkCapabilities();
      return { ...voiceState };
    },

    async toggle(): Promise<boolean> {
      if (!(await checkCapabilities())) {
        throw new Error("Voice not available");
      }
      voiceState.enabled = !voiceState.enabled;
      if (!voiceState.enabled && voiceState.listening) {
        voiceState.listening = false;
        if (mediaRecorder?.state === "recording") {
          mediaRecorder.stop();
        }
      }
      return voiceState.enabled;
    },

    async startListening(): Promise<void> {
      if (!voiceState.enabled) {
        throw new Error("Voice not enabled");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      // Prefer WAV-compatible format, fall back to webm
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
      voiceState.listening = true;
    },

    async stopListening(
      conversationId: string | null,
    ): Promise<VoiceTranscriptResult> {
      if (!mediaRecorder || mediaRecorder.state !== "recording") {
        throw new Error("Not listening");
      }

      // Capture recorder reference for use in callbacks
      const recorder = mediaRecorder;

      // Stop recording and wait for data
      const audioBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: recorder.mimeType });
          resolve(blob);
        };
        recorder.stop();
      });

      voiceState.listening = false;

      // Stop all tracks to release microphone
      for (const track of recorder.stream.getTracks()) {
        track.stop();
      }

      // Convert to WAV if needed (for now send as-is, gateway handles it)
      // TODO: Convert webm to WAV client-side for better compatibility
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Send to transcribe endpoint
      const response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": audioBlob.type,
        },
        body: new Uint8Array(arrayBuffer),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Transcription failed" } }));
        throw new Error(error.error?.message || "Transcription failed");
      }

      const result: { text: string } = await response.json();

      return {
        conversationId: conversationId ?? getSessionId(),
        transcript: result.text,
        createdConversation: !conversationId,
      };
    },

    async speak(text: string): Promise<void> {
      const response = await fetch(`${API_BASE}/voice/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Synthesis failed" } }));
        throw new Error(error.error?.message || "Synthesis failed");
      }

      const audioData = await response.arrayBuffer();
      const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      await audio.play();

      // Clean up URL after playback
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    },
  };
}

export function createHttpClient(): ApiClient {
  let ws: WebSocket | null = null;
  let currentSessionId: string | null = null;
  let tokenCallback: ((token: string) => void) | null = null;
  let completeCallback: ((message: Message) => void) | null = null;
  let errorCallback: ((error: string) => void) | null = null;
  let toolStartCallback: ((toolId: string, name: string) => void) | null = null;
  let toolResultCallback:
    | ((
        toolId: string,
        name: string,
        invocation: string,
        output: string,
        isError: boolean,
      ) => void)
    | null = null;
  let streamingContent = "";

  function connect(sessionId: string) {
    if (ws && currentSessionId === sessionId) return;

    disconnect();
    currentSessionId = sessionId;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // WebSocket connects directly to gateway via proxy
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${sessionId}`;

    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg: WsIncoming = JSON.parse(event.data);

        switch (msg.type) {
          case "chat_chunk":
            if (msg.content) {
              streamingContent += msg.content;
              tokenCallback?.(msg.content);
            }
            break;

          case "chat_complete":
            completeCallback?.({
              id: msg.message_id ?? crypto.randomUUID(),
              role: "assistant",
              content: streamingContent,
              timestamp: Date.now(),
            });
            streamingContent = "";
            break;

          case "error":
            errorCallback?.(msg.message ?? "Unknown error");
            streamingContent = "";
            break;

          case "tool_start":
            if (msg.tool_id && msg.name) {
              toolStartCallback?.(msg.tool_id, msg.name);
            }
            break;

          case "tool_result":
            if (msg.tool_id && msg.name) {
              toolResultCallback?.(
                msg.tool_id,
                msg.name,
                msg.invocation ?? "",
                msg.output ?? "",
                msg.is_error ?? false,
              );
            }
            break;
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      errorCallback?.("WebSocket connection failed");
    };
  }

  function disconnect() {
    if (ws) {
      ws.close();
      ws = null;
      currentSessionId = null;
    }
  }

  return {
    // Skills
    async listInstalledSkills(): Promise<SkillListResponse> {
      const response = await fetch(`${API_BASE}/skills`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async getSkill(skillId: string): Promise<Skill> {
      const response = await fetch(`${API_BASE}/skills/${skillId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async searchSkills(
      params: SearchSkillsParams = {},
    ): Promise<SkillListResponse> {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set("q", params.q);
      if (params.namespace) searchParams.set("namespace", params.namespace);

      const response = await fetch(
        `${API_BASE}/skills/search?${searchParams.toString()}`,
        { headers: getHeaders() },
      );
      return handleResponse(response);
    },

    async installSkill(params: InstallSkillParams): Promise<Skill> {
      const response = await fetch(`${API_BASE}/skills/install`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(params),
      });
      return handleResponse(response);
    },

    async uninstallSkill(skillId: string): Promise<void> {
      const response = await fetch(`${API_BASE}/skills/${skillId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async setSkillEnabled(skillId: string, enabled: boolean): Promise<Skill> {
      const response = await fetch(`${API_BASE}/skills/${skillId}/enabled`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ enabled }),
      });
      return handleResponse(response);
    },

    // Conversations - web uses sessions
    async getConversations(): Promise<Conversation[]> {
      const response = await fetch(`${API_BASE}/admin/sessions`, {
        headers: getHeaders(),
      });
      const sessions =
        await handleResponse<
          Array<{
            id: string;
            channel_id: string;
            updated_at: string;
          }>
        >(response);

      return sessions.map((s) => ({
        id: s.channel_id,
        title: `Session ${s.channel_id.slice(0, 8)}`,
        lastMessage: null,
        updatedAt: new Date(s.updated_at).getTime(),
      }));
    },

    async createConversation(): Promise<Conversation> {
      // Web mode auto-creates sessions on first message
      const id = getSessionId();
      return {
        id,
        title: "New conversation",
        lastMessage: null,
        updatedAt: Date.now(),
      };
    },

    async deleteConversation(_conversationId: string): Promise<void> {
      // Not implemented for web mode
    },

    async getMessages(conversationId: string): Promise<Message[]> {
      const response = await fetch(
        `${API_BASE}/admin/sessions/${conversationId}/messages`,
        { headers: getHeaders() },
      );
      const messages =
        await handleResponse<
          Array<{
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            created_at: string;
          }>
        >(response);

      return messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
      }));
    },

    // Chat
    async sendMessage(
      conversationId: string,
      content: string,
      onToken?: (token: string) => void,
      onComplete?: (message: Message) => void,
      onError?: (error: string) => void,
      personaId?: string,
      onToolStart?: (toolId: string, name: string) => void,
      onToolResult?: (
        toolId: string,
        name: string,
        invocation: string,
        output: string,
        isError: boolean,
      ) => void,
    ): Promise<void> {
      // Ensure WebSocket is connected
      connect(conversationId);

      // Wait for connection if needed
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Connection timeout")),
            5000,
          );
          ws?.addEventListener(
            "open",
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          ws?.addEventListener(
            "error",
            () => {
              clearTimeout(timeout);
              reject(new Error("Connection failed"));
            },
            { once: true },
          );
        });
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        onError?.("Not connected");
        return;
      }

      // Set up callbacks
      tokenCallback = onToken ?? null;
      completeCallback = onComplete ?? null;
      errorCallback = onError ?? null;
      toolStartCallback = onToolStart ?? null;
      toolResultCallback = onToolResult ?? null;
      streamingContent = "";

      // Send message with explicit persona and model to prevent server-side drift.
      // "auto" means use Synapse's default threshold routing — don't send an override.
      const storedModel = localStorage.getItem("beacon-selected-model");
      const modelOverride =
        storedModel && storedModel !== "auto" ? storedModel : undefined;
      ws.send(
        JSON.stringify({
          type: "chat",
          content,
          persona_id: personaId,
          model_override: modelOverride,
        }),
      );
    },

    // Persona
    async getPersona(): Promise<PersonaInfo> {
      const response = await fetch(`${API_BASE}/persona`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async getPersonas(): Promise<PersonaListResponse> {
      const response = await fetch(`${API_BASE}/personas`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async switchPersona(personaId: string): Promise<PersonaInfo> {
      const response = await fetch(
        `${API_BASE}/personas/${personaId}/activate`,
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      return handleResponse(response);
    },

    // Marketplace Personas
    async listInstalledPersonas(): Promise<MarketplacePersonaListResponse> {
      const response = await fetch(`${API_BASE}/personas/marketplace`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async searchMarketplacePersonas(
      params: SearchPersonasParams = {},
    ): Promise<MarketplacePersonaListResponse> {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set("q", params.q);
      if (params.namespace) searchParams.set("namespace", params.namespace);

      const response = await fetch(
        `${API_BASE}/personas/marketplace/search?${searchParams.toString()}`,
        { headers: getHeaders() },
      );
      return handleResponse(response);
    },

    async installPersona(
      params: InstallPersonaParams,
    ): Promise<MarketplacePersona> {
      const response = await fetch(`${API_BASE}/personas/marketplace/install`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(params),
      });
      return handleResponse(response);
    },

    async uninstallPersona(personaId: string): Promise<void> {
      const response = await fetch(
        `${API_BASE}/personas/marketplace/${personaId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
      );
      return handleResponse(response);
    },

    // System status
    async getStatus(): Promise<SystemStatus> {
      const response = await fetch(`${API_BASE}/status`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    // Providers (BYOK)
    async getProviders(): Promise<ProvidersResponse> {
      const response = await fetch(`${API_BASE}/providers`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    async configureProvider(
      params: ConfigureProviderParams,
    ): Promise<ConfigureProviderResponse> {
      const response = await fetch(`${API_BASE}/providers/configure`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(params),
      });
      return handleResponse(response);
    },

    async removeProvider(
      provider: ProviderType,
    ): Promise<{ success: boolean; message: string }> {
      const response = await fetch(
        `${API_BASE}/providers/${encodeURIComponent(provider)}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
      );
      return handleResponse(response);
    },

    // Voice via HTTP API
    voice: createWebVoice(),

    connect,
    disconnect,
  };
}
