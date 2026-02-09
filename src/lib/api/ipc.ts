// Tauri IPC API client for native mode

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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
  ProviderInfo,
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

// Tauri event types
interface ChatTokenEvent {
  conversationId: string;
  token: string;
}

interface ChatCompleteEvent {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    timestamp: number;
  };
}

interface ChatErrorEvent {
  conversationId: string;
  error: string;
}

// IPC response types (matching Rust)
interface IpcConversation {
  id: string;
  title: string;
  lastMessage: string | null;
  updatedAt: number;
}

interface IpcMessage {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface IpcPersonaInfo {
  id: string;
  name: string;
  tagline: string | null;
  avatar: string | null;
}

interface IpcGatewayStatus {
  state: string;
  url: string | null;
  is_sidecar: boolean;
  error: string | null;
}

// Resolve the gateway URL from Tauri state
async function getGatewayUrl(): Promise<string | null> {
  try {
    const status = await invoke<IpcGatewayStatus>("get_gateway_status");
    return status.state === "connected" ? status.url : null;
  } catch {
    return null;
  }
}

// Fallback providers when gateway is unreachable
const DEFAULT_PROVIDERS: ProvidersResponse = {
  providers: [
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models with advanced reasoning",
      status: "not_configured",
      active: false,
      api_key_url: "https://console.anthropic.com/settings/keys",
      coming_soon: false,
      features: ["chat", "vision", "tools"],
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT models with broad capabilities",
      status: "not_configured",
      active: false,
      api_key_url: "https://platform.openai.com/api-keys",
      coming_soon: false,
      features: ["chat", "vision", "tools", "tts"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access multiple AI models through one API",
      status: "not_configured",
      active: false,
      api_key_url: "https://openrouter.ai/keys",
      coming_soon: false,
      features: ["chat", "vision", "tools"],
    },
  ] satisfies ProviderInfo[],
  active_provider: null,
};

function createVoiceApi(): VoiceApi {
  return {
    async getState(): Promise<VoiceState> {
      return invoke<VoiceState>("get_voice_state");
    },

    async toggle(): Promise<boolean> {
      return invoke<boolean>("toggle_voice");
    },

    async startListening(): Promise<void> {
      return invoke("start_listening");
    },

    async stopListening(
      conversationId: string | null,
    ): Promise<VoiceTranscriptResult> {
      return invoke<VoiceTranscriptResult>("stop_listening", {
        conversationId,
      });
    },

    async speak(text: string): Promise<void> {
      return invoke("speak", { text });
    },
  };
}

export function createIpcClient(): ApiClient {
  let tokenUnlisten: UnlistenFn | null = null;
  let completeUnlisten: UnlistenFn | null = null;
  let errorUnlisten: UnlistenFn | null = null;
  let activeConversationId: string | null = null;

  async function setupEventListeners(
    conversationId: string,
    onToken?: (token: string) => void,
    onComplete?: (message: Message) => void,
    onError?: (error: string) => void,
  ) {
    // Clean up previous listeners
    await cleanupEventListeners();

    activeConversationId = conversationId;

    tokenUnlisten = await listen<ChatTokenEvent>("chat_token", (event) => {
      if (event.payload.conversationId === activeConversationId) {
        onToken?.(event.payload.token);
      }
    });

    completeUnlisten = await listen<ChatCompleteEvent>(
      "chat_complete",
      (event) => {
        if (event.payload.conversationId === activeConversationId) {
          const msg = event.payload.message;
          onComplete?.({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: msg.timestamp,
          });
        }
      },
    );

    errorUnlisten = await listen<ChatErrorEvent>("chat_error", (event) => {
      if (event.payload.conversationId === activeConversationId) {
        onError?.(event.payload.error);
      }
    });
  }

  async function cleanupEventListeners() {
    if (tokenUnlisten) {
      tokenUnlisten();
      tokenUnlisten = null;
    }
    if (completeUnlisten) {
      completeUnlisten();
      completeUnlisten = null;
    }
    if (errorUnlisten) {
      errorUnlisten();
      errorUnlisten = null;
    }
  }

  return {
    // Skills - invoke gateway commands
    async listInstalledSkills(): Promise<SkillListResponse> {
      // TODO: Route through gateway when skill management is added to desktop
      return { skills: [], total: 0 };
    },

    async getSkill(_skillId: string): Promise<Skill> {
      throw new Error("Not implemented for native mode");
    },

    async searchSkills(
      _params?: SearchSkillsParams,
    ): Promise<SkillListResponse> {
      return { skills: [], total: 0 };
    },

    async installSkill(_params: InstallSkillParams): Promise<Skill> {
      throw new Error("Not implemented for native mode");
    },

    async uninstallSkill(_skillId: string): Promise<void> {
      throw new Error("Not implemented for native mode");
    },

    async setSkillEnabled(_skillId: string, _enabled: boolean): Promise<Skill> {
      throw new Error("Not implemented for native mode");
    },

    // Conversations
    async getConversations(): Promise<Conversation[]> {
      const conversations =
        await invoke<IpcConversation[]>("get_conversations");
      return conversations.map((c) => ({
        id: c.id,
        title: c.title,
        lastMessage: c.lastMessage,
        updatedAt: c.updatedAt,
      }));
    },

    async createConversation(): Promise<Conversation> {
      const conversation = await invoke<IpcConversation>("create_conversation");
      return {
        id: conversation.id,
        title: conversation.title,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
      };
    },

    async deleteConversation(conversationId: string): Promise<void> {
      return invoke("delete_conversation", { conversationId });
    },

    async getMessages(conversationId: string): Promise<Message[]> {
      const messages = await invoke<IpcMessage[]>("get_messages", {
        conversationId,
      });
      return messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: m.timestamp,
      }));
    },

    // Chat
    async sendMessage(
      conversationId: string,
      content: string,
      onToken?: (token: string) => void,
      onComplete?: (message: Message) => void,
      onError?: (error: string) => void,
    ): Promise<void> {
      await setupEventListeners(conversationId, onToken, onComplete, onError);

      try {
        await invoke("send_message", { conversationId, content });
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err));
      }
    },

    // Persona
    async getPersona(): Promise<PersonaInfo> {
      const persona = await invoke<IpcPersonaInfo>("get_persona");
      return {
        id: persona.id,
        name: persona.name,
        tagline: persona.tagline,
        avatar: persona.avatar,
      };
    },

    async getPersonas(): Promise<PersonaListResponse> {
      const response = await invoke<{
        personas: IpcPersonaInfo[];
        active_id: string;
      }>("get_personas");
      return {
        personas: response.personas.map((p) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          avatar: p.avatar,
        })),
        active_id: response.active_id,
      };
    },

    async switchPersona(personaId: string): Promise<PersonaInfo> {
      const persona = await invoke<IpcPersonaInfo>("switch_persona", {
        personaId,
      });
      return {
        id: persona.id,
        name: persona.name,
        tagline: persona.tagline,
        avatar: persona.avatar,
      };
    },

    // Marketplace Personas - not implemented for native mode
    async listInstalledPersonas(): Promise<MarketplacePersonaListResponse> {
      return { personas: [], total: 0 };
    },

    async searchMarketplacePersonas(
      _params?: SearchPersonasParams,
    ): Promise<MarketplacePersonaListResponse> {
      return { personas: [], total: 0 };
    },

    async installPersona(
      _params: InstallPersonaParams,
    ): Promise<MarketplacePersona> {
      throw new Error("Persona marketplace not implemented for native mode");
    },

    async uninstallPersona(_personaId: string): Promise<void> {
      throw new Error("Persona marketplace not implemented for native mode");
    },

    // System status - proxy to gateway
    async getStatus(): Promise<SystemStatus> {
      const url = await getGatewayUrl();
      if (!url) {
        return {
          version: "0.1.0",
          persona_id: "orin",
          voice_available: false,
        };
      }

      try {
        const response = await fetch(`${url}/ready`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Gateway returned ${response.status}`);
        }

        return response.json();
      } catch (e) {
        console.error("[ipc] Failed to fetch status from gateway:", e);
        return {
          version: "0.1.0",
          persona_id: "orin",
          voice_available: false,
        };
      }
    },

    // Providers (BYOK) - proxy to gateway HTTP API
    async getProviders(): Promise<ProvidersResponse> {
      const url = await getGatewayUrl();
      if (!url) {
        return DEFAULT_PROVIDERS;
      }

      try {
        const response = await fetch(`${url}/api/providers`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Gateway returned ${response.status}`);
        }

        return response.json();
      } catch (e) {
        console.error("[ipc] Failed to fetch providers from gateway:", e);
        return DEFAULT_PROVIDERS;
      }
    },

    async configureProvider(
      params: ConfigureProviderParams,
    ): Promise<ConfigureProviderResponse> {
      const url = await getGatewayUrl();
      if (!url) {
        return {
          success: false,
          message: "Not connected to gateway",
          provider: {
            id: params.provider,
            name: params.provider,
            description: "",
            status: "not_configured",
            active: false,
            api_key_url: null,
            coming_soon: false,
            features: [],
          },
        };
      }

      const response = await fetch(`${url}/api/providers/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response
          .text()
          .catch(() => "Failed to configure provider");
        throw new Error(error);
      }

      return response.json();
    },

    async removeProvider(
      provider: ProviderType,
    ): Promise<{ success: boolean; message: string }> {
      const url = await getGatewayUrl();
      if (!url) {
        return { success: false, message: "Not connected to gateway" };
      }

      const response = await fetch(
        `${url}/api/providers/${encodeURIComponent(provider)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const error = await response
          .text()
          .catch(() => "Failed to remove provider");
        throw new Error(error);
      }

      return response.json();
    },

    // Voice
    voice: createVoiceApi(),

    disconnect() {
      cleanupEventListeners();
    },
  };
}
