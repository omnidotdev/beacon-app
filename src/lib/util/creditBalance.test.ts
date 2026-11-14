import { describe, expect, it } from "bun:test";
import getCreditBalanceDisplay from "./creditBalance";

describe("getCreditBalanceDisplay", () => {
  it("converts a retail USD balance string into whole credits", () => {
    expect(getCreditBalanceDisplay("12.3400", "en-US")).toEqual({
      credits: 1234,
      formatted: "1,234",
      isOutOfCredits: false,
    });
  });

  it("accepts a numeric balance", () => {
    expect(getCreditBalanceDisplay(0.5, "en-US")?.credits).toBe(50);
  });

  it("rounds a partial credit down so the balance is never overstated", () => {
    expect(getCreditBalanceDisplay("0.0150", "en-US")?.credits).toBe(1);
  });

  it("flags an empty balance as out of credits", () => {
    expect(getCreditBalanceDisplay("0.0000", "en-US")).toEqual({
      credits: 0,
      formatted: "0",
      isOutOfCredits: true,
    });
  });

  it("flags a sub-credit balance as out of credits", () => {
    expect(getCreditBalanceDisplay("0.0040", "en-US")?.isOutOfCredits).toBe(
      true,
    );
  });

  it("flags an overdrawn balance as out of credits", () => {
    expect(getCreditBalanceDisplay("-0.0150", "en-US")).toEqual({
      credits: -2,
      formatted: "-2",
      isOutOfCredits: true,
    });
  });

  it("returns null for a malformed balance instead of a plausible number", () => {
    expect(getCreditBalanceDisplay("not-a-number")).toBeNull();
    expect(getCreditBalanceDisplay(Number.NaN)).toBeNull();
    expect(getCreditBalanceDisplay(undefined)).toBeNull();
  });
});
