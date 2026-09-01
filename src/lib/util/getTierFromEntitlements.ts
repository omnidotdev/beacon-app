import type { EntitlementsResponse } from "@omnidotdev/providers/billing";
import capitalizeFirstLetter from "./capitalizeFirstLetter";

/**
 * Extract the plan tier from an entitlements response.
 * @param entitlements - Entitlements response from Aether.
 * @returns Capitalized tier name (e.g. "Free", "Pro") or null if unavailable.
 */
const getTierFromEntitlements = (
  entitlements: EntitlementsResponse | null | undefined,
): string | null => {
  const raw = entitlements?.entitlements?.find(
    (entitlement) => entitlement.featureKey === "tier",
  )?.value;

  if (!raw) return null;

  // Strip JSONB quoting (e.g. `"free"` -> `free`)
  const stripped = String(raw).replace(/^"|"$/g, "");

  return capitalizeFirstLetter(stripped);
};

export default getTierFromEntitlements;
