// TODO: once Lattice (lattice-stack/services/lattice-gateway) is production-ready, route these calls through Lattice instead of hitting Synapse directly
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import type {
  ConfigureProviderParams,
  ConfigureProviderResponse,
  ProvidersResponse,
  ProviderType,
} from "@/lib/api";
import { SYNAPSE_API_URL } from "@/lib/config/env.config";

// Synapse GraphQL endpoint
const SYNAPSE_GRAPHQL_URL = `${SYNAPSE_API_URL ?? ""}/graphql`;

// GraphQL operations for provider key management

const PROVIDERS_QUERY = `
  query ProvidersAndPreferences {
    myProviderKeys {
      id
      provider
      keyHint
    }
    myPreferences {
      defaultProvider
    }
  }
`;

const SET_PROVIDER_KEY_MUTATION = `
  mutation SetProviderKey($input: SetProviderKeyInput!) {
    setProviderKey(input: $input) {
      id
      provider
      keyHint
      modelPreference
    }
  }
`;

const REMOVE_PROVIDER_KEY_MUTATION = `
  mutation RemoveProviderKey($id: UUID!) {
    removeProviderKey(id: $id)
  }
`;

const SET_ACTIVE_PROVIDER_MUTATION = `
  mutation SetActiveProvider($provider: String!) {
    updateUserPreferences(input: { defaultProvider: $provider }) {
      defaultProvider
    }
  }
`;

type SynapseProviderKey = {
  id: string;
  provider: string;
  keyHint: string | null;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function synapseGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const response = await fetch(SYNAPSE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Synapse request failed (${response.status})`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error("No data returned from Synapse");
  }

  return result.data;
}

// Static provider metadata — status is derived from Synapse key records
const PROVIDER_METADATA: Omit<
  ProvidersResponse["providers"][number],
  "status" | "active"
>[] = [
  {
    id: "omni_credits",
    name: "Omni Credits",
    description: "Omni's AI router with smart model selection",
    api_key_url: null,
    coming_soon: false,
    features: ["smart routing", "cost optimization", "tool discovery"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models with advanced reasoning",
    api_key_url: "https://console.anthropic.com/settings/keys",
    coming_soon: false,
    features: ["chat", "vision", "tools"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models with broad capabilities",
    api_key_url: "https://platform.openai.com/api-keys",
    coming_soon: false,
    features: ["chat", "vision", "tools", "tts"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access multiple AI models through one API",
    api_key_url: "https://openrouter.ai/keys",
    coming_soon: false,
    features: ["chat", "vision", "tools"],
  },
];

// Fallback when Synapse is unreachable
const DEFAULT_PROVIDERS: ProvidersResponse = {
  providers: PROVIDER_METADATA.map((p) => ({
    ...p,
    status: "not_configured",
    active: false,
  })),
  active_provider: null,
};

/**
 * Build a ProvidersResponse from Synapse provider keys merged with static metadata
 */
function buildProvidersResponse(
  keys: SynapseProviderKey[],
  defaultProvider: string | null,
): ProvidersResponse {
  const configuredProviders = new Set(keys.map((k) => k.provider));
  const knownProviderIds = new Set(PROVIDER_METADATA.map((m) => m.id));

  const toProviderType = (p: string): ProviderType | null =>
    knownProviderIds.has(p as ProviderType) ? (p as ProviderType) : null;

  // Determine active provider: explicit preference first, then first configured key
  let activeProvider: ProviderType | null = null;
  if (defaultProvider && configuredProviders.has(defaultProvider)) {
    activeProvider = toProviderType(defaultProvider);
  }
  if (!activeProvider) {
    const byokKeys = keys.filter((k) => k.provider !== "omni_credits");
    if (byokKeys.length > 0) {
      activeProvider = toProviderType(byokKeys[0].provider);
    } else if (configuredProviders.has("omni_credits")) {
      activeProvider = "omni_credits";
    }
  }

  const providers = PROVIDER_METADATA.map((meta) => {
    const key = keys.find((k) => k.provider === meta.id);
    return {
      ...meta,
      status: configuredProviders.has(meta.id)
        ? ("configured" as const)
        : ("not_configured" as const),
      active: activeProvider === meta.id,
      keyHint: key?.keyHint ?? null,
    };
  });

  return { providers, active_provider: activeProvider };
}

export function useProviders() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  const query = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const data = await synapseGraphql<{
        myProviderKeys: SynapseProviderKey[];
        myPreferences: { defaultProvider: string | null } | null;
      }>(PROVIDERS_QUERY, {}, token);
      // Cache raw keys for useRemoveProvider to avoid a redundant fetch
      queryClient.setQueryData(["providerKeys"], data.myProviderKeys);
      return buildProvidersResponse(
        data.myProviderKeys,
        data.myPreferences?.defaultProvider ?? null,
      );
    },
    enabled: !!token && !!SYNAPSE_API_URL,
    retry: 1,
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_PROVIDERS,
  };
}

export function useConfigureProvider() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  return useMutation({
    mutationFn: async (
      params: ConfigureProviderParams,
    ): Promise<ConfigureProviderResponse> => {
      await synapseGraphql<{
        setProviderKey: SynapseProviderKey;
      }>(
        SET_PROVIDER_KEY_MUTATION,
        {
          input: {
            provider: params.provider,
            key: params.api_key ?? "",
            modelPreference: params.model ?? null,
          },
        },
        token,
      );

      const meta = PROVIDER_METADATA.find((p) => p.id === params.provider);

      return {
        success: true,
        message: "Provider key saved",
        provider: {
          ...(meta ?? {
            id: params.provider,
            name: params.provider,
            description: "",
            api_key_url: null,
            coming_soon: false,
            features: [],
          }),
          status: "configured",
          active: false,
          // Satisfy the ProviderInfo id type narrowing
          id: params.provider,
          // biome-ignore lint/suspicious/noExplicitAny: runtime cast is safe here
        } as any,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useRemoveProvider() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  return useMutation({
    mutationFn: async (provider: ProviderType) => {
      // Use cached keys to resolve UUID — avoids extra network round-trip
      const cachedKeys =
        queryClient.getQueryData<SynapseProviderKey[]>(["providerKeys"]) ?? [];
      const match = cachedKeys.find((k) => k.provider === provider);
      const keyId = match?.id ?? null;

      if (!keyId) {
        throw new Error(`No key found for provider: ${provider}`);
      }

      await synapseGraphql<{ removeProviderKey: boolean }>(
        REMOVE_PROVIDER_KEY_MUTATION,
        { id: keyId },
        token,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useSetActiveProvider() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  return useMutation({
    mutationFn: async (provider: ProviderType) => {
      await synapseGraphql<{
        updateUserPreferences: { defaultProvider: string | null };
      }>(SET_ACTIVE_PROVIDER_MUTATION, { provider }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}
