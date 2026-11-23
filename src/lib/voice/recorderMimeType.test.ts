import { describe, expect, test } from "bun:test";

import recorderMimeType from "./recorderMimeType";

describe("recorderMimeType", () => {
  test("prefers Opus in WebM", () => {
    expect(recorderMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  test("falls back to MP4 where only that records (Safari)", () => {
    expect(recorderMimeType((type) => type === "audio/mp4")).toBe("audio/mp4");
  });

  test("lets the recorder choose when nothing listed is supported", () => {
    expect(recorderMimeType(() => false)).toBeUndefined();
  });
});
