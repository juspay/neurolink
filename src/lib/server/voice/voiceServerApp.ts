import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { setupWebSocket } from "./voiceWebSocketHandler.js";
import { timingSafeEqualString } from "./tokenCompare.js";
import { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import { getCartesiaWsUrl } from "../../adapters/tts/cartesiaHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the public/ directory containing static assets.
 * The CLI build (tsc) only emits .ts → .js and does NOT copy non-TS assets,
 * so __dirname/public may not exist when running from dist/.
 * Fall back to the original source path in that case.
 */
function resolvePublicPath(): string {
  const compiled = path.join(__dirname, "public");
  if (fs.existsSync(compiled)) {
    return compiled;
  }
  // Resolve from project root → src/lib/server/voice/public
  const source = path.resolve(
    __dirname,
    "../../../../src/lib/server/voice/public",
  );
  if (fs.existsSync(source)) {
    return source;
  }
  return compiled; // let express.static handle the 404
}

// Per-client request budget for the HTTP surface (the page and its static
// assets). One page load is a handful of requests, so the default leaves normal
// use untouched and only bounds a client that is hammering the file-serving
// routes. Both values are operator settings, read once at startup.
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 300;

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    logger.warn(
      `[SERVER] Ignoring ${name}: expected a positive integer, using ${fallback}`,
    );
    return fallback;
  }
  return parsed;
}

export async function startVoiceServer(port = 3000): Promise<void> {
  const app = express();

  // NEW11: refuse to bind to non-loopback interfaces unless the operator
  // has explicitly opted in. The voice server has minimal hardening and
  // exposing it publicly without a token leaks Soniox / Cartesia / LLM
  // credit usage to anyone who can reach the listener.
  const allowPublic = process.env.VOICE_SERVER_ALLOW_PUBLIC === "1";
  const host = allowPublic
    ? (process.env.VOICE_SERVER_HOST ?? "0.0.0.0")
    : "127.0.0.1";

  // NEW11: optional shared-secret bearer token for both HTTP and WebSocket
  // upgrade. When VOICE_SERVER_AUTH_TOKEN is set, every HTTP request must
  // carry `Authorization: Bearer <token>`. The WS upgrade additionally
  // accepts `?token=<token>` because browser WebSocket constructors cannot
  // set custom headers — see voiceWebSocketHandler.verifyClient. HTTP routes
  // intentionally reject `?token=` (would leak via Referer + access logs).
  const authToken = process.env.VOICE_SERVER_AUTH_TOKEN;

  /* ---------- RATE LIMIT ---------- */

  // Registered first so it also bounds failed-auth attempts and oversized
  // bodies. /health stays exempt for the same reason the auth middleware skips
  // it: a load balancer probes it on a fixed cadence with no credentials.
  const rateLimitWindowMs = positiveIntegerFromEnv(
    "VOICE_SERVER_RATE_LIMIT_WINDOW_MS",
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  );
  const rateLimitMax = positiveIntegerFromEnv(
    "VOICE_SERVER_RATE_LIMIT_MAX",
    DEFAULT_RATE_LIMIT_MAX,
  );
  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      limit: rateLimitMax,
      standardHeaders: "draft-6",
      legacyHeaders: false,
      skip: (req) => req.path === "/health",
      handler: (_req, res) => {
        res.status(429).json({ error: "Too many requests" });
      },
    }),
  );

  /* ---------- BODY LIMITS + AUTH ---------- */

  // NEW11: cap JSON / urlencoded body to 100kb. Express's default is 100kb
  // for json() but only when explicitly registered; without this any future
  // body parser would default to whatever its own limit is.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: false }));

  // NEW11: minimal HTTP auth middleware. Skips when no token is configured
  // (back-compat — local-only dev keeps working). Skips for /health so
  // load-balancers can probe without credentials.
  if (authToken) {
    app.use((req, res, next) => {
      if (req.path === "/health") {
        return next();
      }
      const header = req.header("authorization");
      // Bug 3 fix: HTTP routes only accept the bearer header. The `?token=`
      // fallback exists only on the WS upgrade where the browser API cannot
      // attach headers — using it on regular HTTP would leak credentials via
      // Referer headers, browser history, server access logs, and proxies.
      const provided = header?.startsWith("Bearer ")
        ? header.slice(7)
        : undefined;
      if (!provided || !timingSafeEqualString(provided, authToken)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  /* ---------- STATIC FILES ---------- */

  const publicPath = resolvePublicPath();
  logger.info("[SERVER] Serving static from:", publicPath);

  app.use(express.static(publicPath));

  app.get("/", (_, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  /* ---------- HEALTH CHECK ---------- */

  app.get("/health", (_, res) => {
    res.json({ status: "ok" });
  });

  /* ---------- ERROR HANDLER ---------- */

  // NEW11: global Express error handler so synchronous and async errors are
  // caught instead of crashing the process or leaking stack traces.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error(
        `[SERVER] Unhandled error: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  const server = http.createServer(app);

  /* ---------- WS ---------- */

  // NEW11: pass the auth token + allow-public flag through to the WS handler
  // so it can verify clients on upgrade and apply maxPayload caps.
  setupWebSocket(server, { authToken, maxPayload: 1_048_576 });

  /* ---------- START ---------- */

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      const exposure = allowPublic
        ? `bound publicly on ${host}:${port} (VOICE_SERVER_ALLOW_PUBLIC=1)`
        : `bound to loopback ${host}:${port} (set VOICE_SERVER_ALLOW_PUBLIC=1 to expose externally)`;
      logger.info(
        `[SERVER] Voice server running — ${exposure}${authToken ? " (auth required)" : " (no auth — token via VOICE_SERVER_AUTH_TOKEN recommended)"}; rate limit ${rateLimitMax} requests per ${rateLimitWindowMs}ms per client`,
      );
      resolve();
    });
  });

  /* ---------- WARMUP ---------- */

  // Pre-warm NeuroLink + Azure on startup so the first real user request isn't
  // slow. NeuroLink's MCP init + Azure's connection pool both have cold-start
  // overhead that shows up as 3-4s on the very first call. We also open and
  // immediately close a Cartesia WS to prime the TLS handshake.
  warmup().catch((err) => {
    logger.warn("[WARMUP] Failed (non-fatal):", (err as Error).message);
  });
}

async function warmup(): Promise<void> {
  const t = Date.now();
  logger.info("[WARMUP] Warming up LLM + TTS...");

  const neurolink = new NeuroLink();

  const provider = process.env.VOICE_LLM_PROVIDER ?? "azure";
  const model = process.env.VOICE_LLM_MODEL ?? "gpt-4o-automatic";

  try {
    const result = await withTimeout(
      neurolink.stream({
        provider,
        model,
        input: { text: "hi" },
        maxTokens: 3,
        disableTools: true,
        enableAnalytics: false,
        enableEvaluation: false,
      }),
      15000,
      "LLM warmup timed out",
    );
    // Drain the stream so the connection is fully exercised.
    for await (const _chunk of result.stream) {
      /* drain */
    }
    logger.info(`[WARMUP] LLM warmup done in ${Date.now() - t}ms`);
  } catch (err) {
    logger.warn(
      "[WARMUP] LLM warmup failed (non-fatal):",
      (err as Error).message,
    );
  }

  // Cartesia TLS warmup — open WS, wait for connect, then close.
  try {
    const { default: WebSocket } = await import("ws");
    const apiKey = process.env.CARTESIA_API_KEY;
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(getCartesiaWsUrl(), {
        headers: apiKey ? { "X-API-Key": apiKey } : undefined,
      });
      const timeout = setTimeout(() => {
        ws.terminate();
        resolve(); // non-fatal, just move on
      }, 5000);
      ws.once("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
      ws.once("error", () => {
        clearTimeout(timeout);
        resolve(); // non-fatal
      });
    });
    logger.info(`[WARMUP] Cartesia warmup done in ${Date.now() - t}ms`);
  } catch {
    // non-fatal
  }
}
