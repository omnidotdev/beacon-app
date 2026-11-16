import { describe, expect, test } from "bun:test";

import getCreditBalanceDisplay from "@/lib/util/creditBalance";

import { isPaidTier, planName } from "./plan";

describe("planName", () => {
  test("names the workspace's tier", () => {
    expect(planName("pro")).toBe("Pro");
    expect(planName("TEAM")).toBe("Team");
    expect(planName('"pro"')).toBe("Pro");
  });

  test("is Free when the tier is unknown", () => {
    expect(planName(null)).toBe("Free");
    expect(planName(undefined)).toBe("Free");
    expect(planName("")).toBe("Free");
  });
});

describe("isPaidTier", () => {
  test("is true only for a paid tier", () => {
    expect(isPaidTier("pro")).toBe(true);
    expect(isPaidTier('"team"')).toBe(true);
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier('"free"')).toBe(false);
    expect(isPaidTier(null)).toBe(false);
  });
});

describe("plan credit balance", () => {
  test("reads the balance as a JSON number or a numeric string", () => {
    // Aether stores the balance as numeric(12,4) in retail USD, so it may
    // arrive as either shape
    expect(getCreditBalanceDisplay(3)?.credits).toBe(300);
    expect(getCreditBalanceDisplay("3.0000")?.credits).toBe(300);
    expect(getCreditBalanceDisplay(0)?.isOutOfCredits).toBe(true);
    expect(getCreditBalanceDisplay(null)).toBeNull();
  });
});
