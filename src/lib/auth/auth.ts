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

// Register the Omni OIDC provider only when it is actually configured.
// Without client credentials (e.g. local dev), skip it so a failed
// discovery fetch does not crash auth init and take down the whole app
const isOmniOAuthConfigured = Boolean(
  AUTH_CLIENT_ID && AUTH_CLIENT_SECRET && AUTH_BASE_URL,
);

// Build plugins array
const plugins = [];

if (isOmniOAuthConfigured) {
  plugins.push(
    genericOAuth({
      config: [
        {
          ...createOmniOAuthConfig({
            clientId: AUTH_CLIENT_ID as string,
            clientSecret: AUTH_CLIENT_SECRET as string,
            authBaseUrl: AUTH_BASE_URL as string,
            authInternalUrl: AUTH_INTERNAL_URL as string,
          }),
          // better-auth 1.7 rejects a function-valued authorizationUrlParams
          // from the shared config; disable it to preserve the sign-in flow
          authorizationUrlParams: undefined,
        },
      ],
    }),
  );
}

// NB: must be the last plugin in the array
plugins.push(
  customSession(async ({ user, session }) => {
    let identityProviderId: string | null = null;

    const cachedValue = getCookie(authCache.cookieName);
    if (cachedValue) {
      const cached = await authCache.decrypt(cachedValue);
      if (cached) {
        identityProviderId = cached.identityProviderId;
      }
    }

    return {
      user: {
        ...user,
        identityProviderId,
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
    // Resolve the real client IP from Cloudflare's `cf-connecting-ip` header so
    // Better Auth rate-limit buckets are keyed per client. Without it, getIp
    // sees a multi-hop `x-forwarded-for` behind Cloudflare, resolves to null,
    // and collapses every request into one global shared bucket, sharing the
    // per-IP browser limits (e.g. /sign-in at 3/10s) across all users
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    // Use custom cookie prefix to avoid collision with IDP cookies
    cookiePrefix: "beacon",
  },
  plugins,
});

export default auth;
