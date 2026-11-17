import type { ManagedModelsResponse, ProviderType } from "@/lib/api";

interface ModelOption {
  id: string;
  name: string;
  provider: ProviderType;
}

/**
 * Curated models for the user's own provider keys (BYOK). Managed (Omni
 * credits) models are not listed here: the Synapse gateway serves Beacon's
 * managed model list, its order, and the default
 */
const BYOK_MODELS: ModelOption[] = [
  // Anthropic (BYOK)
  { id: "claude-opus-5-5", name: "Opus 5.5", provider: "anthropic" },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", provider: "anthropic" },
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

type GroupedModels = Record<string, ModelOption[]>;

/** Get display name for a provider ID */
function getProviderDisplayName(providerId: string): string {
  return PROVIDER_DISPLAY_NAMES[providerId] ?? providerId;
}

/**
 * Group the models the user can pick by provider: managed models from the
 * gateway's list (when AI credits are configured and the list has loaded),
 * then BYOK models for each configured provider
 */
function getAvailableModels(
  configuredProviderIds: string[],
  managed: ManagedModelsResponse | undefined,
): GroupedModels {
  const grouped: GroupedModels = {};

  if (
    configuredProviderIds.includes("omni_credits") &&
    managed?.models.length
  ) {
    grouped.omni_credits = managed.models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: "omni_credits" as const,
    }));
  }

  for (const model of BYOK_MODELS) {
    if (!configuredProviderIds.includes(model.provider)) continue;
    grouped[model.provider] ??= [];
    grouped[model.provider]?.push(model);
  }

  return grouped;
}

/** Every model id the user can currently pick */
const offeredIds = (grouped: GroupedModels): Set<string> =>
  new Set(
    Object.values(grouped)
      .flat()
      .map((m) => m.id),
  );

/**
 * The model turns run on when nothing is picked: the gateway's default for
 * the user's plan, else the first available model
 */
function getDefaultModelId(
  grouped: GroupedModels,
  managed: ManagedModelsResponse | undefined,
): string | null {
  const managedDefault = managed?.default_model;
  if (managedDefault && offeredIds(grouped).has(managedDefault)) {
    return managedDefault;
  }

  return Object.values(grouped)[0]?.[0]?.id ?? null;
}

/**
 * Keep a stored selection only while it is still offered, so a model the
 * gateway stopped listing (which it would refuse) is never sent. A managed
 * (provider-prefixed) id is kept while the gateway list is still loading
 */
function resolveSelection(
  stored: string | null,
  grouped: GroupedModels,
  managedLoaded: boolean,
): string | null {
  if (!stored) return null;
  if (offeredIds(grouped).has(stored)) return stored;
  if (!managedLoaded && stored.includes("/")) return stored;

  return null;
}

/** Get display name for a model ID, falls back to raw ID */
function getModelName(modelId: string, grouped: GroupedModels): string {
  return (
    Object.values(grouped)
      .flat()
      .find((m) => m.id === modelId)?.name ?? modelId
  );
}

export type { ModelOption };
export {
  getAvailableModels,
  getDefaultModelId,
  getModelName,
  getProviderDisplayName,
  resolveSelection,
};
