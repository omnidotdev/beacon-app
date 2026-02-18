// Hooks for memory management
//
// Wraps beacon-api GraphQL calls with React Query
// for caching, invalidation, and optimistic updates

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { isCloudDeployment } from "@/lib/api";
import {
  deleteMemory,
  fetchMemories,
  type Memory,
  updateMemory,
} from "@/lib/api/memories";

export function useMemories(category?: string) {
  const { session } = useRouteContext({ from: "__root__" });
  const token = session?.accessToken ?? "";

  return useQuery({
    queryKey: ["memories", category ?? "all"],
    queryFn: () => fetchMemories(token, category),
    enabled: isCloudDeployment() && !!token,
  });
}

export function useDeleteMemory() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  return useMutation({
    mutationFn: (gatewayMemoryId: string) =>
      deleteMemory(token, gatewayMemoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}

export function useUpdateMemory() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();
  const token = session?.accessToken ?? "";

  return useMutation({
    mutationFn: ({
      gatewayMemoryId,
      pinned,
    }: {
      gatewayMemoryId: string;
      pinned: boolean;
    }) => updateMemory(token, gatewayMemoryId, pinned),
    onMutate: async ({ gatewayMemoryId, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });

      // Optimistically update all memory query caches
      const previousQueries = queryClient.getQueriesData<Memory[]>({
        queryKey: ["memories"],
      });

      queryClient.setQueriesData<Memory[]>(
        { queryKey: ["memories"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.gatewayMemoryId === gatewayMemoryId ? { ...m, pinned } : m,
          );
        },
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      // Roll back optimistic update
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}
