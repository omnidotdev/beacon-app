import { describe, expect, test } from "bun:test";
import buyCreditsUrl from "./buyCreditsUrl";

const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("buyCreditsUrl", () => {
  test("opens Buy credits on the account hub for Beacon", () => {
    const url = buyCreditsUrl("https://account.omni.dev/");

    expect(url.startsWith("https://account.omni.dev/billing?")).toBe(true);
    expect(params(url)).toEqual({ product: "beacon", tab: "ai" });
  });

  test("buys for the personal workspace Beacon bills", () => {
    expect(
      params(
        buyCreditsUrl("https://account.omni.dev", { workspace: "Claude" }),
      ),
    ).toEqual({ product: "beacon", tab: "ai", workspace: "claude" });
  });

  test("opens the hub as the signed-in account", () => {
    expect(
      params(
        buyCreditsUrl("https://account.omni.dev", {
          workspace: "claude",
          loginHint: "user-123",
        }),
      ),
    ).toEqual({
      product: "beacon",
      tab: "ai",
      workspace: "claude",
      login_hint: "user-123",
    });
  });

  test("is empty without an account hub, so the link is hidden", () => {
    expect(buyCreditsUrl(undefined)).toBe("");
    expect(buyCreditsUrl("", { workspace: "claude" })).toBe("");
  });
});
