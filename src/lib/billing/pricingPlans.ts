import type { Price } from "@omnidotdev/providers/billing";

/** A billing interval the public pricing section offers */
export type PricingInterval = "month" | "year";

/** A plan card on the public pricing section */
interface PricingPlan {
  id: string;
  /** Catalog tier ("free", "pro", "team"), the hub's plan id */
  tier: string;
  name: string;
  description: string;
  /** Price in dollars per interval */
  amount: number;
  features: string[];
}

/** Free tier, which has no Stripe price. Mirrors the omni-api catalog (omni-api wins) */
export const FREE_PLAN: PricingPlan = {
  id: "free",
  tier: "free",
  name: "Free",
  description: "Try the AI assistant",
  amount: 0,
  features: ["AI with Omni credits or your own key", "Up to 5 conversations"],
};

/** Active paid prices billed on `interval`, cheapest first */
const paidPrices = (prices: readonly Price[], interval: PricingInterval) =>
  prices
    .filter(
      (price) =>
        price.active &&
        price.recurring?.interval === interval &&
        (price.unit_amount ?? 0) > 0,
    )
    .sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));

/**
 * Plans to show publicly for one billing interval: the free tier, then each
 * active paid price on that interval, cheapest first. Paid features come from
 * billing (synced from the catalog), so the page never drifts from what
 * checkout sells. Empty when billing offers no paid plans, so the section can
 * hide rather than show only Free
 */
export const pricingPlans = (
  prices: readonly Price[],
  interval: PricingInterval = "month",
): PricingPlan[] => {
  const paid = paidPrices(prices, interval);

  if (!paid.length) return [];

  return [
    FREE_PLAN,
    ...paid.map((price) => ({
      id: price.id,
      tier: price.metadata.tier ?? price.product.name.toLowerCase(),
      name: price.product.name.replace(/^Beacon\s+/, ""),
      description: price.product.description ?? "",
      amount: (price.unit_amount ?? 0) / 100,
      features: price.product.marketing_features.map((f) => f.name),
    })),
  ];
};

/**
 * Whole-percent saving of yearly over twelve monthly payments, from the
 * cheapest tier sold on both intervals. Null when no tier has both, so the
 * toggle never advertises a saving billing does not give
 */
export const yearlySavingsPercent = (
  prices: readonly Price[],
): number | null => {
  const yearly = paidPrices(prices, "year");

  for (const monthly of paidPrices(prices, "month")) {
    const tier = monthly.metadata.tier;
    const match = yearly.find((price) => price.metadata.tier === tier);
    const perMonth = monthly.unit_amount ?? 0;
    const perYear = match?.unit_amount ?? 0;

    if (!tier || !match || !perMonth) continue;

    const saving = Math.round((1 - perYear / (perMonth * 12)) * 100);

    return saving > 0 ? saving : null;
  }

  return null;
};
