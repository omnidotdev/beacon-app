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
    // TanStack Start must be first to ensure SSR utils are bundled correctly
    !isTauri && tanstackStart(),
    devtools(),
    // Use mkcert in development for HTTPS
    command === "serve" && !isTauri && mkcert(),
    // Only use SSR plugins for web mode
    !isTauri &&
      nitroV2Plugin({
        preset: "node-server",
        externals: {
          inline: [
            "srvx",
            "react-dom",
            "dexie",
            "dexie-react-hooks",
            "@omnidotdev/providers",
            // Prevent Rollup cross-chunk reference bug for SSR utils
            "@tanstack/router-core",
            "@tanstack/start-server-core",
          ],
        },
        hooks: {
          // Fix CJS `require` shim in pre-bundled ESM packages (e.g. @omnidotdev/providers)
          // that use `typeof require !== "undefined" ? require : ...` which fails in Node.js ESM
          "rollup:before": (_nitro, config) => {
            (config.plugins as any[]).push({
              name: "fix-esm-require-shim",
              renderChunk(code: string) {
                if (
                  !code.includes(
                    'var __require = typeof require !== "undefined"',
                  )
                )
                  return null;

                return `import { createRequire as __createRequire } from "node:module";\nvar require = __createRequire(import.meta.url);\n${code}`;
              },
            });
          },
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
    port: Number(process.env.PORT) || 3000,
    strictPort: true,
    host: isTauri ? host : "0.0.0.0",
    hmr: isTauri
      ? {
          protocol: "wss",
          host,
          port: 3001,
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
