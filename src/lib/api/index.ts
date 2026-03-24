// Platform-detecting API client factory
//
// Supports two modes:
// - Legacy mode: Direct HTTP/IPC based on platform
// - Gateway mode: Unified client connecting to beacon-gateway
//
// Gateway mode is the new default for local-first architecture

import { type GatewayClientExtensions, getGatewayClient } from "../gateway";
import { isNative } from "../platform";
import { createHttpClient } from "./http";
import { createIpcClient } from "./ipc";
import type { ApiClient } from "./types";

export * from "./types";

let clientInstance: ApiClient | null = null;
const useGatewayMode = true; // Default to gateway mode

// Cloud gateway URL proxied same-origin through Nitro
const CLOUD_GATEWAY_URL = "/gateway";

/**
 * Check if running on cloud deployment (beacon.omni.dev)
 */
export function isCloudDeployment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "beacon.omni.dev" || hostname.endsWith(".beacon.omni.dev")
  );
}

/**
 * Get the cloud gateway URL
 */
export function getCloudGatewayUrl(): string {
  return CLOUD_GATEWAY_URL;
}

/**
 * Create an API client appropriate for the current platform/mode
 * Returns a singleton instance
 */
export function createApiClient(): ApiClient {
  if (clientInstance) return clientInstance;

  if (useGatewayMode) {
    // Use unified gateway client (local-first)
    clientInstance = getGatewayClient();
  } else {
    // Use legacy platform-specific clients
    clientInstance = isNative() ? createIpcClient() : createHttpClient();
  }

  return clientInstance;
}

/**
 * Get the gateway client with extended features
 * Only available when using gateway mode
 */
export function getExtendedClient():
  | (ApiClient & GatewayClientExtensions)
  | null {
  if (!useGatewayMode) return null;
  return getGatewayClient();
}
