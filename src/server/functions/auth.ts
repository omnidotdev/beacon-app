import type { OrganizationClaim } from "@omnidotdev/providers/auth";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import type { PersonaInfo } from "@/lib/api";
import auth, { isOmniOAuthConfigured } from "@/lib/auth/auth";
import { authCache } from "@/lib/auth/authCache";
import { getAuth } from "@/lib/auth/getAuth";
import {
  AUTH_BASE_URL,
  AUTH_CLIENT_ID,
  BASE_URL,
} from "@/lib/config/env.config";
import { PERSONA_COOKIE, parsePersonaCookie } from "@/lib/personaCookie";

interface SessionResult {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      identityProviderId?: string | null;
    };
    accessToken?: string;
    organizations: OrganizationClaim[];
  } | null;
  organizations: OrganizationClaim[];
  /** Whether sign-in is configured, so signed-in areas must enforce it */
  authEnabled: boolean;
  /**
   * Identity provider base URL, so the browser can check its Omni session
   * (the client bundle carries no build-time auth config)
   */
  authBaseUrl?: string;
  /** The persona last active in this browser, so the server renders it first */
  persona: PersonaInfo | null;
}

/**
 * Fetch the current user session.
 * Returns session with user info if authenticated, null otherwise.
 */
export const fetchSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<SessionResult> => {
    const request = getRequest();
    const result = await getAuth(request);
    const persona = parsePersonaCookie(getCookie(PERSONA_COOKIE));

    if (!result) {
      return {
        session: null,
        organizations: [],
        authEnabled: isOmniOAuthConfigured,
        persona,
      };
    }

    return {
      authEnabled: isOmniOAuthConfigured,
      persona,
      authBaseUrl: AUTH_BASE_URL as string | undefined,
      session: {
        user: {
          id: result.user.id,
          name: result.user.name as string,
          email: result.user.email as string,
          image: result.user.image as string | null | undefined,
          identityProviderId: result.user.identityProviderId,
        },
        accessToken: result.accessToken,
        organizations: result.organizations,
      },
      organizations: result.organizations,
    };
  },
);

const clearAuthCacheCookie = () => {
  setCookie(authCache.cookieName, "", { maxAge: 0, path: "/" });
};

/**
 * Build the IDP end_session URL for federated logout.
 */
function getIdpLogoutUrl(idTokenHint?: string): string | null {
  if (!AUTH_BASE_URL || !AUTH_CLIENT_ID || !BASE_URL || !idTokenHint) {
    return null;
  }

  const endSessionUrl = new URL(`${AUTH_BASE_URL}/oauth2/end-session`);
  endSessionUrl.searchParams.set("client_id", AUTH_CLIENT_ID);
  endSessionUrl.searchParams.set("post_logout_redirect_uri", BASE_URL);
  endSessionUrl.searchParams.set("id_token_hint", idTokenHint);

  return endSessionUrl.toString();
}

/**
 * Sign out from the local session (server-side).
 */
export const signOutLocal = createServerFn({ method: "POST" }).handler(
  async () => {
    const request = getRequest();
    const headers = request.headers;

    let idToken: string | undefined;
    try {
      const tokenResult = await auth.api.getAccessToken({
        body: { useAccountCookie: true },
        headers,
      });
      idToken = tokenResult?.idToken;
    } catch {
      // Token may already be expired
    }

    await auth.api.signOut({ headers });
    clearAuthCacheCookie();

    return { idpLogoutUrl: getIdpLogoutUrl(idToken) };
  },
);
