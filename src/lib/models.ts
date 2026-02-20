import type { ProviderType } from "@/lib/api";

interface ModelOption {
  id: string;
  name: string;
  provider: ProviderType;
}

/** Curated models per provider */
const MODELS: ModelOption[] = [
  // Omni Synapse — routed through Synapse gateway
  { id: "auto", name: "Auto (Smart Routing)", provider: "omni_credits" },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "omni_credits",
  },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "omni_credits" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "omni_credits" },
  {
    id: "nvidia/moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "omni_credits",
  },
  // Anthropic (BYOK)
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Sonnet 4.5",
    provider: "anthropic",
  },
  { id: "claude-opus-4-6", name: "Opus 4.6", provider: "anthropic" },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Haiku 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Sonnet 4",
    provider: "anthropic",
  },
  // OpenAI (BYOK)
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "o3-mini", name: "o3-mini", provider: "openai" },
];

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  omni_credits: "Omni Synapse",
  anthropic: "Anthropic",
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

/** Get display name for a model ID, falls back to raw ID */
function getModelName(modelId: string): string {
  return MODELS.find((m) => m.id === modelId)?.name ?? modelId;
}

/** Get display name for a provider ID */
function getProviderDisplayName(providerId: string): string {
  return PROVIDER_DISPLAY_NAMES[providerId] ?? providerId;
}

/** Group models by provider, filtering to only configured providers */
function getAvailableModels(
  configuredProviderIds: string[],
): Record<string, ModelOption[]> {
  const available = MODELS.filter((m) =>
    configuredProviderIds.includes(m.provider),
  );

  const grouped: Record<string, ModelOption[]> = {};
  for (const model of available) {
    const key = model.provider;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(model);
  }

  return grouped;
}

export { getAvailableModels, getModelName, getProviderDisplayName, MODELS };
export type { ModelOption };
