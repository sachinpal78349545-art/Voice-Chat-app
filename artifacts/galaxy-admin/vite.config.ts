import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// ✅ Fallback PORT & BASE_PATH
const port = Number(process.env.PORT) || 20257;
const basePath = process.env.BASE_PATH || "/galaxy-admin/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    // (Optional) Replit‑specific plugins – temporary disabled to avoid errors
    // You can add them back later if needed
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      react: path.resolve(import.meta.dirname, "..", "..", "node_modules", "react"),
      "react-dom": path.resolve(import.meta.dirname, "..", "..", "node_modules", "react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    force: true,
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});