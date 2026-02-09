import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useVoice } from "@/hooks";

interface VoiceControlsProps {
  conversationId: string | null;
  onTranscript?: (transcript: string, conversationId: string) => void;
  onConversationCreated?: (id: string) => void;
}

function VoiceControls({
  conversationId,
  onTranscript,
  onConversationCreated,
}: VoiceControlsProps) {
  const { isAvailable, voiceState, toggleVoice, toggleListening } = useVoice({
    conversationId,
    onTranscript,
    onConversationCreated,
  });

  if (!isAvailable) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 border-t border-border bg-surface p-4">
      <button
        type="button"
        onClick={toggleVoice}
        title={voiceState.enabled ? "Disable voice" : "Enable voice"}
        className={`rounded-full p-3 ${
          voiceState.enabled ? "bg-primary text-text" : "bg-muted/30 text-muted"
        }`}
      >
        {voiceState.enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      <button
        type="button"
        onClick={toggleListening}
        disabled={!voiceState.enabled}
        title={voiceState.listening ? "Stop listening" : "Start listening"}
        className={`rounded-full p-4 ${
          voiceState.listening
            ? "animate-pulse bg-red-500 text-text"
            : voiceState.enabled
              ? "bg-primary text-text"
              : "bg-muted/30 text-muted"
        } ${!voiceState.enabled && "cursor-not-allowed opacity-50"}`}
      >
        {voiceState.listening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
    </div>
  );
}

export default VoiceControls;
