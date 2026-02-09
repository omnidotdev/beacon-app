// Device identity management using Ed25519 cryptography
//
// Each app instance has a unique device identity for authenticating
// with the gateway using challenge-response

import * as ed from "@noble/ed25519";

// Use sha512 for ed25519
import { sha512 } from "@noble/hashes/sha2.js";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Storage keys
const IDENTITY_KEY = "beacon_device_identity";
const STORAGE_VERSION = 1;

export interface DeviceIdentity {
  // Unique device identifier (truncated SHA-256 of public key)
  deviceId: string;

  // Ed25519 public key (base64 encoded)
  publicKey: string;

  // Ed25519 private key (base64 encoded) - stored securely
  privateKey: string;

  // Human-readable device name
  name: string;

  // Platform identifier (e.g., "web", "macos", "linux")
  platform: string;

  // When the identity was created
  createdAt: string;

  // Storage version for migrations
  version: number;
}

/**
 * Generate a new device identity with a random Ed25519 keypair
 */
export async function generateIdentity(name: string): Promise<DeviceIdentity> {
  // Generate random private key
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  // Compute device ID as SHA-256 of public key (first 16 bytes = 32 hex chars)
  const deviceId = await computeDeviceId(publicKey);

  // Detect platform
  const platform = detectPlatform();

  return {
    deviceId,
    publicKey: base64Encode(publicKey),
    privateKey: base64Encode(privateKey),
    name,
    platform,
    createdAt: new Date().toISOString(),
    version: STORAGE_VERSION,
  };
}

/**
 * Load identity from storage, or create a new one if it doesn't exist
 */
export async function loadOrCreateIdentity(
  defaultName: string,
): Promise<DeviceIdentity> {
  // Try to load from localStorage (web) or secure storage (native)
  const stored = await loadStoredIdentity();
  if (stored) {
    return stored;
  }

  // Generate new identity
  const identity = await generateIdentity(defaultName);
  await saveIdentity(identity);

  console.log(`[identity] Created new device identity: ${identity.deviceId}`);
  return identity;
}

/**
 * Sign a payload with the device's private key
 */
export async function signPayload(
  identity: DeviceIdentity,
  payload: Uint8Array | string,
): Promise<string> {
  const privateKey = base64Decode(identity.privateKey);
  const message =
    typeof payload === "string" ? new TextEncoder().encode(payload) : payload;

  const signature = await ed.signAsync(message, privateKey);
  return base64Encode(signature);
}

/**
 * Verify a signature from another device
 */
export async function verifySignature(
  publicKey: string,
  payload: Uint8Array | string,
  signature: string,
): Promise<boolean> {
  try {
    const pubKeyBytes = base64Decode(publicKey);
    const sigBytes = base64Decode(signature);
    const message =
      typeof payload === "string" ? new TextEncoder().encode(payload) : payload;

    return await ed.verifyAsync(sigBytes, message, pubKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Get a public-only copy of the identity (safe to share)
 */
export function getPublicIdentity(
  identity: DeviceIdentity,
): Omit<DeviceIdentity, "privateKey"> {
  const { privateKey: _, ...publicData } = identity;
  return publicData;
}

/**
 * Get short device ID (first 8 characters)
 */
export function getShortId(identity: DeviceIdentity): string {
  return identity.deviceId.slice(0, 8);
}

// === Storage helpers ===

async function loadStoredIdentity(): Promise<DeviceIdentity | null> {
  try {
    // Check if we're in Tauri
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      // Use Tauri secure storage
      const { invoke } = await import("@tauri-apps/api/core");
      const stored = await invoke<string | null>("get_secure_storage", {
        key: IDENTITY_KEY,
      }).catch(() => null);

      if (stored) {
        return JSON.parse(stored);
      }
    } else {
      // Use localStorage
      const stored = localStorage.getItem(IDENTITY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (error) {
    console.warn("[identity] Failed to load stored identity:", error);
  }

  return null;
}

async function saveIdentity(identity: DeviceIdentity): Promise<void> {
  try {
    const serialized = JSON.stringify(identity);

    if (typeof window !== "undefined" && "__TAURI__" in window) {
      // Use Tauri secure storage
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_secure_storage", {
        key: IDENTITY_KEY,
        value: serialized,
      }).catch(() => {
        // Fall back to localStorage if secure storage isn't available
        localStorage.setItem(IDENTITY_KEY, serialized);
      });
    } else {
      localStorage.setItem(IDENTITY_KEY, serialized);
    }
  } catch (error) {
    console.error("[identity] Failed to save identity:", error);
    throw error;
  }
}

// === Crypto helpers ===

async function computeDeviceId(publicKey: Uint8Array): Promise<string> {
  // Create a copy of the buffer to ensure it's a proper ArrayBuffer
  const buffer = new Uint8Array(publicKey).buffer;
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  // Take first 16 bytes = 32 hex chars
  return Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64Encode(data: Uint8Array): string {
  // Use standard base64 encoding
  return btoa(String.fromCharCode(...data));
}

function base64Decode(data: string): Uint8Array {
  const binary = atob(data);
  return new Uint8Array(binary.split("").map((c) => c.charCodeAt(0)));
}

function detectPlatform(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  if ("__TAURI__" in window) {
    // Get more specific platform from Tauri
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac")) return "macos";
    if (userAgent.includes("linux")) return "linux";
    if (userAgent.includes("win")) return "windows";
    return "desktop";
  }

  // Web browser
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios-web";
  if (/android/.test(userAgent)) return "android-web";
  return "web";
}
