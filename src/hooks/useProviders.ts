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

const MY_PROVIDER_KEYS_QUERY = `
  query MyProviderKeys {
    myProviderKeys {
      id
      provider
      keyHint
      modelPreference
      createdAt
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

type SynapseProviderKey = {
  id: string;
  provider: string;
  keyHint: string | null;
  modelPreference: string | null;
  createdAt: string;
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
function buildProvidersResponse(keys: SynapseProviderKey[]): ProvidersResponse {
  const configuredProviders = new Set(keys.map((k) => k.provider));

  // Determine the active provider: first configured non-omni_credits key,
  // or omni_credits if it is the only configured provider
  const byokKeys = keys.filter((k) => k.provider !== "omni_credits");
  let activeProvider: ProviderType | null = null;

  if (byokKeys.length > 0) {
    activeProvider = byokKeys[0].provider as ProviderType;
  } else if (configuredProviders.has("omni_credits")) {
    activeProvider = "omni_credits";
  }

  const providers = PROVIDER_METADATA.map((meta) => ({
    ...meta,
    status: configuredProviders.has(meta.id)
      ? ("configured" as const)
      : ("not_configured" as const),
    active: activeProvider === meta.id,
  }));

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
      }>(MY_PROVIDER_KEYS_QUERY, {}, token);
      // Cache raw keys for useRemoveProvider to avoid a redundant fetch
      queryClient.setQueryData(["providerKeys"], data.myProviderKeys);
      return buildProvidersResponse(data.myProviderKeys);
    },
    enabled: !!token && !!SYNAPSE_API_URL,
    retry: 1,
  });

  return {
    ...query,
    data: query.data ?? (query.isError ? DEFAULT_PROVIDERS : undefined),
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
