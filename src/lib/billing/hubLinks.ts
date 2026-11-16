import type { HubPlanInterval } from "@omnidotdev/providers/react";
import { accountUrl, hubPlanUrl } from "@omnidotdev/providers/react";

/**
 * Plans are bought and managed on the Omni account hub, the one place every
 * product sells plans and credits. Beacon shows its own plan status, but its
 * Upgrade and Manage subscription actions link to the hub, which confirms the
 * plan (names and prices from Aether), runs checkout or the billing portal, and
 * returns here. Each helper is empty when no account hub is configured, so the
 * action is hidden rather than dead
 */

const PRODUCT = "beacon";

/**
 * Beacon's settings page, where the hub returns after a plan action. Falls
 * back to the browser's origin when the build has no base URL, so the return
 * stays absolute
 * @param baseUrl - Beacon's base URL
 */
export const settingsUrl = (
  baseUrl: string | undefined,
): string | undefined => {
  const base =
    baseUrl ||
    (typeof window === "undefined" ? undefined : window.location.origin);

  return base ? `${base.replace(/\/+$/, "")}/settings` : undefined;
};

/** Narrow a Stripe recurring interval to one the hub sells */
export const hubInterval = (
  interval: string | undefined,
): HubPlanInterval | undefined =>
  interval === "month" || interval === "year" ? interval : undefined;

/**
 * Buy a Beacon plan on the account hub. Beacon has no workspace of its own, so
 * the hub asks, listing only workspaces the user owns or administers
 * @param accountBaseUrl - Account hub base URL
 * @param baseUrl - Beacon's base URL, for the return
 */
export const upgradePlanUrl = (
  accountBaseUrl: string | undefined,
  baseUrl: string | undefined,
  { plan, interval }: { plan: string; interval: HubPlanInterval },
): string =>
  hubPlanUrl(accountBaseUrl, {
    product: PRODUCT,
    plan,
    interval,
    returnUrl: settingsUrl(baseUrl),
  });

/**
 * Manage a Beacon plan (change or cancel it, payment method, invoices) on the
 * account hub. Beacon bills the user rather than a workspace, so this opens the
 * hub's subscriptions tab, which lists the personal account and its billing
 * portal, instead of a workspace's plan management
 * @param accountBaseUrl - Account hub base URL
 */
export const manageSubscriptionUrl = (
  accountBaseUrl: string | undefined,
): string => {
  const base = accountUrl(accountBaseUrl);

  return base ? `${base}/billing?tab=subscriptions` : "";
};
