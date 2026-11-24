import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useSyncExternalStore } from "react";

import type { Conversation, PersonaInfo } from "@/lib/api";
import * as localDb from "@/lib/db/conversations";
import { NO_PERSONA, NO_PERSONA_ID } from "@/lib/persona";
import { writePersonaCookie } from "@/lib/personaCookie";
import { useApi } from "./useApi";
import { markPersonaSynced } from "./useChat";

// Default personas embedded in the frontend as a fallback
// when the gateway is unreachable
const DEFAULT_PERSONAS: PersonaInfo[] = [
  {
    id: "orin",
    name: "Orin",
    tagline: "Your friendly otter guide",
    avatar: "/img/orin-avatar.png",
    accent_color: "#4ECDC4",
  },
  {
    id: "microcap",
    name: "Microcap",
    tagline: "100,000x loading...",
    avatar: "/img/mc-avatar.jpg",
    accent_color: "#FF69B4",
  },
];

const PERSONA_STORAGE_KEY = "beacon-active-persona";

function getStoredPersonaId(): string {
  if (typeof window === "undefined") return "orin";
  return localStorage.getItem(PERSONA_STORAGE_KEY) ?? "orin";
}

function storePersonaId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(PERSONA_STORAGE_KEY, id);
  }
}

/** The last persona the gateway confirmed, so a reload shows it right away */
const PERSONA_INFO_STORAGE_KEY = "beacon-active-persona-info";

function getStoredPersonaInfo(id: string): PersonaInfo | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const info = JSON.parse(
      localStorage.getItem(PERSONA_INFO_STORAGE_KEY) ?? "null",
    ) as PersonaInfo | null;
    return info?.id === id ? info : undefined;
  } catch {
    return undefined;
  }
}

function storePersonaInfo(info: PersonaInfo) {
  writePersonaCookie(info);
  try {
    localStorage.setItem(PERSONA_INFO_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Storage unavailable: the next load waits for the gateway instead
  }
}

const noopSubscribe = () => () => {};

/**
 * False during server rendering and hydration, true after. The stored persona
 * lives in localStorage, which the server cannot read, so anything derived
 * from it waits for hydration instead of rendering a default first
 */
function useIsHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Get current persona ID from query cache or localStorage
function useCurrentPersonaId(): string {
  const queryClient = useQueryClient();
  const persona = queryClient.getQueryData<{ id: string }>(["persona"]);
  return persona?.id ?? getStoredPersonaId();
}

export function useConversations() {
  const personaId = useCurrentPersonaId();

  // Use Dexie's live query for reactive IndexedDB updates
  const conversations = useLiveQuery(
    () => localDb.getConversations(personaId),
    [personaId],
    [] as Conversation[],
  );

  return {
    data: conversations,
    isLoading: conversations === undefined,
    isError: false,
    error: null,
  };
}

export function useCreateConversation() {
  const personaId = useCurrentPersonaId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      return localDb.createConversation(personaId, title);
    },
    onSuccess: () => {
      // Dexie live query auto-updates, but invalidate just in case
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      localDb.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUpdateConversationTitle() {
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      localDb.updateConversationTitle(id, title),
  });
}

export function usePersona() {
  const api = useApi();
  const isHydrated = useIsHydrated();
  const storedId = getStoredPersonaId();
  // What the server rendered: the persona this browser last used (cookie)
  const { persona: renderedPersona } = useRouteContext({
    strict: false,
  }) as { persona?: PersonaInfo | null };

  const query = useQuery({
    queryKey: ["persona"],
    queryFn: async () => {
      // Skip gateway sync for no-persona mode
      if (storedId === NO_PERSONA_ID) {
        return NO_PERSONA;
      }

      const persona = await api.getPersona();

      // Sync gateway to match stored preference
      if (persona.id !== storedId) {
        try {
          const switched = await api.switchPersona(storedId);
          markPersonaSynced(storedId);
          return switched;
        } catch {
          return persona;
        }
      }

      markPersonaSynced(persona.id);
      return persona;
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  // Show the stored persona right away: the one the gateway last confirmed,
  // else a built-in one with that id. A persona known only to the gateway
  // (e.g. from the marketplace) waits for it rather than flashing a default
  // first; the default stands in only when the gateway is unreachable
  const known =
    storedId === NO_PERSONA_ID
      ? NO_PERSONA
      : (getStoredPersonaInfo(storedId) ??
        DEFAULT_PERSONAS.find((p) => p.id === storedId));
  const fallback = known ?? (query.isError ? DEFAULT_PERSONAS[0] : undefined);

  // Remember the active persona (the gateway's, else the stored one) so the
  // next load, server render included, shows it immediately
  // Keyed by content: the stored copy is a new object on every render
  const remembered = query.data ?? known;
  const rememberedKey = remembered ? JSON.stringify(remembered) : null;
  useEffect(() => {
    if (isHydrated && rememberedKey) {
      storePersonaInfo(JSON.parse(rememberedKey) as PersonaInfo);
    }
  }, [isHydrated, rememberedKey]);

  // Until hydrated, match the server exactly; after, the stored persona (which
  // the cookie mirrors, so the two agree) until the gateway confirms it
  const data = isHydrated
    ? (query.data ?? fallback)
    : (renderedPersona ?? undefined);

  return {
    ...query,
    data,
    isLoading: !data,
  };
}

export function usePersonas() {
  const api = useApi();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["personas"],
    queryFn: () => api.getPersonas(),
    staleTime: 60000,
    retry: 1,
    retryDelay: 2000,
  });

  const switchPersona = async (personaId: string) => {
    storePersonaId(personaId);

    if (personaId === NO_PERSONA_ID) {
      markPersonaSynced(NO_PERSONA_ID);
      storePersonaInfo(NO_PERSONA);
      queryClient.setQueryData(["persona"], NO_PERSONA);
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      return;
    }

    try {
      const newPersona = await api.switchPersona(personaId);
      markPersonaSynced(personaId);
      storePersonaInfo(newPersona);
      queryClient.setQueryData(["persona"], newPersona);
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    } catch {
      // Gateway unreachable — fall back to local switch
      const fallback = [
        ...DEFAULT_PERSONAS,
        ...(query.data?.personas ?? []),
      ].find((p) => p.id === personaId);
      if (fallback) {
        queryClient.setQueryData(["persona"], fallback);
      }
    }
  };

  // Fall back to default personas when gateway is unreachable
  const raw =
    query.data?.personas ?? (query.isError ? DEFAULT_PERSONAS : undefined);
  // Filter hidden personas and pin Orin to the top
  const personas = raw?.sort((a, b) =>
    a.id === "orin" ? -1 : b.id === "orin" ? 1 : 0,
  );
  const activeId =
    query.data?.active_id ?? (query.isError ? getStoredPersonaId() : undefined);

  return {
    data: personas,
    activeId,
    isLoading: query.isLoading,
    isError: query.isError && !personas?.length,
    error: query.error,
    refetch: query.refetch,
    switchPersona,
  };
}
