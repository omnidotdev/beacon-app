import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Key, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import type { ProviderInfo, ProvidersResponse, SystemStatus } from "@/lib/api";
import { BASE_URL } from "@/lib/config/env.config";
import {
  type ConnectionState,
  type DiscoveredGateway,
  getGatewayDiscovery,
} from "@/lib/gateway";
import createMetaTags from "@/lib/util/createMetaTags";

export const Route = createFileRoute("/_public/setup")({
  head: () =>
    createMetaTags({
      title: "Setup",
      description: "Connect to a Beacon gateway and configure your AI provider",
      url: `${BASE_URL}/setup`,
    }),
  component: SetupPage,
});

type SetupStep = "gateway" | "provider";

function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>("gateway");
  const [gateways, setGateways] = useState<DiscoveredGateway[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
  });
  const [manualUrl, setManualUrl] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider setup state
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Start discovery on mount
  useEffect(() => {
    const discovery = getGatewayDiscovery();

    // Check provider status after gateway connection
    const checkProviderStatus = async (gatewayUrl: string) => {
      try {
        const statusRes = await fetch(`${gatewayUrl}/api/status`);
        const status: SystemStatus = await statusRes.json();

        // If model is configured, gateway is ready
        if (status.model) {
          navigate({ to: "/" });
          return;
        }

        // No model configured, need provider setup
        const providersRes = await fetch(`${gatewayUrl}/api/providers`);
        const providersData: ProvidersResponse = await providersRes.json();
        setProviders(providersData.providers);
        setStep("provider");
      } catch (e) {
        console.error("Failed to check provider status:", e);
        // If we can't check, just navigate and let the app handle it
        navigate({ to: "/" });
      }
    };

    const unsubscribe = discovery.subscribe((state) => {
      setConnectionState(state);
      if (state.status === "connected" && state.gateway) {
        checkProviderStatus(state.gateway.url);
      }
    });

    discovery.startDiscovery().then(() => {
      setGateways(discovery.getGateways());
    });

    const interval = setInterval(() => {
      setGateways(discovery.getGateways());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      discovery.stopDiscovery();
    };
  }, [navigate]);

  const handleConnect = async (gateway: DiscoveredGateway) => {
    setError(null);
    try {
      const discovery = getGatewayDiscovery();
      await discovery.connectTo(gateway.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    setError(null);
    try {
      const discovery = getGatewayDiscovery();
      await discovery.addManualGateway(manualUrl.trim());
      await discovery.connectTo(manualUrl.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleConfigureProvider = async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    setIsConfiguring(true);
    setError(null);

    try {
      const gateway =
        connectionState.status === "connected" ? connectionState.gateway : null;
      if (!gateway) throw new Error("Not connected to gateway");

      const res = await fetch(`${gateway.url}/api/providers/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          api_key: apiKey,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Key saved to gateway — navigate to app
        navigate({ to: "/" });
      } else {
        setError(data.message || "Failed to configure provider");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Configuration failed");
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleSkipToApp = () => {
    navigate({ to: "/" });
  };

  const isConnecting = connectionState.status === "connecting";
  const isDiscovering = connectionState.status === "discovering";

  // Provider setup step
  if (step === "provider") {
    const byokProviders = providers.filter(
      (p) => !p.coming_soon && p.api_key_url,
    );
    const comingSoonProviders = providers.filter((p) => p.coming_soon);

    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text">
              Configure AI Provider
            </h1>
            <p className="mt-2 text-muted">
              Connect an AI provider to start chatting
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {/* BYOK Providers */}
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted/60">
              Bring Your Own Key
            </h3>
            {byokProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedProvider(provider.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedProvider === provider.id
                    ? "border-primary bg-primary/10"
                    : "glass-surface hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-text">{provider.name}</h4>
                    <p className="mt-1 text-sm text-muted">
                      {provider.description}
                    </p>
                  </div>
                  {provider.api_key_url && (
                    <a
                      href={provider.api_key_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      Get Key
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                {provider.features.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {provider.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-muted"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* API Key Input */}
          {selectedProvider && (
            <div className="mb-6">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="glass-input mb-3 w-full rounded-xl px-4 py-3 text-text placeholder:text-muted/60"
              />
              <button
                type="button"
                onClick={handleConfigureProvider}
                disabled={isConfiguring || !apiKey.trim()}
                className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-50"
              >
                {isConfiguring ? "Configuring..." : "Configure Provider"}
              </button>
            </div>
          )}

          {/* Coming Soon */}
          {comingSoonProviders.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted/60">
                <Sparkles size={12} />
                Coming Soon
              </h3>
              <div className="space-y-3">
                {comingSoonProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="glass-surface rounded-xl p-4 opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">
                        {provider.name}
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                        <Zap size={10} />
                        Soon
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {provider.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-sm text-muted">or</span>
            </div>
          </div>

          {/* Cloud Login */}
          <Link
            to="/login"
            className="mb-3 block w-full rounded-xl border border-primary/50 px-4 py-3 text-center font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
          >
            Sign in with Omni (Cloud)
          </Link>

          <button
            type="button"
            onClick={handleSkipToApp}
            className="btn-glass w-full rounded-xl px-4 py-3 text-muted"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Gateway connection step
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text">Connect to Gateway</h1>
          <p className="mt-2 text-muted">
            Find a Beacon gateway on your local network
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Discovered Gateways */}
        <div className="mb-6 space-y-3">
          {isDiscovering && gateways.length === 0 && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              <span>Searching for gateways...</span>
            </div>
          )}

          {gateways.map((gateway) => (
            <button
              type="button"
              key={gateway.id}
              onClick={() => handleConnect(gateway)}
              disabled={isConnecting}
              className="glass-surface w-full rounded-xl p-4 text-left transition-colors hover:border-primary/50 disabled:opacity-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-text">{gateway.name}</h3>
                  <p className="text-sm text-muted">{gateway.url}</p>
                </div>
                <span
                  className={`text-xs ${
                    gateway.source === "mdns" ? "text-green-400" : "text-muted"
                  }`}
                >
                  {gateway.source === "mdns" ? "Auto-discovered" : "Saved"}
                </span>
              </div>
              <div className="mt-2 flex gap-2 text-xs text-muted">
                <span>v{gateway.version}</span>
                <span>•</span>
                <span>{gateway.persona}</span>
                {gateway.voiceSupported && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">Voice</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Manual URL Input */}
        {showManual ? (
          <form onSubmit={handleManualConnect} className="mb-6">
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="http://192.168.1.100:18790"
              className="glass-input mb-3 w-full rounded-xl px-4 py-3 text-text placeholder:text-muted/60"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isConnecting || !manualUrl.trim()}
                className="btn-primary flex-1 rounded-xl px-4 py-2 disabled:opacity-50"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="btn-glass rounded-xl px-4 py-2 text-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="btn-glass mb-6 w-full rounded-xl px-4 py-3 text-muted"
          >
            Enter gateway URL manually
          </button>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-sm text-muted">or</span>
          </div>
        </div>

        {/* Cloud Login */}
        <Link
          to="/login"
          className="block w-full rounded-xl border border-primary/50 px-4 py-3 text-center font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
        >
          Sign in with Omni (Cloud)
        </Link>

        <p className="mt-4 text-center text-xs text-muted/60">
          Cloud features require an Omni account
        </p>
      </div>
    </div>
  );
}
