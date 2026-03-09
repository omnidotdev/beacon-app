import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { type ApiClient, createApiClient, getExtendedClient } from "@/lib/api";
import { fetchSession } from "@/server/functions/auth";

const ApiContext = createContext<ApiClient | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  accessToken?: string | null;
}

/** Parse exp claim from a JWT without verifying signature */
function getTokenExpMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp as number) * 1000;
  } catch {
    return null;
  }
}

/** Fetch a fresh access token from the server session */
async function refreshToken(): Promise<string | null> {
  try {
    const { session } = await fetchSession();
    return session?.accessToken ?? null;
  } catch {
    return null;
  }
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

  // Register the token refresher so the gateway client can fetch fresh
  // tokens on demand (e.g. on WS reconnect or HTTP 401)
  useEffect(() => {
    extendedClient?.setTokenRefresher(refreshToken);
    return () => extendedClient?.setTokenRefresher(null);
  }, [extendedClient]);

  // Proactively refresh the token before it expires
  useEffect(() => {
    if (!accessToken || !extendedClient) return;

    const expMs = getTokenExpMs(accessToken);
    if (!expMs) return;

    // Refresh 60s before expiry
    const refreshAt = expMs - Date.now() - 60_000;
    if (refreshAt <= 0) {
      // Already expired or about to — refresh immediately
      refreshToken().then((fresh) => {
        if (fresh) extendedClient.setAccessToken(fresh);
      });
      return;
    }

    const timer = setTimeout(async () => {
      const fresh = await refreshToken();
      if (fresh) extendedClient.setAccessToken(fresh);
    }, refreshAt);

    return () => clearTimeout(timer);
  }, [accessToken, extendedClient]);

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
