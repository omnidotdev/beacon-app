import { createServerFn } from "@tanstack/react-start";

import { BILLING_BASE_URL } from "@/lib/billing";
import type { CardOffer } from "@/lib/billing/cardOffer";
import { NO_CARD_OFFER, parseCardOffer } from "@/lib/billing/cardOffer";

/**
 * Whether Aether offers card-verified free AI credits. Read on the server
 * (the billing service does not allow Beacon's origin for browser requests);
 * any failure is no offer, so Beacon never advertises an offer that is off
 */
export const getCardOffer = createServerFn({ method: "POST" }).handler(
  async (): Promise<CardOffer> => {
    if (!BILLING_BASE_URL) return NO_CARD_OFFER;

    try {
      const response = await fetch(
        `${BILLING_BASE_URL.replace(/\/+$/, "")}/card-verification/offer`,
        { signal: AbortSignal.timeout(5_000) },
      );
      if (!response.ok) return NO_CARD_OFFER;
      return parseCardOffer(await response.json());
    } catch {
      return NO_CARD_OFFER;
    }
  },
);
