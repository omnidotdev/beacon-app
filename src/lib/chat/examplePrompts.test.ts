import { describe, expect, test } from "bun:test";

import {
  EXAMPLE_PROMPTS,
  examplePromptsFor,
  PERSONA_EXAMPLE_PROMPTS,
} from "./examplePrompts";

const allSets = [
  ["everyday", EXAMPLE_PROMPTS],
  ...Object.entries(PERSONA_EXAMPLE_PROMPTS),
] as const;

describe.each(allSets)("%s example prompts", (_name, prompts) => {
  test("offers more examples than show at once, so More ideas has more", () => {
    expect(prompts.length).toBeGreaterThan(4);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  test("keeps each example short enough for a chip", () => {
    for (const example of prompts) {
      expect(example.length).toBeLessThanOrEqual(56);
      expect(example).not.toContain("—");
      expect(example).not.toMatch(/[.!?]$/);
    }
  });
});

describe("examplePromptsFor", () => {
  test("matches the persona's specialty", () => {
    expect(examplePromptsFor("microcap")).toBe(
      PERSONA_EXAMPLE_PROMPTS.microcap as readonly string[],
    );
  });

  test("falls back to everyday asks for other personas", () => {
    expect(examplePromptsFor("orin")).toBe(EXAMPLE_PROMPTS);
    expect(examplePromptsFor(undefined)).toBe(EXAMPLE_PROMPTS);
    expect(examplePromptsFor("someone-installed")).toBe(EXAMPLE_PROMPTS);
  });
});
