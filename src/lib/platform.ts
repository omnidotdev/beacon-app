// Platform detection utilities

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

/**
 * Check if running in a native Tauri environment
 */
export function isNative(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Get the current platform type
 */
export function getPlatform(): "desktop" | "mobile" | "web" {
  if (!isNative()) return "web";

  // Check for mobile via user agent or Tauri platform detection
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) {
    return "mobile";
  }

  return "desktop";
}
