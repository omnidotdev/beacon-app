import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { isNative } from "@/lib/platform";
import { getRouter } from "@/router";

import "./index.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const App = () => (
  <StrictMode>
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);

// In Tauri mode, use client-side rendering only
// In web mode, hydrate the server-rendered HTML
if (isNative()) {
  createRoot(root).render(<App />);
} else {
  // Check if we have server-rendered content to hydrate
  if (root.hasChildNodes()) {
    hydrateRoot(root, <App />);
  } else {
    createRoot(root).render(<App />);
  }
}
