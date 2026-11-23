import { useCallback, useEffect, useRef, useState } from "react";

import { getExtendedClient } from "@/lib/api";
import { TranscriptionError } from "@/lib/gateway";
import recorderMimeType from "@/lib/voice/recorderMimeType";

/** Where dictation is: idle, capturing speech, or waiting on the transcript */
type DictationStatus = "idle" | "recording" | "transcribing";

/**
 * Why dictation failed: a gateway error code, `microphone_denied`, or
 * `transcription_failed`; null clears a previous failure
 */
type DictationFailure = string | null;

interface UseDictationOptions {
  /** Receives the transcript of each finished recording */
  onText: (text: string) => void;
  /** Receives the reason a recording or transcription failed */
  onError: (failure: DictationFailure) => void;
}

/**
 * Speak a message instead of typing it: record from the microphone, then
 * transcribe through the gateway on the user's plan
 */
const useDictation = ({ onText, onError }: UseDictationOptions) => {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Known only in the browser, and decided after mount so the server render
  // and the first client render match
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
    );
  }, []);

  // Release the microphone if the composer unmounts mid-recording
  useEffect(
    () => () => {
      for (const track of recorderRef.current?.stream.getTracks() ?? []) {
        track.stop();
      }
    },
    [],
  );

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("microphone_denied");
      return;
    }

    const mimeType = recorderMimeType((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = async () => {
      for (const track of stream.getTracks()) track.stop();
      recorderRef.current = null;

      const audio = new Blob(chunks, { type: recorder.mimeType });
      if (!audio.size) {
        setStatus("idle");
        return;
      }

      setStatus("transcribing");
      try {
        const text = await getExtendedClient()?.transcribe(audio);
        if (text?.trim()) onText(text.trim());
        onError(null);
      } catch (error) {
        onError(
          error instanceof TranscriptionError && error.code
            ? error.code
            : "transcription_failed",
        );
      } finally {
        setStatus("idle");
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }, [onText, onError]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  return { status, supported, start, stop };
};

export default useDictation;
