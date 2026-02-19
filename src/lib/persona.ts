import type { PersonaInfo } from "@/lib/api";

// Sentinel value used in localStorage and throughout the app to represent "no persona"
const NO_PERSONA_ID = "__none__";

const NO_PERSONA = {
  id: NO_PERSONA_ID,
  name: "Beacon",
  tagline: "No persona applied",
  avatar: null,
} satisfies PersonaInfo;

export { NO_PERSONA, NO_PERSONA_ID };
