// Unified gateway client for all platforms
//
// Replaces the separate HTTP and IPC clients with a single client
// that connects to the beacon-gateway over HTTP/WebSocket

import { getCloudGatewayUrl, isCloudDeployment } from "../api";
import { isNative } from "../platform";
import { NodeRegistrationService } from "./node";
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
} from "../api/types";
import {
  type ConnectionState,
  type DiscoveredGateway,
  getGatewayDiscovery,
} from "./discovery";
import { type DeviceIdentity, loadOrCreateIdentity } from "./identity";

// WebSocket message types (matching gateway)
interface WsIncoming {
  type: "chat" | "ping";
  content?: string;
  persona_id?: string;
  model_override?: string;
}

interface WsOutgoing {
  type: "chat_chunk" | "chat_complete" | "error" | "pong" | "connected";
  content?: string;
  message_id?: string;
  code?: string;
  message?: string;
  session_id?: string;
}

export interface GatewayClientConfig {
  // Default device name for new identities
  defaultDeviceName?: string;

  // WebSocket reconnection settings
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Create a gateway client that connects to the beacon-gateway
 */
export function createGatewayClient(
  config: GatewayClientConfig = {},
): ApiClient & GatewayClientExtensions {
  const {
    defaultDeviceName = "Beacon App",
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
  } = config;

  let identity: DeviceIdentity | null = null;
  let gateway: DiscoveredGateway | null = null;
  let sessionId: string | null = null;
  let accessToken: string | null = null;
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let nodeService: NodeRegistrationService | null = null;
  const messageCallbacks: Map<
    string,
    {
      onToken?: (token: string) => void;
      onComplete?: (message: Message) => void;
      onError?: (error: string) => void;
    }
  > = new Map();

  // Node registration for native platforms only
  function startNodeRegistration(gatewayUrl: string): void {
    if (!isNative()) return;

    stopNodeRegistration();

    nodeService = new NodeRegistrationService({
      gatewayUrl,
      defaultDeviceName,
    });
    nodeService.start();
    console.log("[gateway] Node registration started");
  }

  function stopNodeRegistration(): void {
    if (nodeService) {
      nodeService.stop();
      nodeService = null;
      console.log("[gateway] Node registration stopped");
    }
  }

  // Discovery integration
  const discovery = getGatewayDiscovery();
  discovery.subscribe((state) => {
    if (state.status === "connected") {
      gateway = state.gateway;
      startNodeRegistration(state.gateway.url);
    } else if (state.status === "disconnected") {
      gateway = null;
      disconnectWebSocket();
      stopNodeRegistration();
    }
  });

  // Auto-start discovery when client is created
  discovery.startDiscovery();

  function getBaseUrl(): string {
    // On cloud deployment, call the gateway directly
    if (isCloudDeployment()) {
      return getCloudGatewayUrl();
    }

    if (!gateway) {
      throw new Error("Not connected to a gateway");
    }
    return gateway.url;
  }

  async function ensureIdentity(): Promise<DeviceIdentity> {
    if (!identity) {
      identity = await loadOrCreateIdentity(defaultDeviceName);
    }
    return identity;
  }

  async function fetchWithAuth<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const id = await ensureIdentity();
    const url = `${getBaseUrl()}${path}`;

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    headers.set("X-Device-ID", id.deviceId);

    // Add session ID if we have one
    if (sessionId) {
      headers.set("X-Session-ID", sessionId);
    }

    // Add JWT access token for authenticated endpoints (BYOK, etc)
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(`Gateway unavailable (${response.status})`);
      }
      const error = await response.text();
      throw new Error(error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  function connectWebSocket(sid: string): void {
    // Already connected to this session
    if (ws?.readyState === WebSocket.OPEN && sessionId === sid) return;

    // Different session — close the old connection first
    if (ws) {
      failPendingCallbacks("Session changed");
      // Remove handlers so the old onclose doesn't null our new ws
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
      ws = null;
    }

    sessionId = sid;

    let wsUrl: string;
    if (isCloudDeployment()) {
      // Connect directly to gateway — Nitro HTTP proxy doesn't support
      // WebSocket upgrade, so bypass it for WS connections
      wsUrl = `wss://gateway.beacon.omni.dev/ws/chat/${sessionId}`;
    } else {
      const protocol = gateway?.tls ? "wss" : "ws";
      const host = gateway?.url.replace(/^https?:\/\//, "");
      wsUrl = `${protocol}://${host}/ws/chat/${sessionId}`;
    }

    // Pass JWT token for authenticated sessions (BYOK key resolution, etc)
    if (accessToken) {
      const sep = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${sep}token=${encodeURIComponent(accessToken)}`;
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[gateway] WebSocket connected");
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsOutgoing = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (e) {
        console.error("[gateway] Failed to parse WebSocket message:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[gateway] WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("[gateway] WebSocket disconnected");
      ws = null;

      // Notify any in-flight message that the connection was lost
      failPendingCallbacks("Connection lost");

      // Attempt reconnection
      if (reconnectAttempts < maxReconnectAttempts && sessionId) {
        const currentSessionId = sessionId;
        reconnectAttempts++;
        setTimeout(
          () => connectWebSocket(currentSessionId),
          reconnectDelay * reconnectAttempts,
        );
      }
    };
  }

  function failPendingCallbacks(reason: string): void {
    for (const cb of messageCallbacks.values()) {
      cb.onError?.(reason);
    }
    messageCallbacks.clear();
  }

  function disconnectWebSocket(): void {
    failPendingCallbacks("Disconnected from gateway");
    if (ws) {
      ws.close();
      ws = null;
    }
    sessionId = null;
  }

  function handleWsMessage(msg: WsOutgoing): void {
    // Handle different message types
    switch (msg.type) {
      case "connected":
        console.log("[gateway] Session connected:", msg.session_id);
        break;

      case "chat_chunk":
        // Route to all active callbacks (we don't have message ID yet)
        for (const cb of messageCallbacks.values()) {
          cb.onToken?.(msg.content || "");
        }
        break;

      case "chat_complete":
        // Complete the message
        for (const [key, cb] of messageCallbacks.entries()) {
          cb.onComplete?.({
            id: msg.message_id || key,
            role: "assistant",
            content: "", // Content was streamed
            timestamp: Date.now(),
          });
          messageCallbacks.delete(key);
        }
        break;

      case "error":
        for (const cb of messageCallbacks.values()) {
          cb.onError?.(msg.message || "Unknown error");
        }
        messageCallbacks.clear();
        break;

      case "pong":
        // Keepalive response
        break;
    }
  }

  function sendWsMessage(msg: WsIncoming): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  // === API Client Implementation ===

  const client: ApiClient & GatewayClientExtensions = {
    // Skills
    async listInstalledSkills(): Promise<SkillListResponse> {
      return fetchWithAuth("/api/skills");
    },

    async getSkill(skillId: string): Promise<Skill> {
      return fetchWithAuth(`/api/skills/${encodeURIComponent(skillId)}`);
    },

    async searchSkills(
      params?: SearchSkillsParams,
    ): Promise<SkillListResponse> {
      const query = new URLSearchParams();
      if (params?.q) query.set("q", params.q);
      if (params?.namespace) query.set("namespace", params.namespace);
      return fetchWithAuth(`/api/skills/search?${query}`);
    },

    async installSkill(params: InstallSkillParams): Promise<Skill> {
      return fetchWithAuth("/api/skills/install", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    async uninstallSkill(skillId: string): Promise<void> {
      await fetchWithAuth(`/api/skills/${encodeURIComponent(skillId)}`, {
        method: "DELETE",
      });
    },

    async setSkillEnabled(skillId: string, enabled: boolean): Promise<Skill> {
      return fetchWithAuth(
        `/api/skills/${encodeURIComponent(skillId)}/${enabled ? "enable" : "disable"}`,
        { method: "POST" },
      );
    },

    // Conversations
    async getConversations(): Promise<Conversation[]> {
      const deviceIdentity = await ensureIdentity();
      const response = await fetchWithAuth<{ sessions: Conversation[] }>(
        `/api/admin/users/${deviceIdentity.deviceId}/sessions`,
      );
      return response.sessions || [];
    },

    async createConversation(): Promise<Conversation> {
      // Ensure identity exists before creating conversation
      await ensureIdentity();
      const convId = `web-${Date.now()}`;

      // Connect WebSocket to create session implicitly
      connectWebSocket(convId);

      return {
        id: convId,
        title: "New Conversation",
        lastMessage: null,
        updatedAt: Date.now(),
      };
    },

    async deleteConversation(conversationId: string): Promise<void> {
      await fetchWithAuth(`/api/admin/sessions/${conversationId}`, {
        method: "DELETE",
      });
    },

    async getMessages(conversationId: string): Promise<Message[]> {
      const response = await fetchWithAuth<{ messages: Message[] }>(
        `/api/admin/sessions/${conversationId}/messages`,
      );
      return response.messages || [];
    },

    // Chat
    async sendMessage(
      conversationId: string,
      content: string,
      onToken?: (token: string) => void,
      onComplete?: (message: Message) => void,
      onError?: (error: string) => void,
      personaId?: string,
    ): Promise<void> {
      // Ensure WebSocket is connected to the right session
      if (sessionId !== conversationId || ws?.readyState !== WebSocket.OPEN) {
        connectWebSocket(conversationId);

        // Wait for WebSocket to actually open
        await new Promise<void>((resolve, reject) => {
          if (ws?.readyState === WebSocket.OPEN) {
            resolve();
            return;
          }

          const timeout = setTimeout(() => {
            reject(new Error("WebSocket connection timeout"));
          }, 5000);

          const onOpen = () => {
            clearTimeout(timeout);
            ws?.removeEventListener("open", onOpen);
            ws?.removeEventListener("error", onErr);
            resolve();
          };
          const onErr = () => {
            clearTimeout(timeout);
            ws?.removeEventListener("open", onOpen);
            ws?.removeEventListener("error", onErr);
            reject(new Error("WebSocket connection failed"));
          };

          ws?.addEventListener("open", onOpen);
          ws?.addEventListener("error", onErr);
        }).catch((err) => {
          onError?.(err.message);
          return;
        });

        // If connection failed, bail out
        if (ws?.readyState !== WebSocket.OPEN) return;
      }

      // Register callbacks
      const callbackId = `${conversationId}-${Date.now()}`;
      messageCallbacks.set(callbackId, { onToken, onComplete, onError });

      // Send message with explicit persona and model to prevent server-side drift
      const modelOverride = localStorage.getItem("beacon-selected-model") ?? undefined;
      sendWsMessage({ type: "chat", content, persona_id: personaId, model_override: modelOverride });
    },

    // Persona
    async getPersona(): Promise<PersonaInfo> {
      return fetchWithAuth("/api/persona");
    },

    async getPersonas(): Promise<PersonaListResponse> {
      return fetchWithAuth("/api/personas");
    },

    async switchPersona(personaId: string): Promise<PersonaInfo> {
      return fetchWithAuth(
        `/api/personas/${encodeURIComponent(personaId)}/activate`,
        {
          method: "POST",
        },
      );
    },

    // Marketplace Personas
    async listInstalledPersonas(): Promise<MarketplacePersonaListResponse> {
      return fetchWithAuth("/api/personas/marketplace");
    },

    async searchMarketplacePersonas(
      params?: SearchPersonasParams,
    ): Promise<MarketplacePersonaListResponse> {
      const query = new URLSearchParams();
      if (params?.q) query.set("q", params.q);
      if (params?.namespace) query.set("namespace", params.namespace);
      return fetchWithAuth(`/api/personas/marketplace/search?${query}`);
    },

    async installPersona(
      params: InstallPersonaParams,
    ): Promise<MarketplacePersona> {
      return fetchWithAuth("/api/personas/marketplace/install", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    async uninstallPersona(personaId: string): Promise<void> {
      await fetchWithAuth(
        `/api/personas/marketplace/${encodeURIComponent(personaId)}`,
        { method: "DELETE" },
      );
    },

    // System status
    async getStatus(): Promise<SystemStatus> {
      return fetchWithAuth("/api/status");
    },

    // Providers (BYOK)
    async getProviders(): Promise<ProvidersResponse> {
      return fetchWithAuth("/api/providers");
    },

    async configureProvider(
      params: ConfigureProviderParams,
    ): Promise<ConfigureProviderResponse> {
      return fetchWithAuth("/api/providers/configure", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },

    async removeProvider(
      provider: ProviderType,
    ): Promise<{ success: boolean; message: string }> {
      return fetchWithAuth(`/api/providers/${encodeURIComponent(provider)}`, {
        method: "DELETE",
      });
    },

    // Voice API (via gateway)
    voice: {
      async getState(): Promise<VoiceState> {
        return fetchWithAuth("/api/voice/state");
      },

      async toggle(): Promise<boolean> {
        const response = await fetchWithAuth<{ enabled: boolean }>(
          "/api/voice/toggle",
          { method: "POST" },
        );
        return response.enabled;
      },

      async startListening(): Promise<void> {
        await fetchWithAuth("/api/voice/listen/start", { method: "POST" });
      },

      async stopListening(
        conversationId: string | null,
      ): Promise<VoiceTranscriptResult> {
        return fetchWithAuth("/api/voice/listen/stop", {
          method: "POST",
          body: JSON.stringify({ conversation_id: conversationId }),
        });
      },

      async speak(text: string): Promise<void> {
        await fetchWithAuth("/api/voice/speak", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
      },
    } satisfies VoiceApi,

    // Connection management
    connect(sid: string): void {
      connectWebSocket(sid);
    },

    disconnect(): void {
      disconnectWebSocket();
    },

    // === Gateway-specific extensions ===

    getIdentity(): Promise<DeviceIdentity> {
      return ensureIdentity();
    },

    getConnectionState(): ConnectionState {
      return discovery.getState();
    },

    subscribeToConnectionState(
      callback: (state: ConnectionState) => void,
    ): () => void {
      return discovery.subscribe(callback);
    },

    async connectToGateway(url: string): Promise<void> {
      await discovery.connectTo(url);
    },

    disconnectFromGateway(): void {
      discovery.disconnect();
      disconnectWebSocket();
      stopNodeRegistration();
    },

    getDiscoveredGateways(): DiscoveredGateway[] {
      return discovery.getGateways();
    },

    async startDiscovery(): Promise<void> {
      await discovery.startDiscovery();
    },

    async stopDiscovery(): Promise<void> {
      await discovery.stopDiscovery();
    },

    setAccessToken(token: string | null): void {
      accessToken = token;
    },
  };

  return client;
}

// Extension interface for gateway-specific features
export interface GatewayClientExtensions {
  getIdentity(): Promise<DeviceIdentity>;
  getConnectionState(): ConnectionState;
  subscribeToConnectionState(
    callback: (state: ConnectionState) => void,
  ): () => void;
  connectToGateway(url: string): Promise<void>;
  disconnectFromGateway(): void;
  getDiscoveredGateways(): DiscoveredGateway[];
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  /** Set JWT access token for authenticated API calls (BYOK, etc) */
  setAccessToken(token: string | null): void;
}

// Singleton instance
let clientInstance: (ApiClient & GatewayClientExtensions) | null = null;

export function getGatewayClient(): ApiClient & GatewayClientExtensions {
  if (!clientInstance) {
    clientInstance = createGatewayClient();
  }
  return clientInstance;
}
