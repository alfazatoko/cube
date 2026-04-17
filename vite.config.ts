import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isFirebaseBuild = process.env.FIREBASE_BUILD === "true";
const isReplit = process.env.REPL_ID !== undefined;

const rawPort = process.env.PORT;
const basePath = process.env.BASE_PATH;

if (!isFirebaseBuild && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

if (!isFirebaseBuild && !basePath) {
  throw new Error("BASE_PATH environment variable is required but was not provided.");
}

const port = rawPort ? Number(rawPort) : 5173;

export default defineConfig({
  base: isFirebaseBuild ? "/" : (basePath || "/"),
  plugins: [
    react(),
    tailwindcss(),
    ...(isFirebaseBuild ? [] : [
      (await import("@replit/vite-plugin-runtime-error-modal")).default(),
    ]),
    ...(!isFirebaseBuild && process.env.NODE_ENV !== "production" && isReplit
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: isFirebaseBuild
      ? path.resolve(import.meta.dirname, "dist")
      : path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
