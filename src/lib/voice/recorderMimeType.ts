/**
 * Recording formats to try, best first: Opus in WebM (Chromium, Firefox), then
 * AAC in MP4 (Safari). The gateway names the upload from this type so speech
 * to text can decode it
 */
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/**
 * The first recording format the browser supports, or undefined to let the
 * recorder choose
 * @param isTypeSupported - the browser's `MediaRecorder.isTypeSupported`
 */
const recorderMimeType = (
  isTypeSupported: (type: string) => boolean,
): string | undefined => PREFERRED_TYPES.find((type) => isTypeSupported(type));

export default recorderMimeType;
