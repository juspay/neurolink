import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { setupWebSocket } from "./voiceWebSocketHandler.js";
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

export async function startVoiceServer(port = 3000): Promise<void> {
  const app = express();

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

  const server = http.createServer(app);

  /* ---------- WS ---------- */

  setupWebSocket(server);

  /* ---------- START ---------- */

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.removeListener("error", reject);
      logger.info(`[SERVER] Voice server running at http://localhost:${port}`);
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
