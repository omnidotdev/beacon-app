import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Search, Zap } from "lucide-react";
import { useState } from "react";
import {
  useInstalledSkills,
  useInstallSkill,
  useSearchSkills,
  useToggleSkill,
  useUninstallSkill,
} from "@/hooks";
import type { Skill, SkillSource } from "@/lib/api";
import { isCloudDeployment } from "@/lib/api";

export const Route = createFileRoute("/_auth/skills")({
  component: SkillsPage,
});

type Tab = "installed" | "browse";

function SkillsPage() {
  const { session } = useRouteContext({ from: "__root__" });
  const isAuthenticated = isCloudDeployment() && !!session?.user;

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return <SkillsContent />;
}

function AuthGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="glass-panel mb-4 rounded-full p-4">
        <Zap size={28} className="text-primary" />
      </div>
      <h2 className="font-semibold text-text">Skills</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Sign in with your Omni account to browse and install skills
      </p>
    </div>
  );
}

function SkillsContent() {
  const [activeTab, setActiveTab] = useState<Tab>("installed");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-5 pb-1 pt-4">
        <Zap size={20} className="text-primary/70" />
      </div>

      <div className="px-6">
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
        <div className="px-6 py-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50"
            />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "installed" ? (
          <InstalledSkillsTab />
        ) : (
          <BrowseSkillsTab searchQuery={searchQuery} />
        )}
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

function InstalledSkillsTab() {
  const { data, isLoading, error } = useInstalledSkills();
  const toggleSkill = useToggleSkill();
  const uninstallSkill = useUninstallSkill();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data?.skills.length) {
    return (
      <EmptyState
        title="No skills installed"
        description="Browse the marketplace to discover and install skills"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          installed
          onToggle={() =>
            toggleSkill.mutate({ skillId: skill.id, enabled: !skill.enabled })
          }
          onUninstall={() => uninstallSkill.mutate(skill.id)}
          isLoading={
            toggleSkill.isPending && toggleSkill.variables?.skillId === skill.id
          }
        />
      ))}
    </div>
  );
}

function BrowseSkillsTab({ searchQuery }: { searchQuery: string }) {
  const { data, isLoading, error } = useSearchSkills(
    searchQuery ? { q: searchQuery } : {},
  );
  const { data: installed } = useInstalledSkills();
  const installSkill = useInstallSkill();

  const installedIds = new Set(installed?.skills.map((s) => s.id) ?? []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data?.skills.length) {
    return (
      <EmptyState
        title="No skills found"
        description={
          searchQuery
            ? "Try a different search term"
            : "No skills available in the marketplace"
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.skills.map((skill) => {
        const isInstalled = installedIds.has(skill.id);
        return (
          <SkillCard
            key={skill.id}
            skill={skill}
            installed={isInstalled}
            onInstall={() => {
              const source = skill.source as Extract<
                SkillSource,
                { type: "manifold" }
              >;
              if (source.type === "manifold") {
                installSkill.mutate({
                  namespace: source.namespace,
                  skill_id: skill.id,
                });
              }
            }}
            isLoading={
              installSkill.isPending &&
              installSkill.variables?.skill_id === skill.id
            }
          />
        );
      })}
    </div>
  );
}

interface SkillCardProps {
  skill: Skill;
  installed: boolean;
  onToggle?: () => void;
  onUninstall?: () => void;
  onInstall?: () => void;
  isLoading?: boolean;
}

function SkillCard({
  skill,
  installed,
  onToggle,
  onUninstall,
  onInstall,
  isLoading,
}: SkillCardProps) {
  return (
    <div className="glass-panel group rounded-2xl p-5 transition-all hover:glow-soft">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Zap size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text">{skill.name}</h3>
            {skill.author && (
              <p className="text-xs text-muted">by {skill.author}</p>
            )}
          </div>
        </div>
        {installed && skill.enabled !== undefined && (
          <button
            type="button"
            onClick={onToggle}
            disabled={isLoading}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              skill.enabled ? "bg-primary" : "bg-muted/30"
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                skill.enabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted">
        {skill.description}
      </p>

      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-surface-elevated px-2 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

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

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-muted">
        <span className="inline-flex gap-1">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </span>
        <span>Loading skills</span>
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
        <Zap size={28} className="text-primary" />
      </div>
      <h3 className="font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
