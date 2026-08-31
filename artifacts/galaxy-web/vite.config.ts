import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/** Serves /ping and /healthz as JSON — so UptimeRobot gets proper 200 JSON.
 * Also runs a heartbeat every 2 minutes to prevent Replit idle/sleep. */
function healthPlugin(): Plugin {
  const startedAt = Date.now();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function fmt(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  function memMB() {
    const m = process.memoryUsage();
    return `heap=${Math.round(m.heapUsed / 1024 / 1024)}MB rss=${Math.round(m.rss / 1024 / 1024)}MB`;
  }

  return {
    name: "health-endpoints",
    configureServer(server) {
      heartbeatTimer = setInterval(() => {
        const uptime = fmt(Date.now() - startedAt);
        const mem    = memMB();
        console.log(`\x1b[35m[HEARTBEAT]\x1b[0m 💓 Galaxy alive | up=${uptime} | ${mem}`);
      }, 2 * 60 * 1000);

      server.middlewares.use((req, res, next) => {
        if (req.url === "/ping") {
          res.setHeader("Content-Type", "application/json");
          res.writeHead(200);
          res.end(JSON.stringify({ status: "alive", timestamp: Date.now() }));
          return;
        }
        if (req.url === "/healthz") {
          const mem = process.memoryUsage();
          res.setHeader("Content-Type", "application/json");
          res.writeHead(200);
          res.end(JSON.stringify({
            status: "ok",
            uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
            timestamp: new Date().toISOString(),
            service: "galaxy-voice-chat",
            mode: "development",
            memory: {
              heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
              rssMB:      Math.round(mem.rss       / 1024 / 1024),
            },
          }));
          return;
        }
        next();
      });

      server.httpServer?.on("close", () => {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
      });
    },
  };
}

const isBuild = process.argv.includes("build");
const rawPort = process.env.PORT;

if (!rawPort && !isBuild) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = rawPort ? Number(rawPort) : 3000;
const basePath = "./";

export default defineConfig({
  base: basePath,
  plugins: [
    healthPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
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
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // ✅ Security: Source Maps बंद करें (production में)
    sourcemap: false,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    watch: {
      ignored: [
        "**/galaxy/**",
        "**/public/galaxy/**",
        "**/dist/**",
      ],
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // ✅ Proxy – API requests ko backend (server.mjs) पर forward करें
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // backend server port
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});