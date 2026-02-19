import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  Brain,
  Clock,
  Loader2,
  Pin,
  PinOff,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDeleteMemory, useMemories, useUpdateMemory } from "@/hooks";
import { isCloudDeployment } from "@/lib/api";
import type { Memory, MemoryCategory } from "@/lib/api/memories";
import createMetaTags from "@/lib/util/createMetaTags";

export const Route = createFileRoute("/_auth/memories")({
  head: () => createMetaTags({ title: "Memories" }),
  component: MemoriesPage,
});

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "preference", label: "Preference" },
  { value: "fact", label: "Fact" },
  { value: "correction", label: "Correction" },
  { value: "general", label: "General" },
];

function MemoriesPage() {
  const { session } = useRouteContext({ from: "__root__" });
  const isCloud = isCloudDeployment();
  const isAuthenticated = isCloud && !!session?.user;

  // Gate behind cloud auth
  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return <MemoriesContent />;
}

function AuthGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="glass-panel mb-4 rounded-full p-4">
        <Brain size={28} className="text-primary" />
      </div>
      <h2 className="font-semibold text-text">Memory Sync</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Sign in with your Omni account to sync and manage memories across
        devices
      </p>
    </div>
  );
}

function MemoriesContent() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pass undefined for "all" so the API returns everything
  const categoryFilter = activeCategory === "all" ? undefined : activeCategory;
  const { data: memories, isLoading, error, refetch } = useMemories(categoryFilter);

  // Filter by search query client-side
  const filteredMemories = useMemo(() => {
    if (!memories) return [];
    if (!searchQuery.trim()) return memories;

    const query = searchQuery.toLowerCase();
    return memories.filter(
      (m) =>
        m.content.toLowerCase().includes(query) ||
        parseTags(m.tags).some((t) => t.toLowerCase().includes(query)),
    );
  }, [memories, searchQuery]);

  // Sort: pinned first, then by updatedAt descending
  const sortedMemories = useMemo(() => {
    return [...filteredMemories].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredMemories]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="glass-surface border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="bg-gradient-to-r from-text to-text/70 bg-clip-text text-xl font-semibold text-transparent">
            Memories
          </h1>
          {memories && (
            <span className="text-sm text-muted">
              {memories.length} {memories.length === 1 ? "memory" : "memories"}
            </span>
          )}
        </div>
      </header>

      {/* Category filter tabs */}
      <div className="border-b border-border/50 px-6">
        <div className="flex gap-6">
          {CATEGORIES.map((cat) => (
            <CategoryTab
              key={cat.value}
              active={activeCategory === cat.value}
              onClick={() => setActiveCategory(cat.value)}
            >
              {cat.label}
            </CategoryTab>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="border-b border-border/50 px-6 py-4">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50"
          />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : sortedMemories.length === 0 ? (
          <EmptyState
            hasSearch={!!searchQuery.trim()}
            hasFilter={activeCategory !== "all"}
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {sortedMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function MemoryCard({ memory }: { memory: Memory }) {
  const updateMemory = useUpdateMemory();
  const deleteMutation = useDeleteMemory();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tags = parseTags(memory.tags);
  const updatedDate = formatRelativeDate(memory.updatedAt);

  const handleTogglePin = () => {
    updateMemory.mutate(
      {
        gatewayMemoryId: memory.gatewayMemoryId,
        pinned: !memory.pinned,
      },
      {
        onError: (err) => {
          toast.error(err.message || "Failed to update memory");
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(memory.gatewayMemoryId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        toast.success("Memory deleted");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete memory");
      },
    });
  };

  return (
    <div
      className={`glass-panel rounded-2xl p-5 transition-all ${
        memory.pinned ? "border-primary/30 glow-soft" : ""
      }`}
    >
      {/* Header: category badge + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={memory.category as MemoryCategory} />
          {memory.pinned && (
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              <Pin size={10} />
              Pinned
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Pin/unpin toggle */}
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={updateMemory.isPending}
            className={`rounded-lg p-1.5 text-sm transition-colors ${
              memory.pinned
                ? "text-primary hover:bg-primary/10"
                : "text-muted hover:bg-surface-elevated hover:text-text"
            }`}
            title={memory.pinned ? "Unpin" : "Pin"}
          >
            {updateMemory.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : memory.pinned ? (
              <PinOff size={14} />
            ) : (
              <Pin size={14} />
            )}
          </button>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-2 py-1 text-xs text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-elevated hover:text-red-400"
              title="Delete memory"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="mt-3 text-sm leading-relaxed text-text">{memory.content}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-surface-elevated px-2 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: timestamp + access count */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted/60">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {updatedDate}
        </span>
        {memory.accessCount > 0 && (
          <span>
            accessed {memory.accessCount}{" "}
            {memory.accessCount === 1 ? "time" : "times"}
          </span>
        )}
      </div>
    </div>
  );
}

const CATEGORY_STYLES: Record<string, string> = {
  preference: "bg-primary/15 text-primary",
  fact: "bg-accent/15 text-accent",
  correction: "bg-primary/10 text-primary/60",
  general: "bg-surface-elevated text-muted",
};

function CategoryBadge({ category }: { category: MemoryCategory }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general;

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {category}
    </span>
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
        <span>Loading memories</span>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-panel mx-auto max-w-sm rounded-2xl p-6 text-center">
      <p className="break-words text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-surface-elevated px-4 py-2 text-sm text-muted transition-colors hover:text-text"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({
  hasSearch,
  hasFilter,
}: {
  hasSearch: boolean;
  hasFilter: boolean;
}) {
  let title = "No memories yet";
  let description =
    "Memories are created as you chat. Beacon learns your preferences, facts, and corrections over time";

  if (hasSearch) {
    title = "No memories found";
    description = "Try a different search term";
  } else if (hasFilter) {
    title = "No memories in this category";
    description = "Try selecting a different category or view all memories";
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="glass-panel mb-4 rounded-full p-4">
        <Brain size={28} className="text-primary" />
      </div>
      <h3 className="font-semibold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}

// Utilities

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
