import { createServerFn } from "@tanstack/react-start";
import type { FlagContext } from "./client";
import { isEnabled } from "./client";

export const FLAGS = {
  MAINTENANCE: "beacon-app-maintenance-mode",
} as const;

/**
 * Fetch the value of the maintenance mode feature flag.
 * Accepts optional user context for admin bypass evaluation.
 *
 * @param context - User context (email) for Unleash constraint evaluation.
 *                  @omni.dev users bypass maintenance mode via Unleash strategy.
 */
export const fetchMaintenanceMode = createServerFn({ method: "GET" })
  .inputValidator((data: FlagContext | undefined) => data)
  .handler(async ({ data: context }) => {
    const isMaintenanceMode = await isEnabled(
      FLAGS.MAINTENANCE,
      false,
      context,
    );
    return { isMaintenanceMode };
  });
