import type { Price } from "@omnidotdev/providers/billing";

/** A plan card on the public pricing section */
interface PricingPlan {
  id: string;
  name: string;
  description: string;
  /** Monthly price in dollars */
  amount: number;
  features: string[];
}

/** Free tier, which has no Stripe price. Mirrors the omni-api catalog (omni-api wins) */
export const FREE_PLAN: PricingPlan = {
  id: "free",
  name: "Free",
  description: "Try the AI assistant",
  amount: 0,
  features: ["AI with Omni credits or your own key", "Up to 5 conversations"],
};

/**
 * Plans to show publicly: the free tier, then each active monthly paid price,
 * cheapest first. Paid features come from billing (synced from the catalog),
 * so the page never drifts from what checkout sells. Empty when billing
 * offers no paid plans, so the section can hide rather than show only Free
 */
export const pricingPlans = (prices: readonly Price[]): PricingPlan[] => {
  const paid = prices
    .filter(
      (price) =>
        price.active &&
        price.recurring?.interval === "month" &&
        (price.unit_amount ?? 0) > 0,
    )
    .sort((a, b) => (a.unit_amount ?? 0) - (b.unit_amount ?? 0));

  if (!paid.length) return [];

  return [
    FREE_PLAN,
    ...paid.map((price) => ({
      id: price.id,
      name: price.product.name.replace(/^Beacon\s+/, ""),
      description: price.product.description ?? "",
      amount: (price.unit_amount ?? 0) / 100,
      features: price.product.marketing_features.map((f) => f.name),
    })),
  ];
};
