import { createEventsProvider } from "@omnidotdev/providers";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Layout } from "@/components";
import { isCloudDeployment } from "@/lib/api";
import { EventsProvider } from "@/providers/EventsProvider";

const eventsProvider = createEventsProvider({});

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
