import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { isCloudDeployment } from "@/lib/api";
import billingProvider, { BILLING_APP_ID } from "@/lib/billing";
import type { BeaconPlan } from "@/lib/billing/plan";
import { gatewayFetch } from "@/lib/gateway";
import { getCardOffer } from "@/server/functions/cardOffer";
import { getPrices } from "@/server/functions/prices";

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
 * Prices carry a `metadata.tier` (e.g. "free", "pro", "team") used to target
 * the Upgrade action. Read through a server function (see `getPrices`)
 */
export function usePrices() {
  return useQuery({
    queryKey: ["prices", BILLING_APP_ID],
    queryFn: () => getPrices(),
    enabled: isCloudDeployment() && !!billingProvider,
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Whether Aether offers card-verified free AI credits, so "Add a card" shows
 * only while the offer is live. Read through a server function (see
 * `getCardOffer`); any failure is no offer
 */
export function useCardOffer() {
  return useQuery({
    queryKey: ["cardOffer"],
    queryFn: () => getCardOffer(),
    enabled: isCloudDeployment(),
    staleTime: STALE_TIME_MS,
  });
}
