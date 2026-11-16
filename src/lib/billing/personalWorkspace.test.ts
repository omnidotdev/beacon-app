import { describe, expect, test } from "bun:test";

import { personalWorkspace } from "./personalWorkspace";

describe("personalWorkspace", () => {
  test("picks the personal workspace out of the session's workspaces", () => {
    expect(
      personalWorkspace([
        { id: "team-1", slug: "acme", type: "team" },
        { id: "personal-1", slug: "claude", type: "personal" },
      ]),
    ).toEqual({ id: "personal-1", slug: "claude" });
  });

  test("is null without a personal workspace", () => {
    expect(
      personalWorkspace([{ id: "team-1", slug: "acme", type: "team" }]),
    ).toBeNull();
    expect(personalWorkspace([])).toBeNull();
    expect(personalWorkspace(undefined)).toBeNull();
  });

  test("is null for slim claims that carry no type or slug", () => {
    expect(personalWorkspace([{ id: "personal-1" }])).toBeNull();
    expect(
      personalWorkspace([{ id: "personal-1", type: "personal" }]),
    ).toBeNull();
  });
});
