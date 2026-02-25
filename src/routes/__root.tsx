import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { ApiProvider } from "@/hooks";
import appCss from "@/index.css?url";
import app from "@/lib/config/app.config";
import { isDevEnv } from "@/lib/config/env.config";
import { fetchMaintenanceMode } from "@/lib/flags";
import { isNative } from "@/lib/platform";
import createMetaTags from "@/lib/util/createMetaTags";
import { fetchSession } from "@/server/functions/auth";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: app.name,
  url: app.links.website,
  description: app.description,
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Windows, macOS, Linux",
  author: {
    "@type": "Organization",
    name: "Omni",
    url: "https://omni.dev",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

interface RouterContext {
  queryClient: QueryClient;
  session?: Awaited<ReturnType<typeof fetchSession>>["session"] | null;
  isMaintenanceMode: boolean;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    // In Tauri mode, server functions are not available
    // Auth is handled differently (or not at all for local mode)
    if (isNative()) {
      return { session: null, isMaintenanceMode: false };
    }

    try {
      const { session } = await fetchSession();

      // Pass user context to Unleash for @omni.dev admin bypass
      const context = session?.user?.email
        ? { userId: session.user.id, email: session.user.email }
        : undefined;
      const { isMaintenanceMode } = await fetchMaintenanceMode({
        data: context,
      });

      // Skip auth when maintenance page is shown
      if (isMaintenanceMode) return { session: null, isMaintenanceMode };

      return { session, isMaintenanceMode };
    } catch {
      // Server function failed, likely in Tauri mode
      return { session: null, isMaintenanceMode: false };
    }
  },
  head: () => {
    const { meta, links } = createMetaTags();
    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        },
        { name: "theme-color", content: "#0f172a" },
        ...meta,
      ],
      links: [{ rel: "stylesheet", href: appCss }, ...links],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(organizationSchema),
        },
      ],
    };
  },
  component: RootComponent,
});

function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-6 text-9xl">🗼</div>
        <h1 className="mb-4 font-bold text-4xl text-text">
          Signal Maintenance
        </h1>
        <p className="max-w-md text-lg text-muted">
          Beacon is recalibrating. We'll be back online shortly.
        </p>
      </div>
    </div>
  );
}

function RootComponent() {
  const { isMaintenanceMode, session } = useRouteContext({ from: "__root__" });

  if (isMaintenanceMode) {
    return (
      <RootDocument>
        <MaintenancePage />
      </RootDocument>
    );
  }

  return (
    <RootDocument>
      <ApiProvider accessToken={session?.accessToken}>
        <Outlet />
      </ApiProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: PropsWithChildren) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: blocking script to prevent theme flash
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("beacon-theme");if(t==="light")document.documentElement.classList.remove("dark")}catch(e){}})()`,
          }}
        />
      </head>

      <body>
        {children}
        <Toaster position="bottom-center" richColors />

        {isDevEnv && (
          <TanStackDevtools
            config={{ triggerHidden: true }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
                defaultOpen: true,
              },
              {
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        )}

        <Scripts />
      </body>
    </html>
  );
}
