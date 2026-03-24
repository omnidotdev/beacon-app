import {
  ensureFreshAccessToken,
  isInvalidGrant,
} from "@omnidotdev/providers/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { decodeJwt } from "jose";

import auth from "@/lib/auth/auth";
import {
  AUTH_BASE_URL,
  AUTH_CLIENT_ID,
  BASE_URL,
} from "@/lib/config/env.config";
import type { Organization } from "@/lib/context/organization.context";
import { parseOrganizationClaims } from "@/lib/context/organization.context";

/** Check if a JWT's exp claim has passed */
function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp as number) * 1000 < Date.now();
  } catch {
    return false;
  }
}

/**
 * Fetch the current user session
 */
export const fetchSession = createServerFn().handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) return { session: null, organizations: [] as Organization[] };

  // Get ID token (JWT) for downstream API calls
  // The gateway validates JWTs against Gatekeeper's JWKS, so we need the
  // OIDC ID token (a signed JWT), not the opaque OAuth access token
  let accessToken: string | undefined;
  let organizations: Organization[] = [];

  try {
    const tokenResult = await ensureFreshAccessToken({
      getAccessToken: async () => {
        try {
          return await auth.api.getAccessToken({
            body: { providerId: "omni" },
            headers,
          });
        } catch {
          return null;
        }
      },
      refreshToken: async () => {
        try {
          return await auth.api.refreshToken({
            body: { providerId: "omni" },
            headers,
          });
        } catch {
          return null;
        }
      },
    });

    accessToken = tokenResult?.idToken ?? tokenResult?.accessToken;

    // Decode org claims from the ID token — signature was already verified
    // during the OAuth flow; the token is retrieved from our own trusted
    // auth storage so re-verification is unnecessary
    if (tokenResult?.idToken) {
      const payload = decodeJwt(tokenResult.idToken);
      organizations = parseOrganizationClaims(
        payload as Record<string, unknown>,
      );
    }

    // ensureFreshAccessToken silently swallows refresh failures and returns
    // the original (expired) token. Detect that and force a second refresh.
    if (accessToken && isJwtExpired(accessToken)) {
      console.warn(
        "[fetchSession] id_token still expired after ensureFreshAccessToken, forcing refresh",
      );
      try {
        const refreshed = await auth.api.refreshToken({
          body: { providerId: "omni" },
          headers,
        });
        const freshToken = refreshed?.idToken ?? refreshed?.accessToken;
        if (freshToken && !isJwtExpired(freshToken)) {
          accessToken = freshToken;
        } else {
          console.error(
            "[fetchSession] forced refresh did not yield a fresh id_token",
            {
              hasIdToken: !!refreshed?.idToken,
              hasAccessToken: !!refreshed?.accessToken,
              stillExpired: freshToken ? isJwtExpired(freshToken) : "no token",
            },
          );
        }
      } catch (refreshErr) {
        console.error("[fetchSession] forced refresh failed:", refreshErr);

        const isBATokenError =
          refreshErr &&
          typeof refreshErr === "object" &&
          "body" in refreshErr &&
          typeof (refreshErr as { body: { code?: string } }).body?.code ===
            "string" &&
          (refreshErr as { body: { code: string } }).body.code ===
            "FAILED_TO_GET_ACCESS_TOKEN";

        if (isInvalidGrant(refreshErr) || isBATokenError) {
          try {
            await auth.api.signOut({ headers });
          } catch {
            // Sign-out may fail if session is already corrupt
          }
          return { session: null, organizations: [] as Organization[] };
        }
      }
    }
  } catch (err) {
    console.error("[fetchSession] Error getting access token:", err);

    const isBATokenError =
      err &&
      typeof err === "object" &&
      "body" in err &&
      typeof (err as { body: { code?: string } }).body?.code === "string" &&
      (err as { body: { code: string } }).body.code ===
        "FAILED_TO_GET_ACCESS_TOKEN";

    if (isInvalidGrant(err) || isBATokenError) {
      console.warn("[fetchSession] Invalid refresh token, clearing session");
      try {
        await auth.api.signOut({ headers });
      } catch {
        // Sign-out may fail if session is already corrupt
      }
      return { session: null, organizations: [] as Organization[] };
    }
  }

  return {
    session: {
      ...session,
      accessToken,
    },
    organizations,
  };
});

/**
 * Build the IDP end_session URL for federated logout
 */
function getIdpLogoutUrl(idTokenHint?: string): string | null {
  if (!AUTH_BASE_URL || !AUTH_CLIENT_ID) return null;

  const endSessionUrl = new URL(`${AUTH_BASE_URL}/oauth2/end-session`);
  endSessionUrl.searchParams.set("client_id", AUTH_CLIENT_ID);
  endSessionUrl.searchParams.set("post_logout_redirect_uri", BASE_URL ?? "");
  if (idTokenHint) {
    endSessionUrl.searchParams.set("id_token_hint", idTokenHint);
  }

  return endSessionUrl.toString();
}

/**
 * Sign out from the local session (server-side)
 * Returns the IDP logout URL for federated logout redirect
 */
export const signOutLocal = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();
    const headers = request.headers;

    // Grab the ID token before we destroy the local session
    let idToken: string | undefined;
    try {
      const tokenResult = await auth.api.getAccessToken({
        body: { providerId: "omni" },
        headers,
      });
      idToken = tokenResult?.idToken;
    } catch {
      // Token may already be expired — proceed with logout anyway
    }

    // Clear local session
    await auth.api.signOut({ headers });

    // Return IDP logout URL for client-side redirect
    return { idpLogoutUrl: getIdpLogoutUrl(idToken) };
  },
);
