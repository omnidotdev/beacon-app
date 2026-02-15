import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BeaconLogo } from "@/components/Sidebar";

import authClient from "@/lib/auth/authClient";
import { BASE_URL } from "@/lib/config/env.config";
import createMetaTags from "@/lib/util/createMetaTags";
import { fetchIdpLogoutUrl } from "@/server/functions/auth";

type LoginSearch = {
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/_public/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string"
        ? search.error_description
        : undefined,
  }),
  head: () =>
    createMetaTags({
      title: "Sign In",
      description: "Sign in to Beacon with your Omni account",
      url: `${BASE_URL}/login`,
    }),
  component: LoginPage,
});

function LoginPage() {
  const { error: oauthError } = Route.useSearch();
  const hasOAuthError = !!oauthError;

  const [isRedirecting, setIsRedirecting] = useState(!hasOAuthError);
  const [error, setError] = useState<string | null>(
    hasOAuthError
      ? "Authorization was denied. Try again or use a different account."
      : null,
  );

  const handleOmniSignIn = async () => {
    setError(null);
    setIsRedirecting(true);

    const result = await authClient.signIn.oauth2({
      providerId: "omni",
      callbackURL: BASE_URL || "/",
    });

    // better-auth returns { error } instead of throwing
    if (result?.error) {
      console.error("[login] OAuth sign-in error:", result.error);
      setError(result.error.message || "Sign in failed. Please try again.");
      setIsRedirecting(false);
    }
  };

  const handleDifferentAccount = async () => {
    const logoutUrl = await fetchIdpLogoutUrl();

    if (logoutUrl) {
      window.location.href = logoutUrl;
      return;
    }

    // Fallback if IDP logout URL unavailable
    handleOmniSignIn();
  };

  // Auto-redirect to Omni OAuth on load (skip if returning from error)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-time redirect
  useEffect(() => {
    if (hasOAuthError) return;

    // Small delay to allow page to render, then redirect
    const timer = setTimeout(() => {
      handleOmniSignIn();
    }, 100);

    // If still on page after 3s, show manual button
    const fallback = setTimeout(() => {
      setIsRedirecting(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BeaconLogo className="mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-text">Beacon</h1>
          <p className="mt-2 text-muted">Voice-first AI assistant</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {isRedirecting && !error ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm text-muted">Redirecting to Omni...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleOmniSignIn}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-[#0a0a0f] transition-all hover:glow-primary"
            >
              {hasOAuthError ? "Try again" : "Sign in with Omni"}
            </button>

            {hasOAuthError && (
              <button
                type="button"
                onClick={handleDifferentAccount}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-muted transition-all hover:bg-white/5 hover:text-text"
              >
                Use a different account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
