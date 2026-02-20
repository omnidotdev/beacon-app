import app from "./app.config";

const env = { ...import.meta.env, ...process.env };

/**
 * Environment variables
 */
export const {
  // Core URLs
  VITE_BASE_URL: BASE_URL,
  VITE_API_BASE_URL: API_BASE_URL,
  VITE_AUTH_BASE_URL: AUTH_BASE_URL,
  VITE_GATEWAY_URL: GATEWAY_URL,
  VITE_SYNAPSE_API_URL: SYNAPSE_API_URL,
  // Auth (server-side secrets)
  AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET,
} = env;

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

/**
 * Check if OAuth is configured
 */
export const hasOAuth = !!AUTH_CLIENT_ID && !!AUTH_CLIENT_SECRET;
