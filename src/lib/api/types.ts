// Shared API types for both HTTP and IPC clients

// Skills

export type SkillSource =
  | { type: "local" }
  | { type: "manifold"; namespace: string; repository: string }
  | { type: "bundled" };

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string | null;
  author: string | null;
  tags: string[];
  permissions: string[];
  source: SkillSource;
  enabled: boolean;
  installed_at: string | null;
}

export interface SkillListResponse {
  skills: Skill[];
  total: number;
}

export interface SearchSkillsParams {
  q?: string;
  namespace?: string;
}

export interface InstallSkillParams {
  namespace: string;
  skill_id: string;
}

// Sessions / Conversations

export interface Session {
  id: string;
  user_id: string;
  channel: string;
  channel_id: string;
  persona_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string | null;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// Users

export interface User {
  id: string;
  life_json_path: string | null;
  created_at: string;
}

export interface CreateUserParams {
  id: string;
  life_json_path?: string;
}

// Persona

export interface PersonaInfo {
  id: string;
  name: string;
  tagline: string | null;
  avatar: string | null;
  accent_color?: string;
}

export interface PersonaListResponse {
  personas: PersonaInfo[];
  active_id: string;
}

// Marketplace Personas

export type PersonaSource =
  | { type: "local" }
  | { type: "manifold"; namespace: string };

export interface MarketplacePersona {
  id: string;
  name: string;
  tagline: string | null;
  avatar: string | null;
  accent_color: string | null;
  icon: string | null;
  source: PersonaSource;
  installed_at: string | null;
}

export interface MarketplacePersonaListResponse {
  personas: MarketplacePersona[];
  total: number;
}

export interface SearchPersonasParams {
  q?: string;
  namespace?: string;
}

export interface InstallPersonaParams {
  namespace: string;
  persona_id: string;
}

// System status

export interface SystemStatus {
  version: string;
  persona_id: string;
  model?: {
    id: string;
    provider: string;
  };
  voice_available: boolean;
}

// Providers (BYOK)

export type ProviderType =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "omni_credits";

export type ProviderStatus =
  | "configured"
  | "not_configured"
  | "coming_soon"
  | "invalid";

export interface ProviderInfo {
  id: ProviderType;
  name: string;
  description: string;
  status: ProviderStatus;
  active: boolean;
  api_key_url: string | null;
  coming_soon: boolean;
  features: string[];
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
  active_provider: ProviderType | null;
}

export interface ConfigureProviderParams {
  provider: ProviderType;
  api_key?: string;
  model?: string;
}

export interface ConfigureProviderResponse {
  success: boolean;
  message: string;
  provider: ProviderInfo;
}

// Voice

export interface VoiceState {
  enabled: boolean;
  listening: boolean;
}

export interface VoiceTranscriptResult {
  conversationId: string;
  transcript: string;
  createdConversation: boolean;
}

// Chat events (for streaming)

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// API client interface

export interface VoiceApi {
  getState(): Promise<VoiceState>;
  toggle(): Promise<boolean>;
  startListening(): Promise<void>;
  stopListening(conversationId: string | null): Promise<VoiceTranscriptResult>;
  speak(text: string): Promise<void>;
}

export interface ApiClient {
  // Skills
  listInstalledSkills(): Promise<SkillListResponse>;
  getSkill(skillId: string): Promise<Skill>;
  searchSkills(params?: SearchSkillsParams): Promise<SkillListResponse>;
  installSkill(params: InstallSkillParams): Promise<Skill>;
  uninstallSkill(skillId: string): Promise<void>;
  setSkillEnabled(skillId: string, enabled: boolean): Promise<Skill>;

  // Conversations (native) / Sessions (web)
  getConversations(): Promise<Conversation[]>;
  createConversation(): Promise<Conversation>;
  deleteConversation(conversationId: string): Promise<void>;
  getMessages(conversationId: string): Promise<Message[]>;

  // Chat
  sendMessage(
    conversationId: string,
    content: string,
    onToken?: (token: string) => void,
    onComplete?: (message: Message) => void,
    onError?: (error: string) => void,
    personaId?: string,
  ): Promise<void>;

  // Persona
  getPersona(): Promise<PersonaInfo>;
  getPersonas(): Promise<PersonaListResponse>;
  switchPersona(personaId: string): Promise<PersonaInfo>;

  // Marketplace Personas
  listInstalledPersonas(): Promise<MarketplacePersonaListResponse>;
  searchMarketplacePersonas(
    params?: SearchPersonasParams,
  ): Promise<MarketplacePersonaListResponse>;
  installPersona(params: InstallPersonaParams): Promise<MarketplacePersona>;
  uninstallPersona(personaId: string): Promise<void>;

  // System status
  getStatus(): Promise<SystemStatus>;

  // Providers (BYOK)
  getProviders(): Promise<ProvidersResponse>;
  configureProvider(
    params: ConfigureProviderParams,
  ): Promise<ConfigureProviderResponse>;
  removeProvider(
    provider: ProviderType,
  ): Promise<{ success: boolean; message: string }>;

  // Voice (null on web)
  voice: VoiceApi | null;

  // Connection management (for WebSocket cleanup)
  connect?(sessionId: string): void;
  disconnect?(): void;
}
