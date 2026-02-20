import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ChevronRight, MessageSquare, Mic, Settings, VenetianMask, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useApi, useConversations } from "@/hooks";
import type { SystemStatus } from "@/lib/api";
import createMetaTags from "@/lib/util/createMetaTags";

export const Route = createFileRoute("/_auth/")({
  head: () => createMetaTags({ title: "Dashboard" }),
  component: DashboardHome,
});

function DashboardHome() {
  const api = useApi();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const { data: conversations } = useConversations();

  useEffect(() => {
    api
      .getStatus()
      .then(setStatus)
      .catch(() => {});
  }, [api]);

  const sessionCount = conversations?.length ?? 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <header className="mb-10 md:hidden">
        <h1 className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-bold text-transparent">
          Welcome to Beacon
        </h1>
        <p className="mt-2 text-muted/70">Your AI command center</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="Active Sessions"
          value={sessionCount.toString()}
          icon={<MessageSquare size={24} />}
        />
        <StatCard
          title="Voice"
          value="Coming soon"
          icon={<Mic size={24} />}
        />
      </div>

      {/* Quick actions */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted/60">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Link
            to="/chat"
            className="glass-panel group flex flex-col items-center gap-2 rounded-2xl py-4 transition-all hover:glow-soft"
          >
            <MessageSquare
              size={20}
              className="text-muted/70 transition-colors group-hover:text-primary"
            />
            <span className="text-sm text-muted">New Chat</span>
          </Link>
          <Link
            to="/settings"
            className="glass-panel group flex flex-col items-center gap-2 rounded-2xl py-4 transition-all hover:glow-soft"
          >
            <Settings
              size={20}
              className="text-muted/70 transition-colors group-hover:text-primary"
            />
            <span className="text-sm text-muted">Settings</span>
          </Link>
        </div>
      </section>

      {/* Explore features */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted/60">
          Explore
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            to="/memories"
            icon={<Brain size={20} />}
            title="Memories"
            description="Recall and manage what Beacon remembers about you"
          />
          <FeatureCard
            to="/skills"
            icon={<Zap size={20} />}
            title="Skills"
            description="Install and configure tools that extend Beacon's abilities"
          />
          <FeatureCard
            to="/personas"
            icon={<VenetianMask size={20} />}
            title="Personas"
            description="Shape Beacon's personality and communication style"
          />
        </div>
      </section>

      {/* Model info */}
      {status?.model && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted/60">
            Current Model
          </h2>
          <div className="glass-panel inline-flex items-center gap-3 rounded-xl px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-primary glow-primary" />
            <div>
              <p className="text-sm font-medium text-text">{status.model.id}</p>
              <p className="text-xs text-muted">
                Provider: {status.model.provider}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

interface FeatureCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ to, icon, title, description }: FeatureCardProps) {
  return (
    <Link
      to={to}
      className="glass-panel group flex items-center gap-4 rounded-2xl p-4 transition-all hover:glow-soft"
    >
      <span className="text-muted/70 transition-colors group-hover:text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text">{title}</p>
        <p className="truncate text-xs text-muted">{description}</p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-muted/40 transition-colors group-hover:text-primary"
      />
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
  accent?: boolean;
}

function StatCard({ title, value, icon, href, accent }: StatCardProps) {
  // Use smaller text for longer values like "Unavailable"
  const valueSize = value.length > 6 ? "text-xl" : "text-3xl";
  const interactive = !!href;
  const content = (
    <div
      className={`glass-panel flex h-full flex-col rounded-2xl p-6 ${interactive ? "group transition-all hover:glow-soft" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`${accent ? "text-primary" : "text-muted/70"} ${interactive ? "transition-colors group-hover:text-primary" : ""}`}
        >
          {icon}
        </span>
        <span className={`${valueSize} font-bold text-text`}>{value}</span>
      </div>
      <p className="mt-auto pt-3 text-sm text-muted">{title}</p>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
