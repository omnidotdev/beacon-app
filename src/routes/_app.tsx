import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { Layout } from "@/components";
import { AUTH_URL } from "@/lib/config/env.config";
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
  beforeLoad: async ({ context: { session } }) => {
    // Skip auth enforcement when no auth provider is configured (local/native mode)
    if (!AUTH_URL) return;

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
  const { organizations } = useRouteContext({ strict: false }) as {
    organizations?: Workspace[];
  };

  return (
    <EventsProvider provider={eventsProvider}>
      <WorkspaceProvider workspaces={organizations ?? []}>
        <Layout />
      </WorkspaceProvider>
    </EventsProvider>
  );
}
