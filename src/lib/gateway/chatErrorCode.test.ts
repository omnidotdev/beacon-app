import { describe, expect, it } from "bun:test";
import getChatErrorKind from "./chatErrorCode";

describe("getChatErrorKind", () => {
  it("maps the gateway out-of-credits code", () => {
    expect(getChatErrorKind("out_of_credits")).toBe("out_of_credits");
  });

  it("maps the gateway unavailable code", () => {
    expect(getChatErrorKind("ai_unavailable")).toBe("ai_unavailable");
  });

  it("treats any other or missing code as a generic error", () => {
    expect(getChatErrorKind("agent_error")).toBe("other");
    expect(getChatErrorKind("provision_failed")).toBe("other");
    expect(getChatErrorKind(undefined)).toBe("other");
  });
});
