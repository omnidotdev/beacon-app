import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConfigureProviderParams,
  ProvidersResponse,
  ProviderType,
} from "@/lib/api";
import { useApi } from "./useApi";

// Fallback providers when gateway is unreachable
const DEFAULT_PROVIDERS: ProvidersResponse = {
  providers: [
    {
      id: "omni_credits",
      name: "Omni Credits",
      description: "Omni's AI router with smart model selection",
      status: "not_configured",
      active: false,
      api_key_url: null,
      coming_soon: false,
      features: ["smart routing", "cost optimization", "tool discovery"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude models with advanced reasoning",
      status: "not_configured",
      active: false,
      api_key_url: "https://console.anthropic.com/settings/keys",
      coming_soon: false,
      features: ["chat", "vision", "tools"],
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT models with broad capabilities",
      status: "not_configured",
      active: false,
      api_key_url: "https://platform.openai.com/api-keys",
      coming_soon: false,
      features: ["chat", "vision", "tools", "tts"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Access multiple AI models through one API",
      status: "not_configured",
      active: false,
      api_key_url: "https://openrouter.ai/keys",
      coming_soon: false,
      features: ["chat", "vision", "tools"],
    },
  ],
  active_provider: null,
};

export function useProviders() {
  const api = useApi();

  const query = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.getProviders(),
    retry: 1,
  });

  return {
    ...query,
    data: query.data ?? (query.isError ? DEFAULT_PROVIDERS : undefined),
  };
}

export function useConfigureProvider() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ConfigureProviderParams) =>
      api.configureProvider(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useRemoveProvider() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: ProviderType) => api.removeProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}
