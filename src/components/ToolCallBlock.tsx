import { useState } from "react";
import type { ToolCallState } from "@/hooks/useChat";

const TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  multi_search: "Searching sources",
  web_fetch: "Fetching page",
  memory_search: "Searching memory",
  memory_store: "Storing memory",
  read_file: "Reading file",
  write_file: "Writing file",
  bash: "Running command",
};

function friendlyLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

interface ToolCallBlockProps {
  toolCall: ToolCallState;
}

function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = Boolean(toolCall.output);

  const statusIcon =
    toolCall.status === "pending"
      ? null
      : toolCall.status === "done"
        ? "✓"
        : "✗";

  const statusColor =
    toolCall.status === "pending"
      ? "text-muted"
      : toolCall.status === "done"
        ? "text-teal-400"
        : "text-red-400";

  return (
    <div className="my-0.5 text-xs">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-left transition-colors ${
          hasDetail ? "cursor-pointer hover:bg-surface-elevated" : "cursor-default"
        } ${statusColor}`}
      >
        {toolCall.status === "pending" ? (
          <ToolSpinner />
        ) : (
          <span className="w-3 text-center">{statusIcon}</span>
        )}
        <span>{friendlyLabel(toolCall.name)}</span>
        {toolCall.invocation && (
          <span className="max-w-[200px] truncate text-muted/70">
            {toolCall.invocation.replace(`${toolCall.name}: `, "")}
          </span>
        )}
        {hasDetail && (
          <span className="ml-auto text-muted/50">{expanded ? "−" : "+"}</span>
        )}
      </button>
      {expanded && toolCall.output && (
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-surface-elevated px-3 py-2 font-mono text-[11px] text-muted/80">
          {toolCall.output.slice(0, 800)}
          {toolCall.output.length > 800 && "\n…"}
        </pre>
      )}
    </div>
  );
}

function ToolSpinner() {
  return (
    <span className="inline-flex w-3 items-center justify-center">
      <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
    </span>
  );
}

export default ToolCallBlock;
