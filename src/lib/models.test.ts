import { describe, expect, it } from "bun:test";
import type { ManagedModelsResponse } from "@/lib/api";
import {
  getAvailableModels,
  getDefaultModelId,
  getModelName,
  resolveSelection,
} from "./models";

const managed: ManagedModelsResponse = {
  models: [
    {
      id: "anthropic/claude-haiku-5-5",
      name: "Claude Haiku 5.5",
      default: true,
      context_window: 1_000_000,
      credits_per_mtok: { input: 20, output: 100 },
    },
    {
      id: "anthropic/claude-sonnet-5-5",
      name: "Claude Sonnet 5.5",
      default: false,
      context_window: 1_000_000,
      credits_per_mtok: { input: 400, output: 2000 },
    },
  ],
  default_model: "anthropic/claude-haiku-5-5",
};

describe("getAvailableModels", () => {
  it("takes managed models from the gateway, not a local list", () => {
    const grouped = getAvailableModels(["omni_credits"], managed);
    expect(grouped.omni_credits?.map((m) => m.id)).toEqual([
      "anthropic/claude-haiku-5-5",
      "anthropic/claude-sonnet-5-5",
    ]);
    expect(grouped.omni_credits?.[0]?.name).toBe("Claude Haiku 5.5");
  });

  it("offers no managed models until the gateway list loads", () => {
    const grouped = getAvailableModels(["omni_credits"], undefined);
    expect(grouped.omni_credits).toBeUndefined();
  });

  it("never offers a hardcoded managed model or the old auto entry", () => {
    const grouped = getAvailableModels(["omni_credits"], {
      models: [],
      default_model: null,
    });
    expect(grouped.omni_credits).toBeUndefined();
  });

  it("keeps BYOK models for configured providers only", () => {
    const grouped = getAvailableModels(["anthropic"], managed);
    expect(grouped.omni_credits).toBeUndefined();
    expect(grouped.anthropic?.length).toBeGreaterThan(0);
    expect(grouped.openai).toBeUndefined();
  });
});

describe("getDefaultModelId", () => {
  it("is the gateway-marked default for the user's plan", () => {
    expect(
      getDefaultModelId(getAvailableModels(["omni_credits"], managed), managed),
    ).toBe("anthropic/claude-haiku-5-5");
  });

  it("falls back to the first available model without a managed default", () => {
    const grouped = getAvailableModels(["anthropic"], undefined);
    expect(getDefaultModelId(grouped, undefined)).toBe(
      grouped.anthropic?.[0]?.id ?? null,
    );
  });

  it("is null when nothing is available", () => {
    expect(getDefaultModelId({}, undefined)).toBeNull();
  });
});

describe("resolveSelection", () => {
  const grouped = getAvailableModels(["omni_credits", "anthropic"], managed);

  it("keeps a selection that is still offered", () => {
    expect(resolveSelection("anthropic/claude-sonnet-5-5", grouped, true)).toBe(
      "anthropic/claude-sonnet-5-5",
    );
  });

  it("drops a managed id the gateway no longer lists", () => {
    expect(resolveSelection("openai/gpt-4o", grouped, true)).toBeNull();
    expect(
      resolveSelection("anthropic/claude-opus-4-6", grouped, true),
    ).toBeNull();
  });

  it("drops the legacy auto selection", () => {
    expect(resolveSelection("auto", grouped, true)).toBeNull();
  });

  it("keeps a managed id while the gateway list is still loading", () => {
    expect(resolveSelection("openai/gpt-4o", grouped, false)).toBe(
      "openai/gpt-4o",
    );
  });

  it("drops a BYOK id for a provider that is not configured", () => {
    const anthropicOnly = getAvailableModels(["anthropic"], undefined);
    expect(resolveSelection("gpt-4o", anthropicOnly, false)).toBeNull();
  });

  it("is null when nothing was selected", () => {
    expect(resolveSelection(null, grouped, true)).toBeNull();
  });
});

describe("getModelName", () => {
  it("names managed models from the gateway and falls back to the id", () => {
    const grouped = getAvailableModels(["omni_credits"], managed);
    expect(getModelName("anthropic/claude-sonnet-5-5", grouped)).toBe(
      "Claude Sonnet 5.5",
    );
    expect(getModelName("some/unknown", grouped)).toBe("some/unknown");
  });
});
