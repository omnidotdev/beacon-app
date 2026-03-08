import { createContext, type ReactNode, useContext, useRef } from "react";
import { type ApiClient, createApiClient, getExtendedClient } from "@/lib/api";

const ApiContext = createContext<ApiClient | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  accessToken?: string | null;
}

export function ApiProvider({ children, accessToken }: ApiProviderProps) {
  const clientRef = useRef<ApiClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = createApiClient();
  }

  // Set token synchronously during render so it's available before child
  // effects fire (useEffect runs child-first, which would race with the
  // WebSocket pre-connect in useChat)
  const extendedClient = getExtendedClient();
  extendedClient?.setAccessToken(accessToken ?? null);

  return (
    <ApiContext.Provider value={clientRef.current}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return client;
}
