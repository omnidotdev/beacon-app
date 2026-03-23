import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Layout } from "@/components";
import { isCloudDeployment } from "@/lib/api";
import signIn from "@/lib/auth/signIn";
import signOut from "@/lib/auth/signOut";
import {
  OrganizationProvider,
} from "@/lib/context/organization.context";
import { EventsProvider } from "@/providers/EventsProvider";

import type { Organization } from "@/lib/context/organization.context";

// Noop provider for client-side (main @omnidotdev/providers entry requires Node.js)
const eventsProvider = {
  async emit() {
    return {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  },
};

export const Route = createFileRoute("/_app")({
  component: AuthLayout,
});

function SignInRedirect() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    signIn({ redirectUrl: window.location.href });

    const timer = setTimeout(() => setShowFallback(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {showFallback ? (
        <>
          <p className="text-muted">Redirect didn't happen automatically.</p>
          <button
            type="button"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-[#0a0a0f] transition-all hover:glow-primary"
            onClick={() => signIn({ redirectUrl: window.location.href })}
          >
            Sign in with Omni
          </button>
        </>
      ) : (
        <p className="text-muted">Signing in...</p>
      )}
    </div>
  );
}

function AuthLayout() {
  const { session, organizations } = useRouteContext({ strict: false }) as {
    session?: { user?: { id: string }; accessToken?: string } | null;
    organizations?: Organization[];
  };
  const isCloud = isCloudDeployment();

  // Clean up zombie sessions where the OAuth cookie exists but the
  // access token is missing (user not provisioned in the app DB)
  useEffect(() => {
    if (isCloud && session?.user && !session.accessToken) {
      signOut();
    }
  }, [isCloud, session]);

  // Only enforce auth in cloud deployment mode
  // Require an access token, not just a session cookie
  if (isCloud && (!session || !session.accessToken)) {
    return <SignInRedirect />;
  }

  return (
    <EventsProvider provider={eventsProvider}>
      <OrganizationProvider organizations={organizations ?? []}>
        <Layout />
      </OrganizationProvider>
    </EventsProvider>
  );
}
