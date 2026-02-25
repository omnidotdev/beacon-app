import { createFileRoute, redirect } from "@tanstack/react-router";

import { Layout } from "@/components";
import { isCloudDeployment } from "@/lib/api";
import { EventsProvider } from "@/providers/EventsProvider";

// Noop provider for client-side (main @omnidotdev/providers entry requires Node.js)
const eventsProvider = {
  async emit() {
    return {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  },
};

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context: { session } }) => {
    // Only enforce auth in cloud deployment mode
    if (isCloudDeployment() && !session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <EventsProvider provider={eventsProvider}>
      <Layout />
    </EventsProvider>
  );
}
