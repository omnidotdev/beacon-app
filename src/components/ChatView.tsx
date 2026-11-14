import type {
  ChatPart,
  ChatMessage as ThreadMessage,
} from "@omnidotdev/thornberry/ai-chat-thread";
import { AiChatThread } from "@omnidotdev/thornberry/ai-chat-thread";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Coins, Mic, Settings, User } from "lucide-react";
import { useState } from "react";
import type { ToolCallState } from "@/hooks/useChat";
import type { ChatMessage, PersonaInfo } from "@/lib/api";
import type { BillingNoticeKind } from "@/lib/gateway/chatErrorCode";
import { NO_PERSONA_ID } from "@/lib/persona";
import Markdown from "./Markdown";
import ModelSelector from "./ModelSelector";
import { BeaconLogo } from "./Sidebar";

interface UserInfo {
  name?: string | null;
  image?: string | null;
}

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean;
  onSendMessage: (content: string) => void;
  error?: string | null;
  voiceAvailable?: boolean;
  onVoiceStart?: () => void;
  persona?: PersonaInfo;
  personaLoading?: boolean;
  user?: UserInfo | null;
  modelLoaded?: boolean;
  toolCalls?: Map<string, ToolCallState>;
  /** Billing-related gateway failure from the last send */
  billingNotice?: BillingNoticeKind | null;
}

/**
 * Map Beacon's chat messages onto the shared thread's typed-parts model. Each
 * message's text becomes a text part; the live tool calls (tracked separately
 * while streaming) attach as tool-call parts on the latest assistant message,
 * the same place Beacon rendered them. An empty streaming placeholder is
 * dropped so only the thread's typing indicator shows.
 */
function toThreadMessages(
  messages: ChatMessage[],
  toolCalls?: Map<string, ToolCallState>,
): ThreadMessage[] {
  const lastIndex = messages.length - 1;
  return messages
    .filter((m, i) => {
      const toolsHere =
        i === lastIndex &&
        m.role === "assistant" &&
        !!toolCalls &&
        toolCalls.size > 0;
      // Keep a message if it has content or carries the live tool calls
      return Boolean(m.content) || toolsHere;
    })
    .map((m, i, kept) => {
      const parts: ChatPart[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      const isLastKept = i === kept.length - 1;
      if (isLastKept && m.role === "assistant" && toolCalls) {
        for (const tc of toolCalls.values()) {
          parts.push({
            type: "tool-call",
            name: tc.name,
            status: tc.status,
            detail: tc.invocation,
          });
        }
      }
      return { id: m.id, role: m.role, parts };
    });
}

function ChatView({
  messages,
  isLoading,
  isConnected,
  onSendMessage,
  error,
  persona,
  personaLoading,
  user,
  modelLoaded,
  toolCalls,
  billingNotice,
}: ChatViewProps) {
  const [input, setInput] = useState("");

  const canSend = isConnected && modelLoaded !== false;

  const handleSend = () => {
    if (!input.trim() || isLoading || !canSend) return;
    onSendMessage(input);
    setInput("");
  };

  const placeholder = !isConnected
    ? "Connecting..."
    : modelLoaded === false
      ? "No model loaded, add an API key in Settings"
      : "Message...";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AiChatThread
        messages={toThreadMessages(messages, toolCalls)}
        status={isLoading ? "streaming" : "idle"}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        placeholder={placeholder}
        disabled={!canSend}
        renderText={(text) => <Markdown content={text} />}
        emptyState={
          <EmptyState
            persona={persona}
            personaLoading={personaLoading}
            user={user}
            modelLoaded={modelLoaded}
          />
        }
        notice={
          billingNotice ? (
            <BillingNotice kind={billingNotice} />
          ) : error ? (
            <ErrorNotice error={error} />
          ) : undefined
        }
        renderAvatar={(message) =>
          message.role === "user" ? (
            <UserAvatar image={user?.image} name={user?.name} />
          ) : (
            <Avatar
              name={persona?.name ?? "Assistant"}
              avatar={persona?.avatar}
              size="sm"
              personaId={persona?.id}
            />
          )
        }
        composerAccessory={<ModelSelector />}
        composerActions={
          <button
            type="button"
            disabled
            className="btn-icon cursor-not-allowed text-muted opacity-40"
            data-tooltip="Coming soon"
            aria-label="Voice input (coming soon)"
          >
            <Mic size={20} />
          </button>
        }
        footerHint="Shift+Enter for a new line"
      />
    </div>
  );
}

function EmptyState({
  persona,
  personaLoading,
  user,
  modelLoaded,
}: {
  persona?: PersonaInfo;
  personaLoading?: boolean;
  user?: UserInfo | null;
  modelLoaded?: boolean;
}) {
  const name = persona?.name ?? "Assistant";

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-6 flex items-end -space-x-4">
        {personaLoading ? (
          <div className="h-20 w-20 animate-pulse rounded-full bg-surface-elevated" />
        ) : (
          <Avatar
            name={name}
            avatar={persona?.avatar}
            size="xl"
            personaId={persona?.id}
          />
        )}
        <div className="relative z-10 rounded-full ring-2 ring-primary/20">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name ?? "You"}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-muted">
              <User size={20} />
            </div>
          )}
        </div>
      </div>
      {personaLoading ? (
        <>
          <div className="mb-2 h-7 w-56 animate-pulse rounded-lg bg-surface-elevated" />
          <div className="h-5 w-64 animate-pulse rounded-lg bg-surface-elevated" />
        </>
      ) : modelLoaded === false ? (
        <>
          <h2 className="mb-2 text-xl font-medium text-text">
            No model loaded
          </h2>
          <p className="mb-5 max-w-sm text-muted">
            Configure a provider in settings to start chatting with {name}
          </p>
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-[#0a0a0f] transition-all hover:glow-primary"
          >
            Go to Settings
            <ArrowRight size={16} />
          </Link>
        </>
      ) : (
        <>
          <h2 className="mb-2 text-xl font-medium text-text">
            Start a conversation with {name}
          </h2>
          <p className="max-w-sm text-muted">
            Ask a question, get help with a task, or just chat
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Out-of-credits or temporarily-unavailable notice for a failed send. Credits
 * are one balance shared across Omni, so the copy says so
 */
function BillingNotice({ kind }: { kind: BillingNoticeKind }) {
  if (kind === "ai_unavailable") {
    return (
      <p className="text-amber-400 text-sm">
        The assistant is temporarily unavailable. Please try again in a moment.
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-2 text-amber-400 text-sm">
      You are out of Omni credits (shared across Omni).
      <Link
        to="/settings"
        className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      >
        <Coins size={14} />
        Buy credits or upgrade
      </Link>
    </p>
  );
}

function ErrorNotice({ error }: { error: string }) {
  const isProviderError = error.includes("No AI provider configured");

  return (
    <p className="text-red-400 text-sm">
      {isProviderError ? (
        <span className="flex items-center gap-2">
          No AI provider configured.{" "}
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            <Settings size={14} />
            Add an API key
          </Link>
        </span>
      ) : (
        `Error: ${error}`
      )}
    </p>
  );
}

interface AvatarProps {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  personaId?: string;
}

const avatarIconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-10 w-10",
};

function Avatar({ name, avatar, size = "md", personaId }: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-20 w-20 text-2xl",
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-accent/20`}
      />
    );
  }

  if (personaId === NO_PERSONA_ID) {
    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary`}
      >
        <BeaconLogo className={avatarIconSizes[size]} />
      </div>
    );
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 font-semibold text-accent`}
    >
      {initials}
    </div>
  );
}

function UserAvatar({
  image,
  name,
}: {
  image?: string | null;
  name?: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "You"}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-muted">
      <User size={16} />
    </div>
  );
}

export default ChatView;
