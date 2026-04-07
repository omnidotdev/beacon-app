import type { KnipConfig } from "knip";

/**
 * Knip configuration.
 * @see https://knip.dev/overview/configuration
 */
const knipConfig: KnipConfig = {
  project: ["src/**/*.ts", "src/**/*.tsx"],
  ignoreDependencies: [
    // Nitro runtime dependency
    "srvx",
  ],
};

export default knipConfig;
