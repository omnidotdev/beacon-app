import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { isCloudDeployment } from "@/lib/api";
import billingProvider, { BILLING_APP_ID } from "@/lib/billing";

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
    queryKey: ["subscription", session?.user?.identityProviderId],
    queryFn: () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      return billingProvider.getSubscription(
        ENTITY_TYPE,
        session?.user.identityProviderId ?? "",
        session?.accessToken ?? "",
      );
    },
    enabled:
      isCloudDeployment() &&
      !!billingProvider &&
      !!session?.user?.identityProviderId,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Fetch entitlements for the current user.
 * Distinguishes a comped/manually-granted tier (which has no Stripe subscription)
 * from a genuinely free account. A `not_found` or `unavailable` result resolves to
 * `null` so callers treat both as "no entitlement to show".
 */
export function useEntitlements() {
  const { session } = useRouteContext({ from: "__root__" });

  return useQuery({
    queryKey: ["entitlements", session?.user?.identityProviderId],
    queryFn: async () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      const result = await billingProvider.getEntitlementsResult(
        ENTITY_TYPE,
        session?.user.identityProviderId ?? "",
        undefined,
        session?.accessToken ?? "",
      );

      return result.status === "success" ? result.data : null;
    },
    enabled:
      isCloudDeployment() &&
      !!billingProvider &&
      !!session?.user?.identityProviderId,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Fetch available prices for this app, sorted by unit amount (ascending).
 * Prices carry a `metadata.tier` (e.g. "free", "pro", "team") used to target checkout.
 */
export function usePrices() {
  return useQuery({
    queryKey: ["prices", BILLING_APP_ID],
    queryFn: async () => {
      if (!billingProvider) throw new Error("Billing is not configured");

      const prices = await billingProvider.getPrices(BILLING_APP_ID);

      return prices.sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
    },
    enabled: isCloudDeployment() && !!billingProvider,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Fetch the current user's Omni credit balance: one pool shared across Omni
 * products, in retail USD (convert with `getCreditBalanceDisplay`).
 * Proxied through synapse-api which handles Aether service auth
 */
export function useCreditBalance() {
  const { session } = useRouteContext({ from: "__root__" });

  return useQuery({
    queryKey: ["creditBalance", session?.user?.id],
    queryFn: async () => {
      const res = await fetch(`${SYNAPSE_API_URL}/credits/me/balance`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ""}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch credit balance");

      return res.json() as Promise<{ balance: number | string }>;
    },
    enabled: isCloudDeployment() && !!SYNAPSE_API_URL && !!session?.user?.id,
    staleTime: CREDIT_STALE_TIME_MS,
  });
}
