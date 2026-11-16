import type { Price } from "@omnidotdev/providers/billing";
import { createServerFn } from "@tanstack/react-start";
import billingProvider, { BILLING_APP_ID } from "@/lib/billing";

/**
 * Beacon's plan prices from Aether, sorted by unit amount (ascending). Read on
 * the server: the billing service does not allow Beacon's origin for browser
 * requests, so a client-side read always failed and hid the Upgrade action
 */
export const getPrices = createServerFn({ method: "POST" }).handler(
  async (): Promise<Price[]> => {
    if (!billingProvider) return [];

    const prices = await billingProvider.getPrices(BILLING_APP_ID);

    return prices.sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));
  },
);
