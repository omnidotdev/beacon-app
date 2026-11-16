import capitalizeFirstLetter from "@/lib/util/capitalizeFirstLetter";

/**
 * The plan of the workspace a user's Beacon usage bills, as beacon-gateway
 * reports it (`GET /api/billing/plan`). The gateway resolves the personal
 * workspace and reads Aether with its service key, so this is exactly the plan
 * and balance it enforces
 */
export type BeaconPlan = {
  /** `organization` for a workspace, `user` before one is known */
  entityType: "organization" | "user";
  workspaceId: string | null;
  /** Tier name (`free`, `pro`, `team`), null when unknown */
  tier: string | null;
  /** Credit balance in retail USD; a JSON number, or a numeric string */
  creditBalance: number | string | null;
};

/**
 * Display name for a plan tier: `Pro` for `pro`, `Free` when unknown. Strips
 * JSONB quoting in case a raw entitlement value comes through
 * @param tier - Tier name from the plan
 */
export const planName = (tier: string | null | undefined): string => {
  const stripped = (tier ?? "").trim().replace(/^"|"$/g, "");
  return stripped ? capitalizeFirstLetter(stripped.toLowerCase()) : "Free";
};

/**
 * Whether the tier is a paid plan
 * @param tier - Tier name from the plan
 */
export const isPaidTier = (tier: string | null | undefined): boolean => {
  const stripped = (tier ?? "").trim().replace(/^"|"$/g, "").toLowerCase();
  return !!stripped && stripped !== "free";
};
