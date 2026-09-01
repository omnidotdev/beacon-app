import { describe, expect, it } from "bun:test";
import type { EntitlementsResponse } from "@omnidotdev/providers/billing";
import getTierFromEntitlements from "./getTierFromEntitlements";

const makeResponse = (
  entitlements: EntitlementsResponse["entitlements"],
): EntitlementsResponse => ({
  billingAccountId: "acct_1",
  entityType: "user",
  entityId: "user_1",
  entitlementVersion: 1,
  entitlements,
});

const makeEntitlement = (
  featureKey: string,
  value: string | null,
): EntitlementsResponse["entitlements"][number] => ({
  id: "ent_1",
  productId: "prod_1",
  featureKey,
  value,
  source: "manual",
  validFrom: "2026-01-01T00:00:00.000Z",
  validUntil: null,
});

describe("getTierFromEntitlements", () => {
  it("returns the capitalized tier, stripping JSONB quoting", () => {
    const response = makeResponse([makeEntitlement("tier", '"pro"')]);
    expect(getTierFromEntitlements(response)).toBe("Pro");
  });

  it("handles an unquoted tier value", () => {
    const response = makeResponse([makeEntitlement("tier", "team")]);
    expect(getTierFromEntitlements(response)).toBe("Team");
  });

  it("finds the tier among other entitlements", () => {
    const response = makeResponse([
      makeEntitlement("max_requests_per_month", "1000"),
      makeEntitlement("tier", '"free"'),
    ]);
    expect(getTierFromEntitlements(response)).toBe("Free");
  });

  it("returns null when no tier entitlement is present", () => {
    const response = makeResponse([
      makeEntitlement("max_requests_per_month", "1000"),
    ]);
    expect(getTierFromEntitlements(response)).toBeNull();
  });

  it("returns null when the tier value is null", () => {
    const response = makeResponse([makeEntitlement("tier", null)]);
    expect(getTierFromEntitlements(response)).toBeNull();
  });

  it("returns null for a missing entitlements response", () => {
    expect(getTierFromEntitlements(null)).toBeNull();
    expect(getTierFromEntitlements(undefined)).toBeNull();
  });
});
