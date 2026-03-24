import app from "./app.config";

// Build-time vars take precedence to prevent SSR hydration mismatch
const env =
  typeof window === "undefined"
    ? { ...process.env, ...import.meta.env }
    : import.meta.env;

/**
 * Environment variables
 */
export const {
  // Core URLs
  VITE_BASE_URL: BASE_URL,
  VITE_API_BASE_URL: API_BASE_URL,
  VITE_AUTH_BASE_URL: AUTH_BASE_URL,
  VITE_SYNAPSE_API_URL: SYNAPSE_API_URL,
  VITE_GATEKEEPER_URL: GATEKEEPER_URL,
  // Auth (server-side secrets)
  AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET,
} = env;

// Internal auth URL for server-to-server communication (Docker service name)
// Falls back to AUTH_BASE_URL for non-Docker environments
export const AUTH_INTERNAL_URL =
  typeof window === "undefined"
    ? process.env.AUTH_INTERNAL_URL || AUTH_BASE_URL
    : AUTH_BASE_URL;

// SSR-safe: try non-prefixed (process.env) then VITE_-prefixed (import.meta.env), fallback to known production URL
export const CONSOLE_URL =
  env.CONSOLE_URL || env.VITE_CONSOLE_URL || app.links.console;

// Feature flags
export const FLAGS_API_HOST = env.FLAGS_API_HOST || env.VITE_FLAGS_API_HOST;
export const FLAGS_CLIENT_KEY =
  env.FLAGS_CLIENT_KEY || env.VITE_FLAGS_CLIENT_KEY;

const API_BASE = API_BASE_URL ?? "/api";
export const API_GRAPHQL_URL = `${API_BASE}/graphql`;

// Environment helpers
export const isDevEnv = import.meta.env.DEV;
