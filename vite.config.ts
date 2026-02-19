import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import viteTsConfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;
const isTauri = !!host;

/**
 * Vite configuration.
 * @see https://vite.dev/config
 */
export default defineConfig(({ command }) => ({
  plugins: [
    devtools(),
    // Use mkcert in development for HTTPS
    command === "serve" && !isTauri && mkcert(),
    // Only use SSR plugins for web mode
    !isTauri &&
      nitroV2Plugin({
        preset: "node-server",
        externals: {
          inline: ["srvx", "react-dom", "dexie", "dexie-react-hooks"],
        },
        routeRules: {
          "/gateway/**": {
            proxy: { to: "https://gateway.beacon.omni.dev/**" },
          },
          "/api/graphql": { proxy: { to: "https://api.beacon.omni.dev/graphql" } },
        },
      }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    // TanStack Start for SSR (web mode only)
    !isTauri && tanstackStart(),
    viteReact(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // Vite options for Tauri development
  clearScreen: false,
  server: {
    port: isTauri ? 1420 : 3000,
    strictPort: true,
    host: isTauri ? host : "0.0.0.0",
    hmr: isTauri
      ? {
          protocol: "wss",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    // Proxy for gateway API (both modes)
    proxy: {
      "/gateway": {
        target: "http://localhost:18790",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway/, ""),
      },
      "/api/graphql": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://localhost:18790",
        ws: true,
      },
    },
  },
}));
