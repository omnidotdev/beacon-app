// Unified gateway client for all platforms
//
// Replaces the separate HTTP and IPC clients with a single client
// that connects to the beacon-gateway over HTTP/WebSocket

import { getCloudGatewayUrl, isCloudDeployment } from "../api";
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
import { isNative } from "../platform";
import {
  type ConnectionState,
  type DiscoveredGateway,
  getGatewayDiscovery,
} from "./discovery";
import { type DeviceIdentity, loadOrCreateIdentity } from "./identity";
import { NodeRegistrationService } from "./node";

// WebSocket message types (matching gateway)
interface WsIncoming {
  type: "chat" | "ping";
  content?: string;
  persona_id?: string;
  model_override?: string;
}

interface WsOutgoing {
  type:
    | "chat_chunk"
    | "chat_complete"
    | "error"
    | "pong"
    | "connected"
    | "tool_start"
    | "tool_result";
  content?: string;
  message_id?: string;
  code?: string;
  message?: string;
  session_id?: string;
  // Tool event fields
  tool_id?: string;
  name?: string;
  invocation?: string;
  output?: string;
  is_error?: boolean;
}

interface GatewayClientConfig {
  // Default device name for new identities
  defaultDeviceName?: string;

  // WebSocket reconnection settings
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Create a gateway client that connects to the beacon-gateway
 */
function createGatewayClient(
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
  let tokenRefresher: (() => Promise<string | null>) | null = null;
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let wsAuthenticated = false;
  let streamingContent = "";
  // Resolvers for code awaiting the gateway auth handshake result
  let authWaiters: ((ok: boolean) => void)[] = [];
  let nodeService: NodeRegistrationService | null = null;
  const messageCallbacks: Map<
    string,
    {
      onToken?: (token: string) => void;
      onComplete?: (message: Message) => void;
      onError?: (error: string) => void;
      onToolStart?: (toolId: string, name: string) => void;
      onToolResult?: (
        toolId: string,
        name: string,
        invocation: string,
        output: string,
        isError: boolean,
      ) => void;
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

  /** Call the registered token refresher and update the stored token */
  async function refreshAccessToken(): Promise<string | null> {
    if (!tokenRefresher) return accessToken;
    try {
      const fresh = await tokenRefresher();
      if (fresh) {
        accessToken = fresh;
      } else {
        // Refresher returned null — clear expired token rather than reusing it
        accessToken = null;
      }
      return accessToken;
    } catch (err) {
      console.error("[gateway] Token refresh failed:", err);
      accessToken = null;
      return null;
    }
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

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // On 401, try refreshing the token and retry once
    if (response.status === 401 && tokenRefresher) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        headers.set("Authorization", `Bearer ${fresh}`);
        response = await fetch(url, { ...options, headers });
      }
    }

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
      // Don't reset reconnectAttempts here — wait for the "connected"
      // message which confirms the gateway accepted our auth. Otherwise
      // a rejected-then-closed WS resets the counter and loops forever.
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
      const wasAuthenticated = wsAuthenticated;
      ws = null;
      wsAuthenticated = false;

      // Notify any in-flight message that the connection was lost
      failPendingCallbacks(
        wasAuthenticated ? "Connection lost" : "Authentication failed",
      );

      // Attempt reconnection with a fresh token
      if (reconnectAttempts < maxReconnectAttempts && sessionId) {
        const currentSessionId = sessionId;
        reconnectAttempts++;
        setTimeout(async () => {
          const fresh = await refreshAccessToken();
          // Don't reconnect if we couldn't get a valid token
          if (!fresh) {
            console.warn("[gateway] No valid token after refresh, stopping reconnect");
            return;
          }
          connectWebSocket(currentSessionId);
        }, reconnectDelay * reconnectAttempts);
      }
    };
  }

  function failPendingCallbacks(reason: string): void {
    for (const resolve of authWaiters) resolve(false);
    authWaiters = [];
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
    wsAuthenticated = false;
  }

  function handleWsMessage(msg: WsOutgoing): void {
    // Handle different message types
    switch (msg.type) {
      case "connected":
        console.log("[gateway] Session connected:", msg.session_id);
        reconnectAttempts = 0;
        wsAuthenticated = true;
        for (const resolve of authWaiters) resolve(true);
        authWaiters = [];
        break;

      case "chat_chunk":
        // Accumulate streaming content and route to active callbacks
        if (msg.content) {
          streamingContent += msg.content;
        }
        for (const cb of messageCallbacks.values()) {
          cb.onToken?.(msg.content || "");
        }
        break;

      case "chat_complete":
        // Complete the message with accumulated content
        for (const [key, cb] of messageCallbacks.entries()) {
          cb.onComplete?.({
            id: msg.message_id || key,
            role: "assistant",
            content: streamingContent,
            timestamp: Date.now(),
          });
          messageCallbacks.delete(key);
        }
        streamingContent = "";
        break;

      case "error":
        // If auth waiters are pending, this is an auth rejection — resolve
        // them as failed instead of propagating to message callbacks
        if (authWaiters.length > 0) {
          for (const resolve of authWaiters) resolve(false);
          authWaiters = [];
        } else {
          for (const cb of messageCallbacks.values()) {
            cb.onError?.(msg.message || "Unknown error");
          }
          messageCallbacks.clear();
        }
        streamingContent = "";
        break;

      case "pong":
        // Keepalive response
        break;

      case "tool_start":
        if (msg.tool_id && msg.name) {
          for (const cb of messageCallbacks.values()) {
            cb.onToolStart?.(msg.tool_id, msg.name);
          }
        }
        break;

      case "tool_result":
        if (msg.tool_id && msg.name) {
          for (const cb of messageCallbacks.values()) {
            cb.onToolResult?.(
              msg.tool_id,
              msg.name,
              msg.invocation ?? "",
              msg.output ?? "",
              msg.is_error ?? false,
            );
          }
        }
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
      onToolStart?: (toolId: string, name: string) => void,
      onToolResult?: (
        toolId: string,
        name: string,
        invocation: string,
        output: string,
        isError: boolean,
      ) => void,
    ): Promise<void> {
      /** Wait for the gateway auth handshake ("connected" or "error") */
      function waitForAuth(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 10_000);
          authWaiters.push((ok) => {
            clearTimeout(timeout);
            resolve(ok);
          });
        });
      }

      /** Refresh token if missing or expired */
      async function ensureFreshToken(): Promise<void> {
        if (!tokenRefresher) return;
        let needsRefresh = !accessToken;
        if (!needsRefresh && accessToken) {
          try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            needsRefresh = (payload.exp as number) * 1000 < Date.now();
          } catch {
            needsRefresh = true;
          }
        }
        if (needsRefresh) {
          await refreshAccessToken();
        }
      }

      /** Connect and wait for auth, retrying once with a fresh token on failure */
      async function connectWithAuth(sid: string): Promise<boolean> {
        await ensureFreshToken();
        connectWebSocket(sid);
        let ok = await waitForAuth();

        // Auth failed — refresh token and retry once
        if (!ok && tokenRefresher) {
          const fresh = await refreshAccessToken();
          if (fresh) {
            connectWebSocket(sid);
            ok = await waitForAuth();
          }
        }
        return ok;
      }

      // Ensure WebSocket is connected to the right session
      if (sessionId !== conversationId || ws?.readyState !== WebSocket.OPEN) {
        const authOk = await connectWithAuth(conversationId);
        if (!authOk || ws?.readyState !== WebSocket.OPEN) {
          onError?.("Authentication failed. Please sign in again.");
          return;
        }
      }

      // WS is open but gateway hasn't confirmed auth yet (e.g. pre-connect
      // or auto-reconnect raced ahead of the auth handshake)
      if (!wsAuthenticated) {
        let authOk = await waitForAuth();

        // Auth rejected on the existing connection — reconnect with fresh token
        if (!authOk) {
          authOk = await connectWithAuth(conversationId);
        }

        if (!authOk || ws?.readyState !== WebSocket.OPEN) {
          onError?.("Authentication failed. Please sign in again.");
          return;
        }
      }

      // Register callbacks
      const callbackId = `${conversationId}-${Date.now()}`;
      messageCallbacks.set(callbackId, {
        onToken,
        onComplete,
        onError,
        onToolStart,
        onToolResult,
      });

      // Send message with explicit persona and model to prevent server-side drift.
      // "auto" means use Synapse's default threshold routing — don't send an override.
      const storedModel = localStorage.getItem("beacon-selected-model");
      const modelOverride =
        storedModel && storedModel !== "auto" ? storedModel : undefined;
      sendWsMessage({
        type: "chat",
        content,
        persona_id: personaId,
        model_override: modelOverride,
      });
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
      const changed = token !== accessToken;
      accessToken = token;

      // Reconnect WS with fresh token so the gateway sees the new JWT
      if (changed && token && sessionId && ws?.readyState === WebSocket.OPEN) {
        const currentSessionId = sessionId;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        ws = null;
        connectWebSocket(currentSessionId);
      }
    },

    setTokenRefresher(refresher: (() => Promise<string | null>) | null): void {
      tokenRefresher = refresher;
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
  /** Register a callback that returns a fresh token on demand */
  setTokenRefresher(refresher: (() => Promise<string | null>) | null): void;
}

// Singleton instance
let clientInstance: (ApiClient & GatewayClientExtensions) | null = null;

export function getGatewayClient(): ApiClient & GatewayClientExtensions {
  if (!clientInstance) {
    clientInstance = createGatewayClient();
  }
  return clientInstance;
}
