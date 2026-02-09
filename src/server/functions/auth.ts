import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";

import auth from "@/lib/auth/auth";
import {
  AUTH_BASE_URL,
  AUTH_CLIENT_ID,
  BASE_URL,
} from "@/lib/config/env.config";

/**
 * Fetch the current user session
 */
export const fetchSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) return { session: null };

  // Get ID token (JWT) for downstream API calls
  // The gateway validates JWTs against Gatekeeper's JWKS, so we need the
  // OIDC ID token (a signed JWT), not the opaque OAuth access token
  let accessToken: string | undefined;

  try {
    const tokenResult = await auth.api.getAccessToken({
      body: { providerId: "omni" },
      headers,
    });
    accessToken = tokenResult?.idToken ?? tokenResult?.accessToken;
  } catch (err) {
    console.error("[fetchSession] Error getting access token:", err);
  }

  return {
    session: {
      ...session,
      accessToken,
    },
  };
});

/**
 * Build the IDP end_session URL for federated logout
 */
export function getIdpLogoutUrl(): string | null {
  if (!AUTH_BASE_URL || !AUTH_CLIENT_ID) return null;

  const endSessionUrl = new URL(`${AUTH_BASE_URL}/oauth2/endsession`);
  endSessionUrl.searchParams.set("client_id", AUTH_CLIENT_ID);
  endSessionUrl.searchParams.set("post_logout_redirect_uri", `${BASE_URL}/login`);

  return endSessionUrl.toString();
}

/**
 * Fetch the IDP end_session URL (no auth required)
 *
 * Used by the login page to offer "Use a different account" after
 * consent denial, clearing the IDP session before retrying OAuth
 */
export const fetchIdpLogoutUrl = createServerFn().handler(async () => {
  return getIdpLogoutUrl();
});

/**
 * Sign out from the local session (server-side)
 * Returns the IDP logout URL for federated logout redirect
 */
export const signOutLocal = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();

    // Clear local session
    await auth.api.signOut({ headers: request.headers });

    // Return IDP logout URL for client-side redirect
    return { idpLogoutUrl: getIdpLogoutUrl() };
  },
);
