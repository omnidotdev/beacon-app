import type { OrganizationClaim } from "@omnidotdev/providers/auth";
import { createOmniOAuthConfig } from "@omnidotdev/providers/auth";
import { getCookie } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { customSession, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { authCache } from "@/lib/auth/authCache";
import {
  AUTH_BASE_URL,
  AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET,
  AUTH_INTERNAL_URL,
  BASE_URL,
} from "@/lib/config/env.config";

const { AUTH_SECRET } = process.env;

// Build genericOAuth config array based on available credentials
const oauthConfigs: Parameters<typeof genericOAuth>[0]["config"] = [];

// Omni/Gatekeeper OAuth
if (AUTH_CLIENT_ID && AUTH_CLIENT_SECRET && AUTH_BASE_URL) {
  oauthConfigs.push({
    providerId: "omni",
    clientId: AUTH_CLIENT_ID,
    clientSecret: AUTH_CLIENT_SECRET,
    discoveryUrl: `${AUTH_BASE_URL}/.well-known/openid-configuration`,
    scopes: ["openid", "profile", "email", "offline_access", "organization"],
    accessType: "offline",
    pkce: true,
    mapProfileToUser: (profile) => ({
      name: profile.name,
      email: profile.email,
      emailVerified: profile.email_verified,
      image: profile.picture,
    }),
  });
}

// Build plugins array
const plugins = [];

if (oauthConfigs.length > 0) {
  plugins.push(
    genericOAuth({
      config: [
        createOmniOAuthConfig({
          clientId: AUTH_CLIENT_ID as string,
          clientSecret: AUTH_CLIENT_SECRET as string,
          authBaseUrl: AUTH_BASE_URL as string,
          authInternalUrl: AUTH_INTERNAL_URL as string,
        }),
      ],
    }),
  );
}

// NB: must be the last plugin in the array
plugins.push(
  customSession(async ({ user, session }) => {
    let identityProviderId: string | null = null;
    let organizations: OrganizationClaim[] = [];

    const cachedValue = getCookie(authCache.cookieName);
    if (cachedValue) {
      const cached = await authCache.decrypt(cachedValue);
      if (cached) {
        identityProviderId = cached.identityProviderId;
        organizations = cached.organizations;
      }
    }

    return {
      user: {
        ...user,
        identityProviderId,
        organizations,
      },
      session,
    };
  }),
);

plugins.push(tanstackStartCookies());

/**
 * Auth server client
 */
const auth = betterAuth({
  baseURL: BASE_URL,
  basePath: "/api/auth",
  secret: AUTH_SECRET,
  // Trust the app's own origin for auth requests
  trustedOrigins: BASE_URL ? [BASE_URL] : [],
  session: {
    // Extend session expiration to 30 days
    expiresIn: 60 * 60 * 24 * 30,
    // Refresh session if older than 1 day
    updateAge: 60 * 60 * 24,
    // Enable cookie caching for stateless session validation
    cookieCache: {
      enabled: true,
      // Match session expiration so OAuth tokens (stored in account_data cookie
      // with the same maxAge) don't expire before the session itself
      maxAge: 60 * 60 * 24 * 30,
      // Use encrypted JWE for security
      strategy: "jwe",
      // Auto-refresh cookie before expiry
      refreshCache: true,
    },
  },
  account: {
    // Store OAuth tokens in signed cookie for stateless mode
    storeAccountCookie: true,
  },
  advanced: {
    // Use custom cookie prefix to avoid collision with IDP cookies
    cookiePrefix: "beacon",
  },
  plugins,
});

export default auth;
