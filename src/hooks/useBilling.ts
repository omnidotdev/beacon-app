import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { isCloudDeployment } from "@/lib/api";
import billingProvider, { BILLING_APP_ID } from "@/lib/billing";
import type { BeaconPlan } from "@/lib/billing/plan";
import { gatewayFetch } from "@/lib/gateway";

const STALE_TIME_MS = 300_000; // 5 minutes
const PLAN_STALE_TIME_MS = 60_000; // 1 minute

/**
 * Fetch the plan and credit balance of the workspace Beacon bills (the user's
 * personal workspace). Read from beacon-gateway, which resolves the workspace
 * and reads Aether with its service key, so the app shows exactly what the
 * gateway enforces. Only enabled on cloud deployments
 */
export function usePlan() {
  const { session } = useRouteContext({ from: "__root__" });
  const token = session?.accessToken ?? "";

  return useQuery({
    queryKey: ["plan", session?.user?.identityProviderId],
    queryFn: () =>
      gatewayFetch<BeaconPlan>("/api/billing/plan", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }),
    enabled: isCloudDeployment() && !!token,
    staleTime: PLAN_STALE_TIME_MS,
    retry: false,
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
