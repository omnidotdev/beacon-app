import { getGatewayDiscovery } from "./discovery";

/**
 * Fetch a JSON endpoint on the connected beacon-gateway
 * @param path - Gateway path (e.g. `/api/billing/plan`)
 * @param options - Fetch options (pass the user's bearer token in headers)
 */
export async function gatewayFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const state = getGatewayDiscovery().getState();
  const gatewayUrl = state.status === "connected" ? state.gateway.url : null;
  if (!gatewayUrl) {
    throw new Error("Not connected to a gateway");
  }
  const res = await fetch(`${gatewayUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Gateway request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
