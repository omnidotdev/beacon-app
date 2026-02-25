import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { isCloudDeployment } from "@/lib/api";
import billingProvider from "@/lib/billing";

const STALE_TIME_MS = 300_000; // 5 minutes
const CREDIT_STALE_TIME_MS = 60_000; // 1 minute
const ENTITY_TYPE = "user";
const SYNAPSE_API_URL = import.meta.env.VITE_SYNAPSE_API_URL as
  | string
  | undefined;

/**
 * Fetch subscription details for the current user.
 * Only enabled on cloud deployments with a valid billing provider.
 */
export function useSubscription() {
  const { session } = useRouteContext({ from: "__root__" });

  return useQuery({
    queryKey: ["subscription", session?.user?.id],
    queryFn: () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.getSubscription(
        ENTITY_TYPE,
        session!.user.id!,
        session!.accessToken!,
      );
    },
    enabled: isCloudDeployment() && !!billingProvider && !!session?.user?.id,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Fetch credit balance for the current user.
 * Proxied through synapse-api which handles Aether service auth
 */
export function useCreditBalance() {
  const { session } = useRouteContext({ from: "__root__" });

  return useQuery({
    queryKey: ["creditBalance", session?.user?.id],
    queryFn: async () => {
      const res = await fetch(`${SYNAPSE_API_URL}/credits/me/balance`, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch credit balance");

      return res.json() as Promise<{ balance: number }>;
    },
    enabled: isCloudDeployment() && !!SYNAPSE_API_URL && !!session?.user?.id,
    staleTime: CREDIT_STALE_TIME_MS,
  });
}

/**
 * Create a credit purchase checkout session via synapse-api
 */
export function useCreditCheckout() {
  const { session } = useRouteContext({ from: "__root__" });
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      successUrl,
      cancelUrl,
    }: {
      amount: number;
      successUrl: string;
      cancelUrl: string;
    }) => {
      const res = await fetch(`${SYNAPSE_API_URL}/credits/me/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.accessToken}`,
        },
        body: JSON.stringify({ amount, successUrl, cancelUrl }),
      });

      if (!res.ok) throw new Error("Failed to create credit checkout");

      return res.json() as Promise<{ checkoutUrl: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["creditBalance"] });
      window.location.href = data.checkoutUrl;
    },
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
    }: {
      productId: string;
      returnUrl: string;
    }) => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.getBillingPortalUrl(
        ENTITY_TYPE,
        session!.user.id!,
        productId,
        returnUrl,
        session!.accessToken!,
      );
    },
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
    }) => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.createCheckoutWithWorkspace({
        appId: import.meta.env.VITE_AETHER_APP_ID as string,
        priceId,
        successUrl,
        cancelUrl,
        accessToken: session!.accessToken!,
        workspaceId,
        createWorkspace,
      });
    },
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
    mutationFn: () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.cancelSubscription(
        ENTITY_TYPE,
        session!.user.id!,
        session!.accessToken!,
      );
    },
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
    mutationFn: () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.renewSubscription(
        ENTITY_TYPE,
        session!.user.id!,
        session!.accessToken!,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
