import { createFileRoute } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useInstalledSkills, useToggleSkill, useUninstallSkill } from "@/hooks";
import type { Skill } from "@/lib/api";

export const Route = createFileRoute("/_auth/skills")({
  component: SkillsPage,
});

function SkillsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="glass-surface border-b border-border/50 px-6 py-4">
        <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-xl font-semibold text-transparent">
          Skills
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <InstalledSkillsTab />
      </div>
    </div>
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
        description="Skills extend your assistant's capabilities"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
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

interface SkillCardProps {
  skill: Skill;
  onToggle?: () => void;
  onUninstall?: () => void;
  isLoading?: boolean;
}

function SkillCard({
  skill,
  onToggle,
  onUninstall,
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
        {skill.enabled !== undefined && (
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
        <button
          type="button"
          onClick={onUninstall}
          disabled={isLoading}
          className="btn-glass flex-1 rounded-xl py-2 text-sm text-muted hover:border-red-500/50 hover:text-red-400"
        >
          Uninstall
        </button>
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
    <div className="glass-panel rounded-2xl border-red-500/20 bg-red-500/5 p-6 text-center">
      <p className="break-words text-red-400">Error: {message}</p>
      <p className="mt-2 text-sm text-muted">
        Make sure the Beacon gateway is running
      </p>
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
