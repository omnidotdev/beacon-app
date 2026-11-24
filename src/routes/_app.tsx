import { useIdentitySync } from "@omnidotdev/providers/react";
import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { Layout } from "@/components";
import { followSignOut, followSwitch } from "@/lib/auth/followIdentity";
import type { Workspace } from "@/lib/context/workspace.context";
import { WorkspaceProvider } from "@/lib/context/workspace.context";
import { EventsProvider } from "@/providers/EventsProvider";
import { signOutLocal } from "@/server/functions/auth";

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
  beforeLoad: async ({ context: { session, authEnabled } }) => {
    // Skip auth enforcement when sign-in is not configured (local/native mode).
    // The server reports this, since the client bundle carries no auth config
    if (!authEnabled) return;

    // Clean up zombie sessions (OAuth cookie without proper provisioning)
    if (session?.user && !session.accessToken) {
      await signOutLocal();
      throw redirect({ to: "/" });
    }

    // Redirect unauthenticated users to the landing page
    if (!session?.accessToken) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { organizations, session, authBaseUrl } = useRouteContext({
    strict: false,
  }) as {
    organizations?: Workspace[];
    session?: { user?: { identityProviderId?: string | null } } | null;
    authBaseUrl?: string;
  };

  // Stay signed in as the same account as Omni: follow a switch or sign-out
  // made in another app
  useIdentitySync({
    authBaseUrl,
    subject: session?.user?.identityProviderId,
    onSignedOut: followSignOut,
    onSwitched: followSwitch,
  });

  return (
    <EventsProvider provider={eventsProvider}>
      <WorkspaceProvider workspaces={organizations ?? []}>
        <Layout />
      </WorkspaceProvider>
    </EventsProvider>
  );
}
