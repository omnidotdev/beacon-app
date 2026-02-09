import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  useConversations,
  useDeleteConversation,
  useUpdateConversationTitle,
} from "@/hooks";

interface ConversationListProps {
  onNavigate?: () => void;
}

function ConversationList({ onNavigate }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();
  const updateTitle = useUpdateConversationTitle();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get conversation ID from URL search params
  const search = useSearch({ strict: false }) as { c?: string };
  const activeId = search.c;

  const startEditing = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
    // Focus the input after render
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commitRename = () => {
    if (!editingId) return;

    const trimmed = editValue.trim();
    if (
      trimmed &&
      trimmed !== conversations?.find((c) => c.id === editingId)?.title
    ) {
      updateTitle.mutate({ id: editingId, title: trimmed });
    }

    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
        <span className="inline-flex gap-1">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </span>
        <span>Loading</span>
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-2 rounded-full bg-surface-elevated p-3">
          <MessageSquare size={20} className="text-muted/50" />
        </div>
        <p className="text-sm text-muted/70">No conversations yet</p>
        <p className="mt-1 text-xs text-muted/50">
          Start chatting to create one
        </p>
      </div>
    );
  }

  // Group conversations by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; conversations: typeof conversations }[] = [];
  const todayConvos = conversations.filter(
    (c) => new Date(c.updatedAt) >= today,
  );
  const yesterdayConvos = conversations.filter(
    (c) => new Date(c.updatedAt) >= yesterday && new Date(c.updatedAt) < today,
  );
  const olderConvos = conversations.filter(
    (c) => new Date(c.updatedAt) < yesterday,
  );

  if (todayConvos.length)
    groups.push({ label: "Today", conversations: todayConvos });
  if (yesterdayConvos.length)
    groups.push({ label: "Yesterday", conversations: yesterdayConvos });
  if (olderConvos.length)
    groups.push({ label: "Older", conversations: olderConvos });

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted/50">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.conversations.map((conversation) => {
              const isActive = activeId === conversation.id;
              const isEditing = editingId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center rounded-lg transition-all ${
                    isActive ? "nav-active" : "hover:bg-surface-elevated"
                  }`}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={commitRename}
                      className="flex-1 truncate rounded bg-surface-elevated px-3 py-2 text-sm text-text outline-none ring-1 ring-accent"
                    />
                  ) : (
                    <Link
                      to="/chat"
                      search={{ c: conversation.id }}
                      onClick={onNavigate}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        startEditing(conversation.id, conversation.title);
                      }}
                      className="flex-1 truncate px-3 py-2 text-sm text-text"
                    >
                      {conversation.title}
                    </Link>
                  )}
                  {!isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(conversation.id, conversation.title)
                        }
                        className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
                        title="Rename conversation"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const wasActive = activeId === conversation.id;
                          deleteConversation.mutate(conversation.id, {
                            onSuccess: () => {
                              if (wasActive) {
                                navigate({ to: "/chat", search: {} });
                              }
                            },
                          });
                        }}
                        className="mr-1 rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ConversationList;
