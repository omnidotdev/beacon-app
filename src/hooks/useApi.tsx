import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { type ApiClient, createApiClient, getExtendedClient } from "@/lib/api";

const ApiContext = createContext<ApiClient | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  accessToken?: string | null;
}

export function ApiProvider({ children, accessToken }: ApiProviderProps) {
  const client = useMemo(() => createApiClient(), []);

  // Sync access token to gateway client for authenticated API calls
  useEffect(() => {
    const extendedClient = getExtendedClient();
    extendedClient?.setAccessToken(accessToken ?? null);
  }, [accessToken]);

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return client;
}
