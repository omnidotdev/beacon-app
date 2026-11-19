import buyCreditsUrl from "@/lib/util/buyCreditsUrl";

/**
 * The card-verified free AI credits offer. Saving a card on the account hub
 * (never charged) unlocks a small monthly AI credit allowance in the personal
 * workspace, the one Beacon bills. Aether reports whether the offer is
 * switched on, so Beacon offers it only while it is live
 */

/** Whether the offer is live and its monthly credits */
export interface CardOffer {
  enabled: boolean;
  monthlyCredits: number;
}

/** No offer: switched off, unknown, or unreadable */
export const NO_CARD_OFFER: CardOffer = Object.freeze({
  enabled: false,
  monthlyCredits: 0,
});

/** Read Aether's offer strictly; anything off-contract is no offer */
export const parseCardOffer = (body: unknown): CardOffer => {
  if (typeof body !== "object" || body === null) return NO_CARD_OFFER;
  const { enabled, monthlyCredits } = body as Record<string, unknown>;
  if (
    enabled !== true ||
    typeof monthlyCredits !== "number" ||
    !Number.isFinite(monthlyCredits) ||
    monthlyCredits <= 0
  ) {
    return NO_CARD_OFFER;
  }
  return { enabled, monthlyCredits };
};

/** The card offer call to action */
export const addCardLabel = (monthlyCredits: number): string =>
  `Add a card to unlock ${monthlyCredits} free AI credits a month`;

/**
 * The "Add a card" link where credits are short, or null when it does not
 * apply: the offer is off or no account hub is configured. It opens the
 * account hub's AI tab for the personal workspace, where the card is saved
 * @param accountBaseUrl - Account hub base URL
 * @param offer - The offer Aether reports
 * @param workspace - Personal workspace slug, when known
 */
export const cardOfferLink = (
  accountBaseUrl: string | undefined,
  offer: CardOffer | undefined,
  workspace?: string,
): { href: string; label: string } | null => {
  if (!offer?.enabled) return null;

  const href = buyCreditsUrl(accountBaseUrl, workspace);
  if (!href) return null;

  return { href, label: addCardLabel(offer.monthlyCredits) };
};
