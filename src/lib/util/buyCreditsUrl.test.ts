import { describe, expect, test } from "bun:test";
import buyCreditsUrl from "./buyCreditsUrl";

describe("buyCreditsUrl", () => {
  test("opens Buy credits on the account hub for Beacon", () => {
    expect(buyCreditsUrl("https://account.omni.dev/")).toBe(
      "https://account.omni.dev/billing?product=beacon",
    );
  });

  test("is empty without an account hub, so the link is hidden", () => {
    expect(buyCreditsUrl(undefined)).toBe("");
    expect(buyCreditsUrl("")).toBe("");
  });
});
