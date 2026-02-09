import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BASE_URL } from "@/lib/config/env.config";
import { getGatewayClient } from "@/lib/gateway";
import createMetaTags from "@/lib/util/createMetaTags";

export const Route = createFileRoute("/_public/pair")({
  head: () =>
    createMetaTags({
      title: "Pair Device",
      description: "Pair your device with a Beacon gateway",
      url: `${BASE_URL}/pair`,
    }),
  component: PairPage,
});

interface PairingState {
  step: "enter-url" | "enter-code" | "success" | "error";
  gatewayUrl?: string;
  error?: string;
}

function PairPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<PairingState>({ step: "enter-url" });
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayUrl.trim()) return;

    setIsLoading(true);
    try {
      // Normalize URL
      let url = gatewayUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `http://${url}`;
      }

      // Test connection to gateway
      const response = await fetch(`${url}/api/pair/gateway`);
      if (!response.ok) {
        throw new Error("Gateway not reachable");
      }

      setState({ step: "enter-code", gatewayUrl: url });
    } catch (e) {
      setState({
        step: "error",
        error: e instanceof Error ? e.message : "Failed to connect to gateway",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode.trim() || pairingCode.length !== 6) return;

    setIsLoading(true);
    try {
      const client = getGatewayClient();
      const identity = await client.getIdentity();

      // Submit pairing code
      const response = await fetch(`${state.gatewayUrl}/api/pair/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pairingCode.toUpperCase(),
          public_key: identity.publicKey,
          device_id: identity.deviceId,
          device_name: identity.name,
          platform: identity.platform,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Pairing failed");
      }

      // Success - connect to gateway
      if (state.gatewayUrl) {
        await client.connectToGateway(state.gatewayUrl);
      }
      setState({ step: "success" });

      // Navigate to main app after short delay
      setTimeout(() => {
        navigate({ to: "/" });
      }, 2000);
    } catch (e) {
      setState({
        ...state,
        step: "error",
        error: e instanceof Error ? e.message : "Pairing failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setState({ step: "enter-url" });
    setPairingCode("");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text">Pair Device</h1>
          <p className="mt-2 text-muted">
            {state.step === "enter-url" && "Enter your gateway URL to begin"}
            {state.step === "enter-code" &&
              "Enter the 6-digit code shown on your gateway"}
            {state.step === "success" && "Device paired successfully"}
            {state.step === "error" && "Pairing failed"}
          </p>
        </div>

        {/* Step 1: Enter URL */}
        {state.step === "enter-url" && (
          <form onSubmit={handleUrlSubmit}>
            <input
              type="text"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="192.168.1.100:18790"
              className="glass-input mb-4 w-full rounded-xl px-4 py-3 text-text placeholder:text-muted/60"
            />
            <button
              type="submit"
              disabled={isLoading || !gatewayUrl.trim()}
              className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  Connecting...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        )}

        {/* Step 2: Enter Code */}
        {state.step === "enter-code" && (
          <form onSubmit={handleCodeSubmit}>
            <div className="mb-4">
              <p className="mb-3 text-center text-sm text-muted">
                Connected to:{" "}
                <span className="text-text">{state.gatewayUrl}</span>
              </p>
              <input
                type="text"
                value={pairingCode}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 6);
                  setPairingCode(value);
                }}
                placeholder="000000"
                maxLength={6}
                className="glass-input w-full rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-text placeholder:text-muted/60"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || pairingCode.length !== 6}
              className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  Pairing...
                </span>
              ) : (
                "Pair Device"
              )}
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="btn-glass mt-3 w-full rounded-xl px-4 py-2 text-muted"
            >
              Use different gateway
            </button>
          </form>
        )}

        {/* Success */}
        {state.step === "success" && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <p className="text-muted">
              Your device has been paired. Redirecting...
            </p>
          </div>
        )}

        {/* Error */}
        {state.step === "error" && (
          <div className="text-center">
            <div className="mb-4 rounded-md bg-red-500/10 p-4 text-red-400">
              {state.error}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="btn-primary w-full rounded-xl px-4 py-3"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Help text */}
        {(state.step === "enter-url" || state.step === "enter-code") && (
          <p className="mt-6 text-center text-xs text-muted/60">
            The pairing code is displayed on your gateway device or in the
            gateway terminal output.
          </p>
        )}
      </div>
    </div>
  );
}
