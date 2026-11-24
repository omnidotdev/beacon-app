import type { PersonaInfo } from "@/lib/api";

/**
 * The active persona, mirrored into a cookie so the server renders it on the
 * first paint. localStorage alone is invisible to the server, which rendered a
 * default persona that the browser then swapped out
 */
export const PERSONA_COOKIE = "beacon-persona";

/** Keep the cookie small; a persona too large to fit is simply not mirrored */
const MAX_COOKIE_LENGTH = 1500;

const isOptionalString = (value: unknown) =>
  value === null || value === undefined || typeof value === "string";

/** Read a persona from the cookie value, or null when absent or malformed */
export const parsePersonaCookie = (
  value: string | undefined,
): PersonaInfo | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<
      string,
      unknown
    >;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      !isOptionalString(parsed.tagline) ||
      !isOptionalString(parsed.avatar) ||
      !isOptionalString(parsed.accent_color)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      tagline: (parsed.tagline as string | null | undefined) ?? null,
      avatar: (parsed.avatar as string | null | undefined) ?? null,
      ...(typeof parsed.accent_color === "string"
        ? { accent_color: parsed.accent_color }
        : {}),
    };
  } catch {
    return null;
  }
};

/** Mirror the active persona into the cookie (browser only) */
export const writePersonaCookie = (persona: PersonaInfo) => {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(
    JSON.stringify({
      id: persona.id,
      name: persona.name,
      tagline: persona.tagline,
      avatar: persona.avatar,
      accent_color: persona.accent_color,
    }),
  );
  if (value.length > MAX_COOKIE_LENGTH) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  // biome-ignore lint/suspicious/noDocumentCookie: a plain first-party preference cookie
  document.cookie = `${PERSONA_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
};
