import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InstallPersonaParams, SearchPersonasParams } from "@/lib/api";
import { useApi } from "./useApi";

export function useMarketplacePersonas() {
  const api = useApi();

  return useQuery({
    queryKey: ["personas", "marketplace", "installed"],
    queryFn: () => api.listInstalledPersonas(),
  });
}

export function useSearchMarketplacePersonas(
  params: SearchPersonasParams = {},
) {
  const api = useApi();

  return useQuery({
    queryKey: ["personas", "marketplace", "search", params],
    queryFn: () => api.searchMarketplacePersonas(params),
    enabled: true,
  });
}

export function useInstallMarketplacePersona() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: InstallPersonaParams) => api.installPersona(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["personas", "marketplace", "installed"],
      });
      // Also refresh the local personas list
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });
}

export function useUninstallMarketplacePersona() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personaId: string) => api.uninstallPersona(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["personas", "marketplace", "installed"],
      });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });
}
