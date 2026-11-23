import { describe, expect, test } from "bun:test";
import type { Price } from "@omnidotdev/providers/billing";
import { FREE_PLAN, pricingPlans } from "./pricingPlans";

const price = (overrides: Partial<Price> & { name: string }): Price => ({
  id: `price_${overrides.name}`,
  active: true,
  currency: "usd",
  unit_amount: 500,
  recurring: { interval: "month", interval_count: 1 },
  metadata: {},
  ...overrides,
  product: {
    id: `prod_${overrides.name}`,
    name: `Beacon ${overrides.name}`,
    description: `${overrides.name} plan`,
    marketing_features: [{ name: `${overrides.name} feature` }],
  },
});

describe("pricingPlans", () => {
  test("lists Free, then active monthly paid plans cheapest first", () => {
    const plans = pricingPlans([
      price({ name: "Team", unit_amount: 1500 }),
      price({ name: "Pro", unit_amount: 500 }),
      price({
        name: "ProYearly",
        unit_amount: 4500,
        recurring: { interval: "year", interval_count: 1 },
      }),
      price({ name: "Old", active: false }),
    ]);

    expect(plans.map((p) => p.name)).toEqual(["Free", "Pro", "Team"]);
    expect(plans[1]).toMatchObject({
      amount: 5,
      description: "Pro plan",
      features: ["Pro feature"],
    });
    expect(plans[0]).toBe(FREE_PLAN);
  });

  test("hides the section when billing offers no paid plans", () => {
    expect(pricingPlans([])).toEqual([]);
    expect(pricingPlans([price({ name: "Free", unit_amount: 0 })])).toEqual([]);
  });
});
