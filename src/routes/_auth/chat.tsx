import {
  createFileRoute,
  Link,
  useNavigate,
  useRouteContext,
  useSearch,
} from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatView } from "@/components";
import { useApi, useChat, usePersona, useProviders } from "@/hooks";
import type { SystemStatus } from "@/lib/api";
import { isCloudDeployment } from "@/lib/api";
import * as localDb from "@/lib/db/conversations";
import { isNative } from "@/lib/platform";
import createMetaTags from "@/lib/util/createMetaTags";

interface ChatSearch {
  c?: string;
}

export const Route = createFileRoute("/_auth/chat")({
  head: () => createMetaTags({ title: "Chat" }),
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
});

// Clean up legacy web session ID
if (typeof window !== "undefined") {
  localStorage.removeItem("beacon-session-id");
}

function ChatPage() {
  const search = useSearch({ from: "/_auth/chat" });
  const navigate = useNavigate();
  const { session } = useRouteContext({ from: "__root__" });
  const native = isNative();
  const api = useApi();
  const { data: persona, isLoading: personaLoading } = usePersona();

  // On cloud deployment, require sign-in to chat
  if (!native && isCloudDeployment() && !session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <LogIn size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-medium text-text">Sign in to chat</h2>
        <p className="max-w-sm text-muted">
          Create an account or sign in to start chatting with your AI assistant
        </p>
        <Link
          to="/login"
          className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-[#0a0a0f] transition-all hover:glow-primary"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // Use conversation ID from URL search params
  const conversationId = search.c ?? null;

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const { data: providers } = useProviders();

  // Check if any provider is configured (env-level or BYOK)
  const hasConfiguredProvider = providers?.providers.some(
    (p) => p.status === "configured",
  );

  // Fetch system status on mount
  useEffect(() => {
    api
      .getStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          version: "unknown",
          persona_id: "unknown",
          voice_available: false,
        }),
      );
  }, [api]);

  const handleConversationCreated = useCallback(
    (id: string) => {
      navigate({ to: "/chat", search: { c: id } });
    },
    [navigate],
  );

  const { messages, isConnected, isLoading, toolCalls, sendMessage, clearMessages } =
    useChat({
      conversationId,
      personaId: persona?.id,
      onError: setError,
      onConversationCreated: handleConversationCreated,
    });

  // Clean up empty conversations when navigating away
  const prevConversationRef = useRef<string | null>(null);
  useEffect(() => {
    const prevId = prevConversationRef.current;
    prevConversationRef.current = conversationId;

    // When conversation changes, check if the previous one was empty
    if (prevId && prevId !== conversationId) {
      localDb.getMessageCount(prevId).then((count) => {
        if (count === 0) localDb.deleteConversation(prevId);
      });
    }

    // On unmount, clean up current conversation if empty
    return () => {
      if (conversationId) {
        localDb.getMessageCount(conversationId).then((count) => {
          if (count === 0) localDb.deleteConversation(conversationId);
        });
      }
    };
  }, [conversationId]);

  // Update page title with persona name
  useEffect(() => {
    document.title = persona?.name
      ? `Chat with ${persona.name} | Beacon`
      : "Chat | Beacon";
  }, [persona?.name]);

  // Navigate to fresh chat when persona changes (not on initial load)
  const prevPersonaIdRef = useRef<string | undefined>(persona?.id);
  useEffect(() => {
    if (
      prevPersonaIdRef.current !== undefined &&
      persona?.id !== prevPersonaIdRef.current
    ) {
      clearMessages();
      navigate({ to: "/chat", search: {} });
    }
    prevPersonaIdRef.current = persona?.id;
  }, [persona?.id, clearMessages, navigate]);

  const handleSendMessage = useCallback(
    (content: string) => {
      setError(null);

      // Check if a provider is configured before sending
      if (!status?.model && !hasConfiguredProvider) {
        setError("No AI provider configured. Go to Settings to add an API key");
        return;
      }

      sendMessage(content);
    },
    [sendMessage, status, hasConfiguredProvider],
  );

  // Handle voice start from chat input
  const handleVoiceStart = useCallback(async () => {
    if (!api.voice) {
      setError("Voice not available");
      return;
    }
    try {
      // Enable voice if not enabled
      const state = await api.voice.getState();
      if (!state.enabled) {
        await api.voice.toggle();
      }
      await api.voice.startListening();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice error");
    }
  }, [api]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatView
        messages={messages}
        isLoading={isLoading}
        isConnected={isConnected}
        toolCalls={toolCalls}
        onSendMessage={handleSendMessage}
        error={error}
        voiceAvailable={status?.voice_available}
        onVoiceStart={handleVoiceStart}
        persona={persona ?? undefined}
        personaLoading={personaLoading}
        user={session?.user}
        modelLoaded={
          status ? !!status.model || !!hasConfiguredProvider : undefined
        }
      />
    </div>
  );
}
