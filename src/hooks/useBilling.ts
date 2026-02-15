import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { isCloudDeployment } from "@/lib/api";
import billingProvider from "@/lib/billing";

const STALE_TIME_MS = 300_000; // 5 minutes
const ENTITY_TYPE = "user";

/**
 * Fetch subscription details for the current user.
 * Only enabled on cloud deployments with a valid billing provider.
 */
export function useSubscription() {
  const { session } = useRouteContext({ from: "__root__" });

  return useQuery({
    queryKey: ["subscription", session?.user?.id],
    queryFn: () =>
      billingProvider!.getSubscription(
        ENTITY_TYPE,
        session!.user.id,
        session!.accessToken,
      ),
    enabled: isCloudDeployment() && !!billingProvider && !!session?.user?.id,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Open the Stripe billing portal for managing the current subscription
 */
export function useBillingPortal() {
  const { session } = useRouteContext({ from: "__root__" });

  return useMutation({
    mutationFn: ({
      productId,
      returnUrl,
    }: { productId: string; returnUrl: string }) =>
      billingProvider!.getBillingPortalUrl(
        ENTITY_TYPE,
        session!.user.id,
        productId,
        returnUrl,
        session!.accessToken,
      ),
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
  });
}

/**
 * Create a checkout session with workspace creation/selection
 */
export function useCheckout() {
  const { session } = useRouteContext({ from: "__root__" });

  return useMutation({
    mutationFn: ({
      priceId,
      successUrl,
      cancelUrl,
      workspaceId,
      createWorkspace,
    }: {
      priceId: string;
      successUrl: string;
      cancelUrl: string;
      workspaceId?: string;
      createWorkspace?: { name: string; slug?: string };
    }) =>
      billingProvider!.createCheckoutWithWorkspace({
        appId: import.meta.env.VITE_AETHER_APP_ID,
        priceId,
        successUrl,
        cancelUrl,
        accessToken: session!.accessToken,
        workspaceId,
        createWorkspace,
      }),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
  });
}

/**
 * Cancel the current subscription (schedules cancellation at period end)
 */
export function useCancelSubscription() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      billingProvider!.cancelSubscription(
        ENTITY_TYPE,
        session!.user.id,
        session!.accessToken,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

/**
 * Renew a subscription by removing a scheduled cancellation
 */
export function useRenewSubscription() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      billingProvider!.renewSubscription(
        ENTITY_TYPE,
        session!.user.id,
        session!.accessToken,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
