import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  Check,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  LogOut,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BeaconLogo } from "@/components/Sidebar";
import SubscriptionSettings from "@/components/SubscriptionSettings";
import {
  useConfigureProvider,
  usePersona,
  useProviders,
  useRemoveProvider,
  useSetActiveProvider,
} from "@/hooks";
import type { ProviderInfo, ProviderType } from "@/lib/api";
import signOut from "@/lib/auth/signOut";
import { CONSOLE_URL, SYNAPSE_API_URL } from "@/lib/config/env.config";
import { db } from "@/lib/db";
import * as localDb from "@/lib/db/conversations";
import { NO_PERSONA_ID } from "@/lib/persona";
import createMetaTags from "@/lib/util/createMetaTags";

const USE_SYNAPSE = !!SYNAPSE_API_URL;

export const Route = createFileRoute("/_auth/settings")({
  head: () => createMetaTags({ title: "Settings" }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = useRouteContext({ from: "__root__" });
  const { data: persona } = usePersona();
  const { data: providersData, isLoading: providersLoading } = useProviders();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const showAccountSection = !!session?.user;

  const handleExportChats = useCallback(async () => {
    setIsExporting(true);
    try {
      const conversations = await db.conversations.toArray();
      const messages = await db.messages.toArray();

      const data = {
        exportedAt: new Date().toISOString(),
        conversations,
        messages,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beacon-chats-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export chats:", err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleClearChats = useCallback(async () => {
    setIsClearing(true);
    try {
      await localDb.clearAllData();
      setShowClearConfirm(false);
      toast.success("All chats cleared");
    } catch (err) {
      console.error("Failed to clear chats:", err);
      toast.error("Failed to clear chats");
    } finally {
      setIsClearing(false);
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
    }
  };

  const providers = [...(providersData?.providers ?? [])].sort((a, b) =>
    a.id === "omni_credits" ? -1 : b.id === "omni_credits" ? 1 : 0,
  );
  const activeProvider = providersData?.active_provider;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="glass-surface border-b border-border/50 px-6 py-4 md:hidden">
        <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-xl font-semibold text-transparent">
          Settings
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {showAccountSection && (
            <SettingsSection title="Account">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-primary/20">
                      <span className="text-xl font-semibold text-primary">
                        {session.user.name?.[0] ??
                          session.user.email?.[0] ??
                          "U"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-text">
                      {session.user.name ?? "User"}
                    </p>
                    <p className="text-sm text-muted">{session.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {CONSOLE_URL && (
                    <a
                      href={CONSOLE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-elevated"
                    >
                      <ExternalLink size={16} />
                      Manage account
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            </SettingsSection>
          )}

          <SubscriptionSettings />

          <SettingsSection title="Persona">
            <div className="flex items-center gap-4">
              {persona?.avatar ? (
                <img
                  src={persona.avatar}
                  alt={persona.name}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : persona?.id === NO_PERSONA_ID ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary ring-2 ring-primary/20">
                  <BeaconLogo className="h-7 w-7" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-primary/20">
                  <span className="text-xl font-semibold text-primary">
                    {persona?.name?.[0] ?? "O"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-text">
                  {persona?.name ?? "Orin"}
                </p>
                <p className="text-sm text-muted">
                  {persona?.tagline ?? "Your AI assistant"}
                </p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="AI Providers">
            <div className="space-y-4">
              {providersLoading ? (
                <>
                  <ProviderSkeleton />
                  <ProviderSkeleton />
                </>
              ) : (
                <>
                  {/* Omni Credits — primary, always first */}
                  {USE_SYNAPSE ? (
                    (() => {
                      const omniCredits = providers.find(
                        (p) => p.id === "omni_credits",
                      );
                      return omniCredits ? (
                        <OmniCreditsCard
                          provider={omniCredits}
                          isActive={activeProvider === "omni_credits"}
                        />
                      ) : null;
                    })()
                  ) : (
                    <div className="glass-surface rounded-xl p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-text">Omni Synapse</h4>
                          <p className="mt-1 text-sm text-muted">
                            Sign in with Omni for smart routing, credits, and
                            cross-device sync
                          </p>
                        </div>
                        <span className="text-xs text-muted/50">
                          Not available
                        </span>
                      </div>
                    </div>
                  )}

                  {/* BYOK — advanced, optional */}
                  <div className="mt-2">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted/60">
                        Bring Your Own Keys
                      </h3>
                      <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted/50">
                        {USE_SYNAPSE ? "Advanced" : "AI Providers"}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-muted/60">
                      Optional. Connect your own provider API keys for direct
                      billing, cost control, or access to models not available
                      through Omni Synapse.
                    </p>
                    <div className="space-y-3">
                      {providers
                        .filter(
                          (p) => p.id !== "omni_credits" && !p.coming_soon,
                        )
                        .map((provider) => (
                          <ProviderCard
                            key={provider.id}
                            provider={provider}
                            isActive={activeProvider === provider.id}
                          />
                        ))}
                    </div>
                  </div>

                  {providers.some((p) => p.coming_soon) && (
                    <div className="mt-6">
                      <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted/60">
                        <Sparkles size={12} />
                        Coming Soon
                      </h3>
                      <div className="space-y-3">
                        {providers
                          .filter((p) => p.coming_soon)
                          .map((provider) => (
                            <ProviderCard
                              key={provider.id}
                              provider={provider}
                              isActive={false}
                              disabled
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-accent/15 bg-accent/5 px-3.5 py-2.5">
              <Lock size={14} className="mt-0.5 flex-shrink-0 text-accent/60" />
              <p className="text-xs leading-relaxed text-muted">
                Keys are encrypted and stored securely with your account, never
                in your browser. Cleared from memory after saving.
              </p>
            </div>
          </SettingsSection>

          <SettingsSection title="Data">
            <p className="mb-4 text-sm text-muted">
              Conversations are stored locally on your device
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExportChats}
                disabled={isExporting}
                className="btn-glass flex flex-1 items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Download size={16} />
                {isExporting ? "Exporting..." : "Export chats"}
              </button>
              {showClearConfirm ? (
                <div className="flex flex-1 gap-2">
                  <button
                    type="button"
                    onClick={handleClearChats}
                    disabled={isClearing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {isClearing ? "Clearing..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="btn-glass px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  Clear all chats
                </button>
              )}
            </div>
          </SettingsSection>

          {/* Omni CLI callout */}
          <a
            href="https://github.com/omnidotdev/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent/5 px-5 py-4 transition-all hover:border-accent/30 hover:glow-soft"
          >
            <Terminal
              size={18}
              className="mt-0.5 flex-shrink-0 text-accent/60 transition-colors group-hover:text-accent"
            />
            <div>
              <p className="text-sm font-medium text-text">
                Prefer the terminal?
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Omni CLI brings the same agent to your command line, with a TUI
                and HTTP API for scripting and automation
              </p>
            </div>
            <ExternalLink
              size={14}
              className="mt-0.5 flex-shrink-0 text-muted/40 transition-colors group-hover:text-muted"
            />
          </a>
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted/60">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ProviderSkeleton() {
  return (
    <div className="glass-surface animate-pulse rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-24 rounded bg-surface-elevated" />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded-lg bg-surface-elevated" />
          <div className="h-7 w-18 rounded-lg bg-surface-elevated" />
        </div>
      </div>
      <div className="mt-2 h-4 w-48 rounded bg-surface-elevated" />
      <div className="mt-2 flex gap-1">
        <div className="h-5 w-12 rounded-md bg-surface-elevated" />
        <div className="h-5 w-12 rounded-md bg-surface-elevated" />
      </div>
    </div>
  );
}

interface OmniCreditsCardProps {
  provider: ProviderInfo;
  isActive: boolean;
}

function OmniCreditsCard({ provider, isActive }: OmniCreditsCardProps) {
  const { mutateAsync: setActive, isPending: isSettingActive } =
    useSetActiveProvider();

  const handleSetActive = async () => {
    try {
      await setActive("omni_credits" as ProviderType);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set active provider",
      );
    }
  };

  return (
    <div
      className={`relative rounded-xl p-4 transition-all ${
        isActive
          ? "glass-panel border-primary/50 glow-soft"
          : "glass-surface hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{provider.name}</span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              <Check size={10} />
              Active
            </span>
          )}
        </div>
        {!isActive && (
          <button
            type="button"
            onClick={handleSetActive}
            disabled={isSettingActive}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {isSettingActive ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              "Use"
            )}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Smart routing across Claude, GPT-4o, and Kimi — included with your
        account.
      </p>
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderInfo;
  isActive: boolean;
  disabled?: boolean;
}

function ProviderCard({ provider, isActive, disabled }: ProviderCardProps) {
  const { mutateAsync: configure, isPending } = useConfigureProvider();
  const { mutateAsync: remove, isPending: isRemoving } = useRemoveProvider();
  const { mutateAsync: setActive, isPending: isSettingActive } =
    useSetActiveProvider();
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const isConfigured = provider.status === "configured";
  const isComingSoon = provider.coming_soon;
  const isOmniCredits = provider.id === "omni_credits";

  const handleRemove = async () => {
    try {
      await remove(provider.id as ProviderType);
      setShowRemoveConfirm(false);
      toast.success(`${provider.name} removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove key");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setError(null);

    try {
      const result = await configure({
        provider: provider.id as ProviderType,
        api_key: apiKey.trim(),
      });

      if (result.success) {
        setApiKey("");
        setShowForm(false);
      } else {
        setError(result.message || "Failed to save key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    }
  };

  const handleSetActive = async () => {
    try {
      await setActive(provider.id as ProviderType);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set active provider",
      );
    }
  };

  return (
    <div
      className={`relative rounded-xl p-4 transition-all ${
        disabled
          ? "glass-surface opacity-60"
          : isActive
            ? "glass-panel border-primary/50 glow-soft"
            : "glass-surface hover:border-border"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{provider.name}</span>
          {isActive && (
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              <Check size={10} />
              Active
            </span>
          )}
          {isComingSoon && (
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              <Zap size={10} />
              Soon
            </span>
          )}
        </div>

        {/* Actions */}
        {!disabled && !isComingSoon && (
          <div className="flex shrink-0 items-center gap-2">
            {/* "Use" button — shown for configured but not active providers */}
            {isConfigured && !isActive && (
              <button
                type="button"
                onClick={handleSetActive}
                disabled={isSettingActive}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {isSettingActive ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Use"
                )}
              </button>
            )}

            {/* Key management (BYOK providers only) */}
            {!isOmniCredits && (
              <>
                {provider.api_key_url && !isConfigured && (
                  <a
                    href={provider.api_key_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text"
                  >
                    Get Key
                    <ExternalLink size={12} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(!showForm)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    showForm
                      ? "bg-surface-elevated text-text"
                      : isConfigured
                        ? "text-muted hover:text-text"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  <Key size={12} />
                  {isConfigured ? "Update" : "Connect"}
                </button>
                {isConfigured &&
                  (showRemoveConfirm ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {isRemoving ? "Removing..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRemoveConfirm(false)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(true)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-red-400"
                      title="Remove API key"
                    >
                      <Trash2 size={12} />
                    </button>
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Description + key hint */}
      <p className="mt-1 text-sm text-muted">{provider.description}</p>
      {isConfigured && provider.keyHint && (
        <p className="mt-1 text-xs text-muted/60">•••• {provider.keyHint}</p>
      )}
      {isOmniCredits && isConfigured && (
        <p className="mt-1 text-xs text-muted/60">Powered by your account</p>
      )}

      {/* Key input form */}
      {showForm && !disabled && !isOmniCredits && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${provider.name} API key`}
                className="glass-input w-full rounded-lg py-2 pl-3 pr-9 text-sm text-text"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted hover:text-text"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={!apiKey.trim() || isPending}
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
          {error && <p className="break-words text-xs text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
