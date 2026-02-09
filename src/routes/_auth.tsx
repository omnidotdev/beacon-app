import { createFileRoute, redirect } from "@tanstack/react-router";

import { Layout } from "@/components";
import { isCloudDeployment } from "@/lib/api";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context: { session } }) => {
    // Only enforce auth in cloud deployment mode
    if (isCloudDeployment() && !session) {
      throw redirect({ to: "/login" });
    }
  },
  component: Layout,
});
