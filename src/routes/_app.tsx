import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { Layout } from "@/components";
import { isCloudDeployment } from "@/lib/api";
import type { Organization } from "@/lib/context/organization.context";
import { OrganizationProvider } from "@/lib/context/organization.context";
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
    const isCloud = isCloudDeployment();
    if (!isCloud) return;

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
    organizations?: Organization[];
  };

  return (
    <EventsProvider provider={eventsProvider}>
      <OrganizationProvider organizations={organizations ?? []}>
        <Layout />
      </OrganizationProvider>
    </EventsProvider>
  );
}
