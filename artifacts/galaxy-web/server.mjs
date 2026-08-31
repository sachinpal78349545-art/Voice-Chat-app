// @ts-nocheck
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "24090", 10);

/* ───────────────────────── Crash Protection ───────────────────────── */

function fmtError(err) {
  return err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ""}` : String(err);
}

process.on("uncaughtException", (err) => {
  console.error(`[FATAL] uncaughtException at ${new Date().toISOString()}:\n${fmtError(err)}`);
  setTimeout(() => process.exit(1), 500);
});

process.on("unhandledRejection", (reason) => {
  console.error(`[WARN] unhandledRejection at ${new Date().toISOString()}:\n${fmtError(reason)}`);
});

/* ───────────────────────── Memory Guard ───────────────────────── */

setInterval(() => {
  const mem = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  console.log(`[MEM] heap=${heapMB}MB rss=${rssMB}MB`);
  if (heapMB > 400) {
    console.warn(`[MEM] WARNING: heap ${heapMB}MB > 400MB threshold — possible memory leak!`);
    try { global.gc?.(); } catch (_) {}
  }
}, 5 * 60 * 1000);

/* ───────────────────────── Express Setup ───────────────────────── */

// ✅ Security Headers (helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));

// ✅ CORS – सिर्फ अपने डोमेन को allow करें
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["https://galaxy-voice-chat-galaxy-web.vercel.app", "http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ✅ Rate Limiting – हर API पर 10 requests per 10 seconds
const apiLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// ✅ Input Validation Schemas (Zod)
const AgoraTokenSchema = z.object({
  channelName: z.string().min(1),
  uid: z.union([z.string(), z.number()]),
  role: z.number().int().min(1).max(2).optional(),
});

const RechargeSchema = z.object({
  packageId: z.string().min(1),
  userId: z.string().min(1),
  paymentMethod: z.string().optional(),
});

/* ───────────────────────── Static & Health ───────────────────────── */

const publicDir = path.join(__dirname, "dist", "public");
app.use(express.static(publicDir));

const SERVER_STARTED_AT = Date.now();

app.get("/ping", (_req, res) => {
  res.json({ status: "alive", timestamp: Date.now() });
});

app.get("/healthz", (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    service: "galaxy-voice-chat",
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
  });
});

app.head("/healthz", (_req, res) => res.sendStatus(200));

/* ───────────────────────── Agora Token ───────────────────────── */

const AGORA_APP_ID = process.env.AGORA_APP_ID || "5a9957fd6a8047f48310fd0e5545d42c";
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

function buildAgoraToken(appId, appCertificate, channelName, uid, role, expireTs) {
  if (!appCertificate) return null;

  const VERSION = "007";
  const privileges = {};
  privileges[1] = expireTs;
  privileges[2] = expireTs;
  if (role === 1) {
    privileges[3] = expireTs;
    privileges[4] = expireTs;
  }

  const privilegesStr = Object.entries(privileges)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  const content = `${appId}${channelName}${uid}${privilegesStr}`;
  const sign = crypto
    .createHmac("sha256", appCertificate)
    .update(content)
    .digest("hex");

  return `${VERSION}${Buffer.from(JSON.stringify({
    appId,
    channelName,
    uid: String(uid),
    privileges,
    sign,
    ts: Math.floor(Date.now() / 1000),
  })).toString("base64")}`;
}

app.post("/api/agora-token", (req, res) => {
  try {
    const parsed = AgoraTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
    }

    const { channelName, uid, role = 2 } = parsed.data;

    if (!AGORA_APP_CERTIFICATE) {
      return res.json({ token: null, appId: AGORA_APP_ID, message: "No certificate configured, using app ID only" });
    }

    const expireTs = Math.floor(Date.now() / 1000) + 3600;
    const token = buildAgoraToken(AGORA_APP_ID, AGORA_APP_CERTIFICATE, channelName, uid, role, expireTs);

    res.json({ token, appId: AGORA_APP_ID });
  } catch (err) {
    console.error("[API] /api/agora-token error:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

/* ───────────────────────── Recharge API ───────────────────────── */

const RECHARGE_PACKAGES = [
  { id: "pack_100",   coins: 100,   price: 0.99,   currency: "USD", bonus: 0     },
  { id: "pack_500",   coins: 500,   price: 4.99,   currency: "USD", bonus: 50    },
  { id: "pack_1000",  coins: 1000,  price: 9.99,   currency: "USD", bonus: 150   },
  { id: "pack_5000",  coins: 5000,  price: 49.99,  currency: "USD", bonus: 1000  },
  { id: "pack_10000", coins: 10000, price: 99.99,  currency: "USD", bonus: 3000  },
  { id: "pack_50000", coins: 50000, price: 499.99, currency: "USD", bonus: 20000 },
];

app.get("/api/recharge-packages", (_req, res) => {
  res.json(RECHARGE_PACKAGES);
});

app.post("/api/recharge", (req, res) => {
  try {
    const parsed = RechargeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
    }

    const { packageId } = parsed.data;
    const pkg = RECHARGE_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: "Invalid package" });

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    res.json({
      orderId,
      packageId: pkg.id,
      coins: pkg.coins + pkg.bonus,
      price: pkg.price,
      currency: pkg.currency,
      status: "pending",
      paymentUrl: null,
      message: "Payment gateway integration pending. Connect Stripe/Razorpay to enable real payments.",
    });
  } catch (err) {
    console.error("[API] /api/recharge error:", err);
    res.status(500).json({ error: "Recharge request failed" });
  }
});

/* ───────────────────────── SPA Fallback ───────────────────────── */

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

/* ───────────────────────── Error Handler ───────────────────────── */

// ✅ Generic error handler – किसी भी unhandled error को पकड़ें और सामान्य मैसेज दें
app.use((err, _req, res, _next) => {
  console.error("[ERROR] Unhandled:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ───────────────────────── Start ───────────────────────── */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Galaxy Voice Chat started on port ${PORT} at ${new Date().toISOString()}`);
  console.log(`[SERVER] Keep-alive: /ping | Health: /healthz | Agora: POST /api/agora-token`);

  // ── Integrated Keep-Alive: self-ping every 4 min to prevent sleep ──
  const SELF_PING_MS = 4 * 60 * 1000;
  let selfPingFailures = 0;

  async function selfPing() {
    try {
      const res = await fetch(`http://localhost:${PORT}/healthz`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`[KEEP-ALIVE] ✅ OK | uptime=${data.uptimeSeconds ?? "?"}s | heap=${data.memory?.heapUsedMB ?? "?"}MB`);
        selfPingFailures = 0;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      selfPingFailures++;
      console.warn(`[KEEP-ALIVE] ⚠️  Ping failed (${selfPingFailures}): ${err.message}`);
    }
  }

  setTimeout(() => {
    selfPing();
    setInterval(selfPing, SELF_PING_MS);
  }, 30_000);
});