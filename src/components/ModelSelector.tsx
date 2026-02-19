import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useApi, useConfigureProvider, useProviders } from "@/hooks";
import type { SystemStatus } from "@/lib/api";
import type { ModelOption } from "@/lib/models";
import {
  getAvailableModels,
  getModelName,
  getProviderDisplayName,
} from "@/lib/models";

const STORAGE_KEY = "beacon-selected-model";

function ModelSelector() {
  const api = useApi();
  const { data: providersData } = useProviders();
  const { mutateAsync: configure, isPending } = useConfigureProvider();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(!!localStorage.getItem(STORAGE_KEY));

  // Fetch current model from gateway status
  useEffect(() => {
    api
      .getStatus()
      .then((s) => {
        setStatus(s);
        // Seed from server if no local selection
        if (!seededRef.current && s.model?.id) {
          seededRef.current = true;
          setSelectedModelId(s.model.id);
        }
      })
      .catch(() => {});
  }, [api]);

  // Determine current model display name
  const currentModelId = selectedModelId ?? status?.model?.id;
  const displayName = currentModelId ? getModelName(currentModelId) : null;

  // Build available models grouped by configured providers
  const configuredProviderIds =
    providersData?.providers
      .filter((p) => p.status === "configured")
      .map((p) => p.id) ?? [];

  const grouped = getAvailableModels(configuredProviderIds);
  const groupEntries = Object.entries(grouped);

  const handleSelect = async (model: ModelOption) => {
    if (model.id === currentModelId) {
      setIsOpen(false);
      return;
    }

    const previousModelId = selectedModelId;

    // Optimistic update
    setSelectedModelId(model.id);
    localStorage.setItem(STORAGE_KEY, model.id);
    setIsOpen(false);

    try {
      await configure({ provider: model.provider, model: model.id });
    } catch {
      // Rollback
      setSelectedModelId(previousModelId);
      if (previousModelId) {
        localStorage.setItem(STORAGE_KEY, previousModelId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      toast.error("Failed to switch model");
    }
  };

  // Auto-select first available model when none is selected (local only, no API call)
  const firstModel = groupEntries[0]?.[1]?.[0];
  useEffect(() => {
    if (!currentModelId && firstModel) {
      setSelectedModelId(firstModel.id);
      localStorage.setItem(STORAGE_KEY, firstModel.id);
    }
  }, [currentModelId, firstModel?.id]);

  // No models available if no providers configured
  if (groupEntries.length === 0 || !displayName) return null;

  return (
    <div ref={dropdownRef} className="relative mb-2 flex justify-end">
      <ModelPill
        name={displayName}
        isOpen={isOpen}
        isPending={isPending}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <ModelDropdown
          groups={groupEntries}
          currentModelId={currentModelId}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          containerRef={dropdownRef}
        />
      )}
    </div>
  );
}

function ModelPill({
  name,
  isOpen,
  isPending,
  onToggle,
}: {
  name: string;
  isOpen: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
        isOpen ? "bg-surface-elevated text-text" : "text-muted hover:text-text"
      } disabled:opacity-50`}
    >
      {isPending ? (
        <span className="inline-flex gap-0.5">
          <span className="streaming-dot" />
          <span className="streaming-dot" />
          <span className="streaming-dot" />
        </span>
      ) : (
        <>
          {name}
          <ChevronDown
            size={12}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </>
      )}
    </button>
  );
}

function ModelDropdown({
  groups,
  currentModelId,
  onSelect,
  onClose,
  containerRef,
}: {
  groups: [string, ModelOption[]][];
  currentModelId?: string | null;
  onSelect: (model: ModelOption) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, containerRef]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[180px] overflow-hidden rounded-xl border border-border bg-[var(--background)] p-1 shadow-lg">
      {groups.map(([providerId, models], i) => (
        <div key={providerId}>
          {i > 0 && <div className="mx-2 my-1 border-t border-border/30" />}
          <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted/50">
            {getProviderDisplayName(providerId)}
          </div>
          {models.map((model) => {
            const isSelected = model.id === currentModelId;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "text-primary"
                    : "text-text hover:bg-surface-elevated"
                }`}
              >
                {model.name}
                {isSelected && <Check size={14} className="text-primary" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default ModelSelector;
