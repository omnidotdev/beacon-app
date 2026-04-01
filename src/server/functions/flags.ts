import type { FlagContext } from "@omnidotdev/providers/flags";
import { createFlagProvider } from "@omnidotdev/providers/flags";
import { createServerFn } from "@tanstack/react-start";
import { FLAGS_API_HOST, FLAGS_CLIENT_KEY } from "@/lib/config/env.config";

let flags: ReturnType<typeof createFlagProvider> | undefined;

/** Lazily initialize the flag provider (server-only) */
function getFlagProvider() {
  if (!flags) {
    flags = createFlagProvider(
      FLAGS_API_HOST && FLAGS_CLIENT_KEY
        ? {
            provider: "unleash",
            url: FLAGS_API_HOST,
            apiKey: FLAGS_CLIENT_KEY,
            appName: "beacon",
          }
        : {},
    );
  }
  return flags;
}

const FLAGS = {
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
    const isMaintenanceMode = await getFlagProvider().isEnabled(
      FLAGS.MAINTENANCE,
      context,
    );
    return { isMaintenanceMode };
  });
