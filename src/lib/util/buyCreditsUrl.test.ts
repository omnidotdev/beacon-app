import { describe, expect, test } from "bun:test";
import buyCreditsUrl from "./buyCreditsUrl";

describe("buyCreditsUrl", () => {
  test("opens Buy credits on the account hub for Beacon", () => {
    expect(buyCreditsUrl("https://account.omni.dev/")).toBe(
      "https://account.omni.dev/billing?product=beacon",
    );
  });

  test("buys for the personal workspace Beacon bills", () => {
    expect(buyCreditsUrl("https://account.omni.dev", "Claude")).toBe(
      "https://account.omni.dev/billing?product=beacon&workspace=claude",
    );
  });

  test("is empty without an account hub, so the link is hidden", () => {
    expect(buyCreditsUrl(undefined)).toBe("");
    expect(buyCreditsUrl("", "claude")).toBe("");
  });
});
