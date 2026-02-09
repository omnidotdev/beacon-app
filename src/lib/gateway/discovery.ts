// Gateway discovery using mDNS (native) or manual configuration (web)
//
// On native platforms, uses Tauri to browse for _beacon-gateway._tcp services
// On web, relies on manual URL configuration or saved gateway addresses
// On cloud deployment (beacon.omni.dev), auto-connects to Omni's hosted gateway

import { getCloudGatewayUrl, isCloudDeployment } from "../api";

export interface DiscoveredGateway {
  // Unique identifier for this gateway
  id: string;

  // Gateway's device ID
  deviceId: string;

  // Human-readable name (from mDNS instance name)
  name: string;

  // Connection URL (e.g., "http://192.168.1.100:18790")
  url: string;

  // Gateway version
  version: string;

  // Active persona
  persona: string;

  // Whether voice is supported
  voiceSupported: boolean;

  // Whether TLS is enabled
  tls: boolean;

  // Discovery method
  source: "mdns" | "manual" | "saved";

  // When this gateway was discovered/saved
  discoveredAt: Date;
}

export type ConnectionState =
  | { status: "disconnected" }
  | { status: "discovering" }
  | { status: "connecting"; gateway: DiscoveredGateway }
  | { status: "connected"; gateway: DiscoveredGateway }
  | { status: "error"; message: string; gateway?: DiscoveredGateway };

// Storage keys
const SAVED_GATEWAYS_KEY = "beacon_saved_gateways";
const LAST_GATEWAY_KEY = "beacon_last_gateway";

/**
 * Gateway discovery manager
 */
export class GatewayDiscovery {
  private connectionState: ConnectionState = { status: "disconnected" };
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private discoveredGateways: Map<string, DiscoveredGateway> = new Map();
  private mdnsBrowser: MdnsBrowser | null = null;

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback);
    callback(this.connectionState);
    return () => this.listeners.delete(callback);
  }

  /**
   * Start discovering gateways
   */
  async startDiscovery(): Promise<void> {
    this.setState({ status: "discovering" });

    // On cloud deployment, skip probe and connect immediately
    if (isCloudDeployment()) {
      const cloudGateway: DiscoveredGateway = {
        id: "cloud",
        deviceId: "cloud",
        name: "Omni Cloud Gateway",
        url: getCloudGatewayUrl(),
        version: "cloud",
        persona: "orin",
        voiceSupported: true,
        tls: true,
        source: "manual",
        discoveredAt: new Date(),
      };
      this.discoveredGateways.set(cloudGateway.id, cloudGateway);
      this.setState({ status: "connected", gateway: cloudGateway });
      return;
    }

    // Load saved gateways first
    const saved = await loadSavedGateways();
    for (const gateway of saved) {
      this.discoveredGateways.set(gateway.id, gateway);
    }

    // Start mDNS discovery on native platforms
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      this.mdnsBrowser = new MdnsBrowser((gateway) => {
        this.discoveredGateways.set(gateway.id, gateway);
        this.notifyListeners();
      });
      await this.mdnsBrowser.start();
    }

    // If we have a last-used gateway, try to connect to it
    const lastGateway = await getLastGateway();
    if (lastGateway) {
      await this.connectTo(lastGateway.url);
    } else {
      // Try localhost as fallback for development
      await this.tryLocalhostFallback();
    }
  }

  /**
   * Try connecting to localhost gateway as fallback
   */
  private async tryLocalhostFallback(): Promise<void> {
    const localhostUrls = ["http://localhost:18790", "http://127.0.0.1:18790"];

    for (const url of localhostUrls) {
      try {
        const gateway = await probeGateway(url);
        this.discoveredGateways.set(gateway.id, gateway);
        this.setState({ status: "connected", gateway });
        await setLastGateway(gateway);
        await saveGateway(gateway);
        return;
      } catch {
        // Continue to next URL
      }
    }

    // No gateway found, stay in disconnected state
    this.setState({ status: "disconnected" });
  }

  /**
   * Stop discovery
   */
  async stopDiscovery(): Promise<void> {
    if (this.mdnsBrowser) {
      await this.mdnsBrowser.stop();
      this.mdnsBrowser = null;
    }
  }

  /**
   * Get all discovered gateways
   */
  getGateways(): DiscoveredGateway[] {
    return Array.from(this.discoveredGateways.values());
  }

  /**
   * Connect to a specific gateway by URL
   */
  async connectTo(url: string): Promise<void> {
    // Normalize URL
    const normalizedUrl = normalizeGatewayUrl(url);

    // Check if we already know this gateway
    let gateway = Array.from(this.discoveredGateways.values()).find(
      (g) => g.url === normalizedUrl,
    );

    if (!gateway) {
      // Probe the gateway to get info
      try {
        gateway = await probeGateway(normalizedUrl);
        this.discoveredGateways.set(gateway.id, gateway);
      } catch (error) {
        this.setState({
          status: "error",
          message: `Failed to connect to gateway: ${error}`,
        });
        return;
      }
    }

    this.setState({ status: "connecting", gateway });

    // Try to verify the gateway is reachable
    try {
      await probeGateway(normalizedUrl);
      this.setState({ status: "connected", gateway });

      // Save as last used
      await setLastGateway(gateway);
      await saveGateway(gateway);
    } catch (error) {
      this.setState({
        status: "error",
        message: `Gateway not reachable: ${error}`,
        gateway,
      });
    }
  }

  /**
   * Disconnect from current gateway
   */
  disconnect(): void {
    this.setState({ status: "disconnected" });
  }

  /**
   * Add a manual gateway
   */
  async addManualGateway(
    url: string,
    name?: string,
  ): Promise<DiscoveredGateway> {
    const normalizedUrl = normalizeGatewayUrl(url);
    const gateway = await probeGateway(normalizedUrl);

    if (name) {
      gateway.name = name;
    }

    gateway.source = "manual";
    this.discoveredGateways.set(gateway.id, gateway);
    await saveGateway(gateway);

    return gateway;
  }

  /**
   * Remove a saved gateway
   */
  async removeGateway(id: string): Promise<void> {
    this.discoveredGateways.delete(id);
    await removeSavedGateway(id);
  }

  private setState(state: ConnectionState): void {
    this.connectionState = state;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.connectionState);
    }
  }
}

// === mDNS Browser (Native only) ===

class MdnsBrowser {
  private running = false;

  constructor(private onGatewayFound: (gateway: DiscoveredGateway) => void) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");

      // Listen for discovered gateways
      await listen<{
        device_id: string;
        name: string;
        host: string;
        port: number;
        version: string;
        persona: string;
        voice: boolean;
        tls: boolean;
      }>("mdns-gateway-found", (event) => {
        const data = event.payload;
        const protocol = data.tls ? "https" : "http";
        const url = `${protocol}://${data.host}:${data.port}`;

        this.onGatewayFound({
          id: data.device_id,
          deviceId: data.device_id,
          name: data.name,
          url,
          version: data.version,
          persona: data.persona,
          voiceSupported: data.voice,
          tls: data.tls,
          source: "mdns",
          discoveredAt: new Date(),
        });
      });

      // Start mDNS browsing
      await invoke("start_mdns_discovery");
    } catch (error) {
      console.warn("[discovery] mDNS not available:", error);
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("stop_mdns_discovery");
    } catch {
      // Ignore errors on stop
    }
  }
}

// === Gateway probing ===

/**
 * Get the appropriate fetch URL for probing
 */
function getProbeUrl(gatewayUrl: string): string {
  return `${gatewayUrl}/api/pair/gateway`;
}

async function probeGateway(url: string): Promise<DiscoveredGateway> {
  const probeUrl = getProbeUrl(url);
  const response = await fetch(probeUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Gateway returned ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.device_id,
    deviceId: data.device_id,
    name: data.name || "Beacon Gateway",
    url,
    version: data.version,
    persona: data.persona || "unknown",
    voiceSupported: data.voice ?? true,
    tls: url.startsWith("https"),
    source: "manual",
    discoveredAt: new Date(),
  };
}

// === URL helpers ===

function normalizeGatewayUrl(url: string): string {
  let normalized = url.trim();

  // Add protocol if missing
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `http://${normalized}`;
  }

  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// === Storage helpers ===

async function loadSavedGateways(): Promise<DiscoveredGateway[]> {
  try {
    const stored = localStorage.getItem(SAVED_GATEWAYS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((g: DiscoveredGateway) => ({
        ...g,
        source: "saved" as const,
        discoveredAt: new Date(g.discoveredAt),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

async function saveGateway(gateway: DiscoveredGateway): Promise<void> {
  const existing = await loadSavedGateways();
  const filtered = existing.filter((g) => g.id !== gateway.id);
  filtered.push({ ...gateway, source: "saved" });
  localStorage.setItem(SAVED_GATEWAYS_KEY, JSON.stringify(filtered));
}

async function removeSavedGateway(id: string): Promise<void> {
  const existing = await loadSavedGateways();
  const filtered = existing.filter((g) => g.id !== id);
  localStorage.setItem(SAVED_GATEWAYS_KEY, JSON.stringify(filtered));
}

async function getLastGateway(): Promise<DiscoveredGateway | null> {
  try {
    const stored = localStorage.getItem(LAST_GATEWAY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        discoveredAt: new Date(parsed.discoveredAt),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

async function setLastGateway(gateway: DiscoveredGateway): Promise<void> {
  localStorage.setItem(LAST_GATEWAY_KEY, JSON.stringify(gateway));
}

// Singleton instance
let discoveryInstance: GatewayDiscovery | null = null;

export function getGatewayDiscovery(): GatewayDiscovery {
  if (!discoveryInstance) {
    discoveryInstance = new GatewayDiscovery();
  }
  return discoveryInstance;
}
