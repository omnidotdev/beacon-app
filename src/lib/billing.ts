import type { BillingProvider } from "@omnidotdev/providers/billing";
import { createBillingProvider } from "@omnidotdev/providers/billing";

/**
 * Beacon's Aether app id. Subscriptions, entitlements, and prices are Beacon's
 * own, and the gateway bills Beacon's AI usage under the same app, so this is
 * fixed rather than configurable (a stale value would split the two)
 */
export const BILLING_APP_ID = "beacon";

const baseUrl = import.meta.env.VITE_BILLING_URL as string | undefined;

// Only instantiate when the billing service is configured
const billingProvider: BillingProvider | null = baseUrl
  ? createBillingProvider({
      provider: "aether",
      baseUrl,
      appId: BILLING_APP_ID,
    })
  : null;

export default billingProvider;
