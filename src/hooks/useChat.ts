import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage, Message } from "@/lib/api";
import * as localDb from "@/lib/db/conversations";
import { isNative } from "@/lib/platform";
import { NO_PERSONA_ID } from "@/lib/persona";
import { useApi } from "./useApi";

// Track the last persona ID we successfully synced with the gateway
// so we only call switchPersona once per persona, not on every message
let syncedPersonaId: string | null = null;

/** Mark a persona as synced with the gateway (call after a successful switch) */
export function markPersonaSynced(personaId: string) {
  syncedPersonaId = personaId;
}

interface UseChatOptions {
  conversationId: string | null;
  personaId?: string;
  onError?: (error: string) => void;
  onConversationCreated?: (id: string) => void;
}

export function useChat({
  conversationId,
  personaId = "orin",
  onError,
  onConversationCreated,
}: UseChatOptions) {
  const api = useApi();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(
    null,
  );
  const streamingContentRef = useRef("");
  const activeConversationRef = useRef<string | null>(conversationId);

  // Track active conversation for event filtering
  useEffect(() => {
    activeConversationRef.current = conversationId;
  }, [conversationId]);

  // Load messages from local IndexedDB (reactive)
  const localMessages = useLiveQuery(
    async () => {
      if (!conversationId) return [];
      return localDb.getMessages(conversationId);
    },
    [conversationId],
    [] as Message[],
  );

  // Convert to ChatMessage format and append streaming message
  const messages: ChatMessage[] = [
    ...(localMessages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: new Date(m.timestamp),
    })),
    ...(streamingMessage ? [streamingMessage] : []),
  ];

  // Pre-connect WebSocket when conversation is active (web mode)
  useEffect(() => {
    if (!isNative() && conversationId && api.connect) {
      api.connect(conversationId);
    }
  }, [conversationId, api]);

  // Always mark as connected — WebSocket connects lazily on first message
  useEffect(() => {
    setIsConnected(true);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      let targetConversation = conversationId;
      let isNewConversation = false;

      // Auto-create conversation if none selected
      if (!targetConversation) {
        try {
          // Create conversation locally
          const conv = await localDb.createConversation(
            personaId,
            content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          );
          targetConversation = conv.id;
          isNewConversation = true;
        } catch (_err) {
          onError?.("Failed to create conversation");
          return;
        }
      }

      // Update ref immediately for event filtering
      activeConversationRef.current = targetConversation;

      // Ensure gateway is using the correct persona before sending
      // This guards against the UI showing one persona while the
      // gateway has a different one active (e.g. after a failed
      // initial sync during page load)
      // Skip sync in no-persona mode — the gateway has no endpoint for NO_PERSONA_ID
      if (personaId && personaId !== NO_PERSONA_ID && syncedPersonaId !== personaId) {
        try {
          await api.switchPersona(personaId);
          syncedPersonaId = personaId;
        } catch {
          // Best effort — gateway may be unreachable
        }
      }

      // Save user message to local DB
      await localDb.addMessage(targetConversation, "user", content.trim());

      // Add placeholder for streaming assistant response
      const assistantMessage: ChatMessage = {
        id: `streaming-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      setStreamingMessage(assistantMessage);

      setIsLoading(true);
      streamingContentRef.current = "";

      // Send message to gateway for AI response
      // NOTE: must happen before onConversationCreated (which triggers
      // navigate) to avoid a race where the navigation effect calls
      // api.connect() while the WebSocket is still in CONNECTING state
      await api.sendMessage(
        targetConversation,
        content.trim(),
        // onToken
        (token) => {
          streamingContentRef.current += token;
          setStreamingMessage((prev) =>
            prev ? { ...prev, content: streamingContentRef.current } : null,
          );
        },
        // onComplete
        async (message: Message) => {
          setIsLoading(false);
          setStreamingMessage(null);

          // Save assistant message to local DB
          const finalContent = message.content || streamingContentRef.current;
          if (finalContent && targetConversation) {
            await localDb.addMessage(
              targetConversation,
              "assistant",
              finalContent,
            );
          }

          streamingContentRef.current = "";
        },
        // onError
        (error) => {
          setIsLoading(false);
          setStreamingMessage(null);
          onError?.(error);
          streamingContentRef.current = "";
        },
        // personaId — omit when no persona selected so gateway uses its default
        personaId !== NO_PERSONA_ID ? personaId : undefined,
      );

      // Navigate to new conversation after WebSocket is established
      if (isNewConversation) {
        onConversationCreated?.(targetConversation);
      }
    },
    [conversationId, personaId, isLoading, api, onError, onConversationCreated],
  );

  const clearMessages = useCallback(() => {
    setStreamingMessage(null);
  }, []);

  return {
    messages,
    isConnected,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
