import { Loader2, Mic, Square } from "lucide-react";
import { useCallback } from "react";

import { usePlan } from "@/hooks";
import useDictation from "@/hooks/useDictation";
import { isCloudDeployment } from "@/lib/api";
import { isPaidTier } from "@/lib/billing/plan";
import getChatErrorKind, {
  type BillingNoticeKind,
} from "@/lib/gateway/chatErrorCode";

/** Why dictation could not produce text, for the composer notice */
export type DictationIssue =
  | BillingNoticeKind
  | "upgrade"
  | "microphone_denied"
  | "failed";

interface DictationButtonProps {
  disabled?: boolean;
  /** Receives the transcript of each finished recording */
  onText: (text: string) => void;
  /** Receives why dictation failed, or null once it works again */
  onIssue: (issue: DictationIssue | null) => void;
}

/**
 * Composer mic: tap to dictate, tap again to stop, and the transcript joins
 * the draft. In the cloud, speech to text is part of the paid plans (the free
 * plan's AI key has no speech access), so free accounts see the upgrade
 * instead of a recording that would fail
 */
function DictationButton({ disabled, onText, onIssue }: DictationButtonProps) {
  const { data: plan } = usePlan();
  const included = !isCloudDeployment() || isPaidTier(plan?.tier);

  const onError = useCallback(
    (failure: string | null) => {
      if (failure === null) return onIssue(null);
      if (failure === "microphone_denied") return onIssue("microphone_denied");

      const kind = getChatErrorKind(failure);
      onIssue(kind === "other" ? "failed" : kind);
    },
    [onIssue],
  );

  const { status, supported, start, stop } = useDictation({ onText, onError });

  if (!supported) return null;

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  const handleClick = () => {
    if (recording) return stop();
    if (!included) return onIssue("upgrade");
    start();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || transcribing}
      aria-pressed={recording}
      aria-label={
        recording
          ? "Stop dictation"
          : transcribing
            ? "Transcribing"
            : "Dictate a message"
      }
      data-tooltip={recording ? "Stop" : "Dictate"}
      className={`btn-icon ${
        recording
          ? "animate-pulse border-primary text-primary"
          : "text-muted-foreground hover:text-text"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {transcribing ? (
        <Loader2 size={20} className="animate-spin" />
      ) : recording ? (
        <Square size={20} />
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
}

export default DictationButton;
