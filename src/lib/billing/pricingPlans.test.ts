import { describe, expect, test } from "bun:test";
import type { Price } from "@omnidotdev/providers/billing";
import { FREE_PLAN, pricingPlans, yearlySavingsPercent } from "./pricingPlans";

const price = (
  overrides: Partial<Price> & { name: string; tier?: string },
): Price => ({
  id: `price_${overrides.name}`,
  active: true,
  currency: "usd",
  unit_amount: 500,
  recurring: { interval: "month", interval_count: 1 },
  metadata: { tier: overrides.tier ?? overrides.name.toLowerCase() },
  ...overrides,
  product: {
    id: `prod_${overrides.name}`,
    name: `Beacon ${overrides.name}`,
    description: `${overrides.name} plan`,
    marketing_features: [{ name: `${overrides.name} feature` }],
  },
});

const yearly = { interval: "year", interval_count: 1 } as const;

const catalog = [
  price({ name: "Team", unit_amount: 1500 }),
  price({ name: "Pro", unit_amount: 500 }),
  price({ name: "Pro", unit_amount: 4500, recurring: yearly }),
  price({ name: "Team", unit_amount: 13500, recurring: yearly }),
  price({ name: "Old", active: false }),
];

describe("pricingPlans", () => {
  test("lists Free, then active monthly paid plans cheapest first", () => {
    const plans = pricingPlans(catalog);

    expect(plans.map((p) => p.name)).toEqual(["Free", "Pro", "Team"]);
    expect(plans[1]).toMatchObject({
      tier: "pro",
      amount: 5,
      description: "Pro plan",
      features: ["Pro feature"],
    });
    expect(plans[0]).toBe(FREE_PLAN);
  });

  test("lists yearly prices for the yearly interval", () => {
    expect(pricingPlans(catalog, "year").map((p) => p.amount)).toEqual([
      0, 45, 135,
    ]);
  });

  test("hides the section when billing offers no paid plans", () => {
    expect(pricingPlans([])).toEqual([]);
    expect(pricingPlans([price({ name: "Free", unit_amount: 0 })])).toEqual([]);
  });
});

describe("yearlySavingsPercent", () => {
  test("compares yearly against twelve monthly payments", () => {
    expect(yearlySavingsPercent(catalog)).toBe(25);
  });

  test("is null when no tier is sold on both intervals", () => {
    expect(yearlySavingsPercent([price({ name: "Pro" })])).toBeNull();
  });
});
