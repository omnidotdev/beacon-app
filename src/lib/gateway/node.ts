// Node registration service for the beacon-gateway
//
// Connects this device as a node to the gateway's node registry,
// exposing device capabilities (camera, location, etc.) for remote invocation

import { getPlatform, isNative } from "@/lib/platform";

import { executeCommand, getSupportedCommands } from "./commands";
import { loadOrCreateIdentity } from "./identity";

import type { DeviceIdentity } from "./identity";

// WS message types matching the gateway node protocol

type NodeRegisterMessage = {
  type: "register";
  device_id: string;
  display_name: string;
  platform: string;
  device_family: string;
  caps: string[];
  commands: string[];
};

type InvokeResponseMessage = {
  type: "invoke_response";
  ok: boolean;
  payload: unknown;
  error: string | null;
};

type GatewayInvokeMessage = {
  command: string;
  params: Record<string, unknown>;
  timeout_ms: number;
  idempotency_key: string;
};

type GatewayRegisteredMessage = {
  type: "registered";
  node_id: string;
};

type GatewayMessage = GatewayInvokeMessage | GatewayRegisteredMessage;

/** Determine device capabilities based on platform */
function getDeviceCapabilities(): string[] {
  const platform = getPlatform();

  if (platform === "mobile") {
    return ["camera", "location"];
  }

  if (platform === "desktop") {
    return ["audio", "display"];
  }

  return [];
}

/** Determine device family from user agent */
function getDeviceFamily(): string {
  const platform = getPlatform();

  if (platform === "mobile") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("ipad")) return "tablet";
    return "phone";
  }

  if (platform === "desktop") {
    return "laptop";
  }

  return "unknown";
}

/** Detect OS-level platform string for the register message */
function detectOsPlatform(): string {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("mac")) return "darwin";
  if (ua.includes("linux")) return "linux";
  if (ua.includes("win")) return "windows";

  return "unknown";
}

type NodeRegistrationConfig = {
  // Gateway base URL (e.g. "http://localhost:18790")
  gatewayUrl: string;
  // Reconnect delay in ms (doubles on each attempt)
  reconnectDelay?: number;
  // Maximum reconnect attempts before giving up
  maxReconnectAttempts?: number;
  // Default device display name
  defaultDeviceName?: string;
};

/**
 * Manage node registration with the beacon-gateway
 *
 * Connects via WebSocket to the gateway's /ws/node endpoint and
 * registers this device's capabilities. Handles invoke requests
 * by dispatching to local Tauri plugin APIs
 */
class NodeRegistrationService {
  private ws: WebSocket | null = null;
  private nodeId: string | null = null;
  private identity: DeviceIdentity | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  private readonly gatewayUrl: string;
  private readonly reconnectDelay: number;
  private readonly maxReconnectAttempts: number;
  private readonly defaultDeviceName: string;

  constructor(config: NodeRegistrationConfig) {
    this.gatewayUrl = config.gatewayUrl;
    this.reconnectDelay = config.reconnectDelay ?? 2000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 10;
    this.defaultDeviceName = config.defaultDeviceName ?? "Beacon Device";
  }

  /** Start the node registration connection */
  async start(): Promise<void> {
    this.stopped = false;
    this.identity = await loadOrCreateIdentity(this.defaultDeviceName);
    this.connect();
  }

  /** Stop the node registration and close the connection */
  stop(): void {
    this.stopped = true;
    this.clearReconnectTimer();

    if (this.ws) {
      // Remove handlers before closing to avoid reconnect
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.nodeId = null;
    this.reconnectAttempts = 0;
    console.log("[node] Registration stopped");
  }

  /** Check if currently connected and registered */
  isRegistered(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN && this.nodeId !== null
    );
  }

  /** Get the assigned node ID (null if not registered) */
  getNodeId(): string | null {
    return this.nodeId;
  }

  private connect(): void {
    if (this.stopped) return;

    // Build the WS URL from the gateway base URL
    const protocol = this.gatewayUrl.startsWith("https") ? "wss" : "ws";
    const host = this.gatewayUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}://${host}/ws/node`;

    console.log("[node] Connecting to gateway node endpoint:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[node] WebSocket connected, sending registration");
      this.reconnectAttempts = 0;
      this.sendRegistration();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as GatewayMessage;
        this.handleMessage(msg);
      } catch (err) {
        console.error("[node] Failed to parse message:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[node] WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("[node] WebSocket disconnected");
      this.ws = null;
      this.nodeId = null;
      this.scheduleReconnect();
    };
  }

  private sendRegistration(): void {
    if (!this.identity || this.ws?.readyState !== WebSocket.OPEN) return;

    const message: NodeRegisterMessage = {
      type: "register",
      device_id: this.identity.deviceId,
      display_name: this.identity.name,
      platform: detectOsPlatform(),
      device_family: getDeviceFamily(),
      caps: getDeviceCapabilities(),
      commands: getSupportedCommands(),
    };

    this.ws.send(JSON.stringify(message));
    console.log("[node] Registration sent with caps:", message.caps);
  }

  private handleMessage(msg: GatewayMessage): void {
    // Handle registration confirmation
    if ("type" in msg && msg.type === "registered") {
      const registered = msg as GatewayRegisteredMessage;
      this.nodeId = registered.node_id;
      console.log("[node] Registered as node:", this.nodeId);
      return;
    }

    // Handle invoke requests
    if ("command" in msg && "idempotency_key" in msg) {
      const invoke = msg as GatewayInvokeMessage;
      this.handleInvoke(invoke);
    }
  }

  private async handleInvoke(msg: GatewayInvokeMessage): Promise<void> {
    console.log("[node] Invoke request:", msg.command);

    const result = await executeCommand(msg.command, msg.params);

    const response: InvokeResponseMessage = {
      type: "invoke_response",
      ok: result.ok,
      payload: result.payload,
      error: result.error,
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(response));
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        "[node] Max reconnect attempts reached, giving up",
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `[node] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export { getDeviceCapabilities, getDeviceFamily, NodeRegistrationService };

export type { NodeRegistrationConfig };

export default NodeRegistrationService;
