import type { HubPlanInterval } from "@omnidotdev/providers/react";
import {
  accountUrl,
  hubManageUrl,
  hubPlanUrl,
} from "@omnidotdev/providers/react";

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
 * Buy a Beacon plan on the account hub for the user's personal workspace, the
 * workspace Beacon bills. Without one (a session with no personal workspace)
 * the hub asks, listing only workspaces the user owns or administers
 * @param accountBaseUrl - Account hub base URL
 * @param baseUrl - Beacon's base URL, for the return
 */
export const upgradePlanUrl = (
  accountBaseUrl: string | undefined,
  baseUrl: string | undefined,
  {
    plan,
    interval,
    workspace,
  }: { plan: string; interval: HubPlanInterval; workspace?: string },
): string =>
  hubPlanUrl(accountBaseUrl, {
    product: PRODUCT,
    plan,
    interval,
    workspace,
    returnUrl: settingsUrl(baseUrl),
  });

/**
 * Manage a Beacon plan (change or cancel it, payment method, invoices) on the
 * account hub, for the personal workspace Beacon bills. Without one this falls
 * back to the hub's subscriptions tab
 * @param accountBaseUrl - Account hub base URL
 * @param baseUrl - Beacon's base URL, for the return
 * @param workspace - Personal workspace slug
 */
export const manageSubscriptionUrl = (
  accountBaseUrl: string | undefined,
  baseUrl: string | undefined,
  workspace?: string,
): string => {
  if (workspace) {
    return hubManageUrl(accountBaseUrl, {
      product: PRODUCT,
      workspace,
      returnUrl: settingsUrl(baseUrl),
    });
  }

  const base = accountUrl(accountBaseUrl);

  return base ? `${base}/billing?tab=subscriptions` : "";
};
