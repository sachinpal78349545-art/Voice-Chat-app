/**
 * Galaxy Voice Chat — Keep-Alive & Auto-Restart Script
 *
 * Run separately:  node keep-alive.mjs
 *
 * Pings /healthz every 5 minutes.
 * If 3 consecutive pings fail → spawns `npm start` to restart the server.
 * Logs every event with timestamp.
 */

import { spawnSync, spawn } from "child_process";
import { createRequire } from "module";

const PORT = process.env.PORT || "24090";
const BASE_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const PING_INTERVAL_MS  = 5 * 60 * 1000;   // 5 minutes
const MAX_FAILURES       = 3;
const REQUEST_TIMEOUT_MS = 10_000;

let failureCount = 0;
let serverProcess = null;

function now() {
  return new Date().toISOString();
}

function log(level, msg) {
  const tag = level === "ERROR" ? "❌" : level === "WARN" ? "⚠️ " : "✅";
  console.log(`[${now()}] ${tag} [KEEP-ALIVE] ${msg}`);
}

async function ping() {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/healthz`, { signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      log("OK", `Server alive | uptime=${data.uptimeSeconds ?? "?"}s | heap=${data.memory?.heapUsedMB ?? "?"}MB`);
      failureCount = 0;
      return true;
    }
    log("WARN", `Health check returned HTTP ${res.status}`);
    return false;
  } catch (err) {
    clearTimeout(tid);
    log("ERROR", `Ping failed — ${err.message}`);
    return false;
  }
}

function restartServer() {
  log("ERROR", "Too many consecutive failures — restarting server…");

  if (serverProcess) {
    try { serverProcess.kill("SIGTERM"); } catch (_) {}
    serverProcess = null;
  }

  // Small delay before restart
  setTimeout(() => {
    serverProcess = spawn("node", ["server.mjs"], {
      cwd: new URL(".", import.meta.url).pathname,
      stdio: "inherit",
      env: { ...process.env },
    });
    serverProcess.on("exit", (code) => {
      log("WARN", `Server process exited (code=${code}) — will retry on next ping cycle`);
      serverProcess = null;
    });
    failureCount = 0;
    log("OK", "Server process spawned. Watching…");
  }, 3000);
}

async function tick() {
  const ok = await ping();
  if (!ok) {
    failureCount++;
    log("WARN", `Failure count: ${failureCount}/${MAX_FAILURES}`);
    if (failureCount >= MAX_FAILURES) {
      restartServer();
    }
  }
}

// Run immediately then on interval
tick();
setInterval(tick, PING_INTERVAL_MS);

log("OK", `Keep-alive started. Watching ${BASE_URL}/healthz every ${PING_INTERVAL_MS / 60000} minutes.`);
