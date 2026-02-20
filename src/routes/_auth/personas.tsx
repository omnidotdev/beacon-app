import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Search, Sparkles, User } from "lucide-react";
import { useState } from "react";
import {
  useInstallMarketplacePersona,
  useMarketplacePersonas,
  useSearchMarketplacePersonas,
  useUninstallMarketplacePersona,
} from "@/hooks";
import { isCloudDeployment } from "@/lib/api";
import type { MarketplacePersona, PersonaSource } from "@/lib/api";

export const Route = createFileRoute("/_auth/personas")({
  component: PersonasPage,
});

type Tab = "installed" | "browse";

function PersonasPage() {
  const { session } = useRouteContext({ from: "__root__" });
  const isAuthenticated = isCloudDeployment() && !!session?.user;

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return <PersonasContent />;
}

function AuthGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="glass-panel mb-4 rounded-full p-4">
        <Sparkles size={28} className="text-primary" />
      </div>
      <h2 className="font-semibold text-text">Persona Marketplace</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Sign in with your Omni account to browse and install personas
      </p>
    </div>
  );
}

function PersonasContent() {
  const [activeTab, setActiveTab] = useState<Tab>("installed");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="glass-surface border-b border-border/50 px-6 py-4">
        <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-xl font-semibold text-transparent">
          Personas
        </h1>
      </header>

      <div className="border-b border-border/50 px-6">
        <div className="flex gap-6">
          <TabButton
            active={activeTab === "installed"}
            onClick={() => setActiveTab("installed")}
          >
            Installed
          </TabButton>
          <TabButton
            active={activeTab === "browse"}
            onClick={() => setActiveTab("browse")}
          >
            Marketplace
          </TabButton>
        </div>
      </div>

      {activeTab === "browse" && (
        <div className="border-b border-border/50 px-6 py-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50"
            />
            <input
              type="text"
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "installed" ? (
          <InstalledPersonasTab />
        ) : (
          <BrowsePersonasTab searchQuery={searchQuery} />
        )}
        <CustomPersonaTeaser />
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 py-3 text-sm font-medium transition-all ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function InstalledPersonasTab() {
  const { data, isLoading, error } = useMarketplacePersonas();
  const uninstallPersona = useUninstallMarketplacePersona();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data?.personas.length) {
    return (
      <EmptyState
        title="No personas installed"
        description="Browse the marketplace to discover and install personas"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.personas.map((persona) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          installed
          onUninstall={() => uninstallPersona.mutate(persona.id)}
          isLoading={
            uninstallPersona.isPending &&
            uninstallPersona.variables === persona.id
          }
        />
      ))}
    </div>
  );
}

function BrowsePersonasTab({ searchQuery }: { searchQuery: string }) {
  const { data, isLoading, error } = useSearchMarketplacePersonas(
    searchQuery ? { q: searchQuery } : {},
  );
  const { data: installed } = useMarketplacePersonas();
  const installPersona = useInstallMarketplacePersona();

  const installedIds = new Set(installed?.personas.map((p) => p.id) ?? []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data?.personas.length) {
    return (
      <EmptyState
        title="No personas found"
        description={
          searchQuery
            ? "Try a different search term"
            : "No personas available in the marketplace"
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.personas.map((persona) => {
        const isInstalled = installedIds.has(persona.id);
        return (
          <PersonaCard
            key={persona.id}
            persona={persona}
            installed={isInstalled}
            onInstall={() => {
              const source = persona.source as Extract<
                PersonaSource,
                { type: "manifold" }
              >;
              if (source.type === "manifold") {
                installPersona.mutate({
                  namespace: source.namespace,
                  persona_id: persona.id,
                });
              }
            }}
            isLoading={
              installPersona.isPending &&
              installPersona.variables?.persona_id === persona.id
            }
          />
        );
      })}
    </div>
  );
}

interface PersonaCardProps {
  persona: MarketplacePersona;
  installed: boolean;
  onUninstall?: () => void;
  onInstall?: () => void;
  isLoading?: boolean;
}

function PersonaCard({
  persona,
  installed,
  onUninstall,
  onInstall,
  isLoading,
}: PersonaCardProps) {
  const accentColor = persona.accent_color ?? "#6366f1";

  return (
    <div className="glass-panel group rounded-2xl p-5 transition-all hover:glow-soft">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
          }}
        >
          {persona.avatar ? (
            <img
              src={persona.avatar}
              alt={persona.name}
              className="h-full w-full object-cover"
            />
          ) : persona.icon ? (
            <span className="text-2xl">{persona.icon}</span>
          ) : (
            <User size={24} style={{ color: accentColor }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text">{persona.name}</h3>
          {persona.tagline && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {persona.tagline}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {installed ? (
          <button
            type="button"
            onClick={onUninstall}
            disabled={isLoading}
            className="btn-glass flex-1 rounded-xl py-2 text-sm text-muted hover:border-red-500/50 hover:text-red-400"
          >
            Uninstall
          </button>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            disabled={isLoading}
            className="btn-primary flex-1 rounded-xl py-2 text-sm disabled:opacity-50"
          >
            {isLoading ? "Installing..." : "Install"}
          </button>
        )}
      </div>
    </div>
  );
}

function CustomPersonaTeaser() {
  return (
    <div className="mt-8 flex items-center gap-4 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Sparkles size={18} className="text-primary/70" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">Create custom personas</p>
        <p className="mt-0.5 text-xs text-muted">
          Build and configure your own personas with custom instructions, tools,
          and styles — coming soon
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-muted">
        <span className="inline-flex gap-1">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </span>
        <span>Loading personas</span>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-panel mx-auto max-w-sm rounded-2xl p-6 text-center">
      <p className="break-words text-sm text-muted">{message}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="glass-panel mb-4 rounded-full p-4">
        <Sparkles size={28} className="text-primary" />
      </div>
      <h3 className="font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
