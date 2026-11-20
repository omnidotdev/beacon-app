import { describe, expect, test } from "bun:test";

import { EXAMPLE_PROMPTS } from "./examplePrompts";

describe("EXAMPLE_PROMPTS", () => {
  test("offers more examples than show at once, so More ideas has more", () => {
    expect(EXAMPLE_PROMPTS.length).toBeGreaterThan(4);
    expect(new Set(EXAMPLE_PROMPTS).size).toBe(EXAMPLE_PROMPTS.length);
  });

  test("keeps each example short enough for a chip", () => {
    for (const example of EXAMPLE_PROMPTS) {
      expect(example.length).toBeLessThanOrEqual(56);
      expect(example).not.toContain("—");
      expect(example).not.toMatch(/[.!?]$/);
    }
  });
});
