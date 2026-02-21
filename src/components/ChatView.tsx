import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUp, Mic, Settings, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolCallState } from "@/hooks/useChat";
import type { ChatMessage, PersonaInfo } from "@/lib/api";
import { NO_PERSONA_ID } from "@/lib/persona";
import Markdown from "./Markdown";
import ModelSelector from "./ModelSelector";
import { BeaconLogo } from "./Sidebar";
import ToolCallBlock from "./ToolCallBlock";

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
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledRef = useRef(false);
  const prevMessageCountRef = useRef(messages.length);

  // Autofocus input on new chat
  useEffect(() => {
    if (messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [messages.length]);

  // Track user scroll intent (distinguish user scrolls from programmatic)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let isUserGesture = false;
    let gestureTimer: ReturnType<typeof setTimeout>;

    const markGesture = () => {
      isUserGesture = true;
      clearTimeout(gestureTimer);
      gestureTimer = setTimeout(() => {
        isUserGesture = false;
      }, 200);
    };

    const handleWheel = (e: WheelEvent) => {
      markGesture();
      if (e.deltaY < 0) userScrolledRef.current = true;
    };

    const handleScroll = () => {
      if (!isUserGesture) return;

      const threshold = 80;
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledRef.current = distanceFromBottom > threshold;
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", markGesture, { passive: true });
    container.addEventListener("touchmove", markGesture, { passive: true });
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", markGesture);
      container.removeEventListener("touchmove", markGesture);
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(gestureTimer);
    };
  }, []);

  // Auto-scroll on new messages/streaming, respecting user scroll intent
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll on message changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNewConversation =
      prevMessageCountRef.current === 0 && messages.length > 0;
    prevMessageCountRef.current = messages.length;

    // First message appears at the top naturally
    if (isNewConversation) return;

    const isUserMessage =
      messages.length > 0 && messages[messages.length - 1]?.role === "user";

    // Sending a message re-enables auto-scroll
    if (isUserMessage) userScrolledRef.current = false;
    if (userScrolledRef.current) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const canSend = isConnected && modelLoaded !== false;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || !canSend) return;

      onSendMessage(input);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    },
    [input, isLoading, canSend, onSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages area with fade effect */}
      <div
        ref={messagesContainerRef}
        className="scroll-fade-top min-h-0 flex-1 overflow-auto"
      >
        <div className="px-6 pb-6 pt-14">
          {messages.length === 0 ? (
            <EmptyState
              persona={persona}
              personaLoading={personaLoading}
              user={user}
              modelLoaded={modelLoaded}
            />
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((msg) =>
                msg.isStreaming && !msg.content ? null : msg.isError ? (
                  <ErrorMessage key={msg.id} error={msg.content} />
                ) : (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    persona={persona}
                    user={user}
                  />
                ),
              )}
              {isLoading && toolCalls && toolCalls.size > 0 && (
                <div className="mx-auto max-w-2xl">
                  <div className="bubble-assistant rounded-2xl rounded-bl-md px-4 py-2">
                    {Array.from(toolCalls.values()).map((tc) => (
                      <ToolCallBlock key={tc.toolId} toolCall={tc} />
                    ))}
                  </div>
                </div>
              )}
              {isLoading &&
                (!toolCalls || toolCalls.size === 0) &&
                messages[messages.length - 1]?.content === "" && (
                  <ThinkingIndicator persona={persona} />
                )}
              {error && <ErrorMessage error={error} />}
            </div>
          )}
        </div>
      </div>

      {/* Floating input area */}
      <div className="relative z-10 shrink-0 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <ModelSelector />
          <form
            onSubmit={handleSubmit}
            className="group glass-panel flex flex-col rounded-2xl p-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                !isConnected
                  ? "Connecting..."
                  : modelLoaded === false
                    ? "No model loaded, add an API key in Settings"
                    : "Message..."
              }
              disabled={isLoading || !canSend}
              className="max-h-[200px] w-full resize-none bg-transparent px-3 py-2 text-text outline-none placeholder:text-muted/60 disabled:opacity-50"
            />

            <div className="flex items-center justify-between px-1">
              <span className="select-none text-[11px] text-transparent transition-opacity group-focus-within:text-muted/30">
                Shift+Enter for new line
              </span>

              <div className="flex items-center gap-2">
                {/* Voice button (coming soon) */}
                <button
                  type="button"
                  disabled
                  className="btn-icon opacity-40 cursor-not-allowed text-muted"
                  data-tooltip="Coming soon"
                >
                  <Mic size={20} />
                </button>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || !canSend}
                  className="send-button"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
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

function MessageBubble({
  message,
  persona,
  user,
}: {
  message: ChatMessage;
  persona?: PersonaInfo;
  user?: UserInfo | null;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <UserAvatar image={user?.image} name={user?.name} />
        ) : (
          <Avatar
            name={persona?.name ?? "Assistant"}
            avatar={persona?.avatar}
            size="sm"
            personaId={persona?.id}
          />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 ${
          isUser
            ? "bubble-user rounded-br-md py-1.5"
            : "bubble-assistant rounded-bl-md py-3"
        }`}
      >
        <div
          className={`text-text ${isUser ? "leading-normal" : "leading-relaxed"}`}
        >
          <Markdown content={message.content} />
        </div>
        {message.isStreaming && <StreamingIndicator />}
      </div>
    </div>
  );
}

function StreamingIndicator() {
  return (
    <span className="ml-1 inline-flex gap-1">
      <span className="streaming-dot" />
      <span className="streaming-dot" />
      <span className="streaming-dot" />
    </span>
  );
}

function ThinkingIndicator({ persona }: { persona?: PersonaInfo }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-shrink-0">
        <Avatar
          name={persona?.name ?? "Assistant"}
          avatar={persona?.avatar}
          size="sm"
          personaId={persona?.id}
        />
      </div>
      <div className="bubble-assistant flex items-center rounded-2xl rounded-bl-md px-4 py-3">
        <span className="inline-flex gap-1">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </span>
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: string }) {
  const isProviderError = error.includes("No AI provider configured");

  return (
    <div className="glass-panel rounded-xl border-red-500/30 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-400">
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
    </div>
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
