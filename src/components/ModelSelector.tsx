import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useManagedModels, useProviders } from "@/hooks";
import type { ModelOption } from "@/lib/models";
import {
  getAvailableModels,
  getDefaultModelId,
  getModelName,
  getProviderDisplayName,
  resolveSelection,
} from "@/lib/models";

const STORAGE_KEY = "beacon-selected-model";

const readStored = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStored = (modelId: string | null) => {
  try {
    if (modelId) localStorage.setItem(STORAGE_KEY, modelId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private window); the selection lives in state only
  }
};

function ModelSelector() {
  const { data: providersData } = useProviders();
  const [isOpen, setIsOpen] = useState(false);
  // An explicit pick; null means "the default", which sends no override so the
  // gateway picks the model for the user's plan
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    readStored,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const configuredProviderIds =
    providersData?.providers
      .filter((p) => p.status === "configured")
      .map((p) => p.id) ?? [];

  const managedEnabled = configuredProviderIds.includes("omni_credits");
  const { data: managed, isFetched: managedFetched } =
    useManagedModels(managedEnabled);

  const grouped = getAvailableModels(configuredProviderIds, managed);
  const groupEntries = Object.entries(grouped);
  const defaultModelId = getDefaultModelId(grouped, managed);

  // Drop a stored pick that is no longer offered (the gateway refuses a model
  // outside Beacon's policy), once the lists it is checked against have loaded
  const listsLoaded = !!providersData && (!managedEnabled || managedFetched);
  useEffect(() => {
    if (!listsLoaded || !selectedModelId) return;
    const resolved = resolveSelection(selectedModelId, grouped, !!managed);
    if (resolved !== selectedModelId) {
      setSelectedModelId(resolved);
      writeStored(resolved);
    }
  }, [listsLoaded, selectedModelId, grouped, managed]);

  // Without a managed list (BYOK only) there is no gateway default to defer
  // to, so the first BYOK model is pinned as before
  const firstModelId = groupEntries[0]?.[1]?.[0]?.id;
  const hasManaged = !!grouped.omni_credits;
  useEffect(() => {
    if (listsLoaded && !hasManaged && !selectedModelId && firstModelId) {
      setSelectedModelId(firstModelId);
      writeStored(firstModelId);
    }
  }, [listsLoaded, hasManaged, selectedModelId, firstModelId]);

  const currentModelId = selectedModelId ?? defaultModelId;
  const displayName = currentModelId
    ? getModelName(currentModelId, grouped)
    : null;

  const handleSelect = (model: ModelOption) => {
    // Picking the managed default clears the override so plan changes keep
    // applying
    const next =
      hasManaged && model.id === managed?.default_model ? null : model.id;
    setSelectedModelId(next);
    writeStored(next);
    setIsOpen(false);
  };

  // No models available if no providers configured
  if (groupEntries.length === 0 || !displayName) return null;

  return (
    <div ref={dropdownRef} className="relative mb-2 flex justify-end">
      <ModelPill
        name={displayName}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <ModelDropdown
          groups={groupEntries}
          currentModelId={currentModelId}
          defaultModelId={defaultModelId}
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
  onToggle,
}: {
  name: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
        isOpen ? "bg-surface-elevated text-text" : "text-muted hover:text-text"
      }`}
    >
      {name}
      <ChevronDown
        size={12}
        className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function ModelDropdown({
  groups,
  currentModelId,
  defaultModelId,
  onSelect,
  onClose,
  containerRef,
}: {
  groups: [string, ModelOption[]][];
  currentModelId?: string | null;
  defaultModelId?: string | null;
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
          {i > 0 && <div className="mx-2 my-1 border-t border-subtle" />}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted/50">
              {getProviderDisplayName(providerId)}
            </span>
            {providerId === "omni_credits" && (
              <a
                href="https://synapse.omni.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[10px] text-primary/70 hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Learn more
                <ExternalLink size={9} />
              </a>
            )}
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
                <span>
                  {model.name}
                  {model.id === defaultModelId && (
                    <span className="ml-1.5 text-xs text-muted">Default</span>
                  )}
                </span>
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
