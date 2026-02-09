import type { QueryKey } from "@tanstack/react-query";
import { MutationCache, matchQuery, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "@/routeTree.gen";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: Array<QueryKey>;
    };
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set a default staleTime above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
    mutationCache: new MutationCache({
      onSettled: (_data, _error, _variables, _context, mutation) => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            // If `all` is included in the pattern, invalidate entire cache
            if (
              mutation.meta?.invalidates?.some((queryKey) =>
                queryKey.includes("all"),
              )
            ) {
              return true;
            }

            // Invalidate all matching tags at once
            // or nothing if no meta is provided
            return (
              mutation.meta?.invalidates?.some((queryKey) =>
                matchQuery({ queryKey }, query),
              ) ?? false
            );
          },
        });
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient, isMaintenanceMode: false },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
};
