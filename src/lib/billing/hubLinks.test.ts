import { describe, expect, test } from "bun:test";

import {
  hubInterval,
  manageSubscriptionUrl,
  settingsUrl,
  upgradePlanUrl,
} from "./hubLinks";

const HUB = "https://account.omni.dev";
const BEACON = "https://beacon.omni.dev";

const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("settingsUrl", () => {
  test("points at Beacon's settings page", () => {
    expect(settingsUrl(`${BEACON}/`)).toBe(`${BEACON}/settings`);
  });

  test("falls back to the browser's origin without a base URL", () => {
    const original = globalThis.window;
    globalThis.window = {
      location: { origin: BEACON },
    } as unknown as Window & typeof globalThis;

    try {
      expect(settingsUrl("")).toBe(`${BEACON}/settings`);
    } finally {
      globalThis.window = original;
    }
  });

  test("is undefined without a base URL outside the browser", () => {
    expect(settingsUrl(undefined)).toBeUndefined();
  });
});

describe("hubInterval", () => {
  test("keeps the intervals the hub sells", () => {
    expect(hubInterval("month")).toBe("month");
    expect(hubInterval("year")).toBe("year");
  });

  test("drops any other interval", () => {
    expect(hubInterval("week")).toBeUndefined();
    expect(hubInterval(undefined)).toBeUndefined();
  });
});

describe("upgradePlanUrl", () => {
  test("buys the plan on the account hub and returns to settings", () => {
    const url = upgradePlanUrl(HUB, BEACON, { plan: "pro", interval: "month" });

    expect(url.startsWith(`${HUB}/billing?`)).toBe(true);
    expect(params(url)).toEqual({
      product: "beacon",
      plan: "pro",
      interval: "month",
      return: `${BEACON}/settings`,
    });
  });

  test("buys for the personal workspace Beacon bills", () => {
    expect(
      params(
        upgradePlanUrl(HUB, BEACON, {
          plan: "pro",
          interval: "month",
          workspace: "Claude",
        }),
      ),
    ).toEqual({
      product: "beacon",
      plan: "pro",
      interval: "month",
      workspace: "claude",
      return: `${BEACON}/settings`,
    });
  });

  test("lets the hub ask for the workspace when none is known", () => {
    expect(
      params(upgradePlanUrl(HUB, BEACON, { plan: "team", interval: "year" })),
    ).not.toHaveProperty("workspace");
  });

  test("is empty when no account hub is configured", () => {
    expect(
      upgradePlanUrl(undefined, BEACON, { plan: "pro", interval: "month" }),
    ).toBe("");
  });
});

describe("manageSubscriptionUrl", () => {
  test("manages the personal workspace's plan on the hub", () => {
    const url = manageSubscriptionUrl(`${HUB}/`, BEACON, "claude");

    expect(url.startsWith(`${HUB}/billing?`)).toBe(true);
    expect(params(url)).toEqual({
      product: "beacon",
      workspace: "claude",
      manage: "1",
      return: `${BEACON}/settings`,
    });
  });

  test("opens the hub's subscriptions tab without a workspace", () => {
    const url = manageSubscriptionUrl(`${HUB}/`, BEACON);

    expect(url.startsWith(`${HUB}/billing?`)).toBe(true);
    expect(params(url)).toEqual({ tab: "subscriptions" });
  });

  test("is empty when no account hub is configured", () => {
    expect(manageSubscriptionUrl("", BEACON, "claude")).toBe("");
    expect(manageSubscriptionUrl("", BEACON)).toBe("");
  });
});
