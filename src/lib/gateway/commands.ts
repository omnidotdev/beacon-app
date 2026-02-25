// Gateway invoke command handlers
//
// Map gateway invoke commands to Tauri plugin calls on the local device

import { getPlatform, isNative } from "@/lib/platform";

type InvokeResult = {
  ok: boolean;
  payload: unknown;
  error: string | null;
};

type InvokeParams = Record<string, unknown>;

type CommandHandler = (params: InvokeParams) => Promise<InvokeResult>;

function success(payload: unknown): InvokeResult {
  return { ok: true, payload, error: null };
}

function failure(error: string): InvokeResult {
  return { ok: false, payload: null, error };
}

/** Collect basic device metadata */
async function handleDeviceInfo(_params: InvokeParams): Promise<InvokeResult> {
  try {
    const platform = getPlatform();
    const ua = navigator.userAgent;

    const info: Record<string, unknown> = {
      platform,
      userAgent: ua,
      language: navigator.language,
      online: navigator.onLine,
      screenWidth: globalThis.screen?.width,
      screenHeight: globalThis.screen?.height,
      devicePixelRatio: globalThis.devicePixelRatio,
      timestamp: Date.now(),
    };

    // Add native-specific info via Tauri OS plugin if available
    if (isNative()) {
      try {
        const {
          arch,
          platform: osPlatform,
          version,
        } = await import("@tauri-apps/plugin-os");
        info.arch = arch();
        info.osPlatform = osPlatform();
        info.osVersion = version();
      } catch {
        // OS plugin not available
      }
    }

    return success(info);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to collect device info",
    );
  }
}

/** Get current geolocation */
async function handleLocationGet(_params: InvokeParams): Promise<InvokeResult> {
  try {
    const { getCurrentPosition } = await import(
      "@tauri-apps/plugin-geolocation"
    );

    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    return success({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get location",
    );
  }
}

/** Trigger a barcode/QR scan using the camera */
async function handleCameraSnap(_params: InvokeParams): Promise<InvokeResult> {
  try {
    const { scan } = await import("@tauri-apps/plugin-barcode-scanner");

    const result = await scan({
      windowed: false,
    });

    return success({
      content: result.content,
      format: result.format,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to scan with camera",
    );
  }
}

/** Collect device status (network, basic runtime info) */
async function handleDeviceStatus(
  _params: InvokeParams,
): Promise<InvokeResult> {
  try {
    const status: Record<string, unknown> = {
      online: navigator.onLine,
      timestamp: Date.now(),
      platform: getPlatform(),
    };

    // Connection type if available
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    };

    if (nav.connection) {
      status.network = {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt,
        saveData: nav.connection.saveData,
      };
    }

    // Memory info if available
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (perf.memory) {
      status.memory = {
        usedHeap: perf.memory.usedJSHeapSize,
        totalHeap: perf.memory.totalJSHeapSize,
        heapLimit: perf.memory.jsHeapSizeLimit,
      };
    }

    return success(status);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get device status",
    );
  }
}

// Command registry mapping command names to handlers
const commandHandlers: Record<string, CommandHandler> = {
  "device.info": handleDeviceInfo,
  "location.get": handleLocationGet,
  "camera.snap": handleCameraSnap,
  "device.status": handleDeviceStatus,
};

/** Get the list of supported command names for the current platform */
export function getSupportedCommands(): string[] {
  const platform = getPlatform();

  // All platforms support basic device commands
  const commands = ["device.info", "device.status"];

  if (platform === "mobile") {
    commands.push("location.get", "camera.snap");
  }

  return commands;
}

/** Execute a gateway invoke command */
export async function executeCommand(
  command: string,
  params: InvokeParams = {},
): Promise<InvokeResult> {
  const handler = commandHandlers[command];
  if (!handler) {
    return failure(`Unknown command: ${command}`);
  }

  try {
    return await handler(params);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : `Command ${command} failed`,
    );
  }
}

export default executeCommand;
