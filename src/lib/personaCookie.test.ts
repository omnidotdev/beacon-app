import { describe, expect, test } from "bun:test";

import { parsePersonaCookie } from "./personaCookie";

const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

describe("parsePersonaCookie", () => {
  test("reads a stored persona", () => {
    expect(
      parsePersonaCookie(
        encode({
          id: "orin",
          name: "Orin",
          tagline: "Your friendly otter guide",
          avatar: "/img/orin-avatar.png",
          accent_color: "#4ECDC4",
        }),
      ),
    ).toEqual({
      id: "orin",
      name: "Orin",
      tagline: "Your friendly otter guide",
      avatar: "/img/orin-avatar.png",
      accent_color: "#4ECDC4",
    });
  });

  test("is null when missing or malformed", () => {
    expect(parsePersonaCookie(undefined)).toBeNull();
    expect(parsePersonaCookie("not json")).toBeNull();
    expect(parsePersonaCookie(encode({ id: 1, name: "x" }))).toBeNull();
    expect(
      parsePersonaCookie(encode({ id: "a", name: "b", avatar: 5 })),
    ).toBeNull();
  });
});
