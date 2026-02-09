import { useCallback, useEffect, useState } from "react";
import type { VoiceState, VoiceTranscriptResult } from "@/lib/api";
import { hasVoiceSupport } from "@/lib/platform";
import { useApi } from "./useApi";

interface UseVoiceOptions {
  conversationId: string | null;
  onTranscript?: (transcript: string, conversationId: string) => void;
  onConversationCreated?: (id: string) => void;
}

export function useVoice({
  conversationId,
  onTranscript,
  onConversationCreated,
}: UseVoiceOptions) {
  const api = useApi();
  const [voiceState, setVoiceState] = useState<VoiceState>({
    enabled: false,
    listening: false,
  });
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if voice is available
  useEffect(() => {
    if (!hasVoiceSupport() || !api.voice) {
      setIsAvailable(false);
      return;
    }

    setIsAvailable(true);
    api.voice
      .getState()
      .then(setVoiceState)
      .catch(() => {
        setIsAvailable(false);
      });
  }, [api]);

  const toggleVoice = useCallback(async () => {
    if (!api.voice) return;

    try {
      const enabled = await api.voice.toggle();
      setVoiceState((prev) => ({ ...prev, enabled }));
    } catch {
      // Ignore errors
    }
  }, [api]);

  const toggleListening = useCallback(async () => {
    if (!api.voice) return;

    try {
      if (voiceState.listening) {
        // Stop listening and get transcript
        setVoiceState((prev) => ({ ...prev, listening: false }));
        const result: VoiceTranscriptResult =
          await api.voice.stopListening(conversationId);

        // If a new conversation was created, notify parent
        if (result.createdConversation) {
          onConversationCreated?.(result.conversationId);
        }

        // Pass transcript to parent
        onTranscript?.(result.transcript, result.conversationId);
      } else {
        await api.voice.startListening();
        setVoiceState((prev) => ({ ...prev, listening: true }));
      }
    } catch (err) {
      console.error("Voice error:", err);
      setVoiceState((prev) => ({ ...prev, listening: false }));
    }
  }, [
    api,
    voiceState.listening,
    conversationId,
    onTranscript,
    onConversationCreated,
  ]);

  const speak = useCallback(
    async (text: string) => {
      if (!api.voice) return;
      await api.voice.speak(text);
    },
    [api],
  );

  return {
    isAvailable,
    voiceState,
    toggleVoice,
    toggleListening,
    speak,
  };
}
