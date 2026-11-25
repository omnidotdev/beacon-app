import { describe, expect, it } from "bun:test";

import {
  addCardLabel,
  cardOfferLink,
  NO_CARD_OFFER,
  parseCardOffer,
} from "./cardOffer";

const HUB = "https://account.omni.dev";
const LIVE = { enabled: true, monthlyCredits: 50 };

describe("parseCardOffer", () => {
  it("reads a live offer", () => {
    expect(parseCardOffer({ enabled: true, monthlyCredits: 50 })).toEqual(LIVE);
  });

  it("treats anything off-contract as no offer", () => {
    for (const body of [
      null,
      "enabled",
      { enabled: false, monthlyCredits: 50 },
      { enabled: "true", monthlyCredits: 50 },
      { enabled: true, monthlyCredits: 0 },
      { enabled: true, monthlyCredits: -1 },
      { enabled: true, monthlyCredits: "50" },
      { enabled: true, monthlyCredits: Number.POSITIVE_INFINITY },
      { enabled: true },
    ]) {
      expect(parseCardOffer(body)).toEqual(NO_CARD_OFFER);
    }
  });
});

describe("cardOfferLink", () => {
  it("links the account hub's AI tab for the personal workspace", () => {
    expect(cardOfferLink(HUB, LIVE, "ada")).toEqual({
      href: "https://account.omni.dev/billing?product=beacon&workspace=ada&tab=ai",
      label: "Add a card to unlock 50 free AI credits a month",
    });
  });

  it("links the hub's default account without a workspace", () => {
    expect(cardOfferLink(HUB, LIVE)?.href).toBe(
      "https://account.omni.dev/billing?product=beacon&tab=ai",
    );
  });

  it("opens the hub as the signed-in account", () => {
    const href = cardOfferLink(HUB, LIVE, "ada", "user-123")?.href ?? "";
    expect(new URL(href).searchParams.get("login_hint")).toBe("user-123");
  });

  it("keeps the link lowercase", () => {
    const link = cardOfferLink(HUB, LIVE, "Ada");
    expect(link?.href).toBe(link?.href.toLowerCase());
  });

  it("offers nothing while the offer is off or unknown", () => {
    expect(cardOfferLink(HUB, NO_CARD_OFFER, "ada")).toBeNull();
    expect(cardOfferLink(HUB, undefined, "ada")).toBeNull();
  });
});

describe("addCardLabel", () => {
  it("names the monthly credits", () => {
    expect(addCardLabel(50)).toBe(
      "Add a card to unlock 50 free AI credits a month",
    );
  });
});
