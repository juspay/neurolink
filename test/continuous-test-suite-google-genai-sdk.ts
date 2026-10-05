#!/usr/bin/env tsx

/**
 * Continuous Test Suite — what the Google providers rely on from `@google/genai`.
 *
 * The SDK moved to 2.x so that its requests can go through the configured
 * proxy. Two behaviours of 2.x differ from 1.x in ways a declaration diff does
 * not show, and both sit on paths this package ships:
 *
 *  - AI Studio `embedMany` for a `gemini-embedding-2*` model. 2.x reads an array
 *    of strings as ONE content with several parts, so N texts came back as a
 *    single vector.
 *  - AI Studio audio input over Gemini Live. 2.x waits inside `live.connect()`
 *    for the server's setup message and never rejects if the socket closes
 *    first, so a refused key or model left the stream pending forever.
 *
 * Everything drives the shipped surface (`ProviderFactory`, `NeuroLink` from
 * `../dist/index.js`) against local stand-ins reached through the public
 * `credentials.googleAiStudio.baseURL`. No rule-15 exception: nothing is
 * imported from `src/`. The stand-ins buy what a real endpoint cannot give:
 * a server that accepts a WebSocket and then closes it before setup, and one
 * that reports how many vectors a request asked for.
 *
 * Assertion messages describe the discrepancy and never quote a response.
 *
 * Run: npx tsx test/continuous-test-suite-google-genai-sdk.ts
 *      pnpm run test:google-genai-sdk
 */

import { createServer, type Server } from "node:http";
import type { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite("Google GenAI SDK behaviour", {
  offline: true,
});

const { NeuroLink, ProviderFactory, ProviderRegistry } =
  await import("../dist/index.js");

const TOUCHED_ENV_VARS = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "NO_PROXY",
  "no_proxy",
  "NODE_USE_ENV_PROXY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
  "GOOGLE_AI_EMBEDDING_MODEL",
] as const;

async function withCleanEnv<T>(run: () => Promise<T>): Promise<T> {
  const saved = new Map<string, string | undefined>(
    TOUCHED_ENV_VARS.map((name) => [name, process.env[name]]),
  );
  TOUCHED_ENV_VARS.forEach((name) => {
    delete process.env[name];
  });
  try {
    return await run();
  } finally {
    saved.forEach((value, name) => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    });
  }
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

/** Answers `:batchEmbedContents` with one vector per request, first character as its value. */
async function startEmbeddingStandIn(): Promise<{
  origin: string;
  close: () => Promise<void>;
}> {
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let requests: Array<{ content?: { parts?: Array<{ text?: string }> } }> =
        [];
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          requests?: typeof requests;
        };
        requests = body.requests ?? [];
      } catch {
        requests = [];
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          embeddings: requests.map((r) => ({
            values: [(r.content?.parts?.[0]?.text ?? "?").charCodeAt(0)],
          })),
        }),
      );
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  const port = await listen(server);
  return {
    origin: `http://127.0.0.1:${port}`,
    close: async () => {
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function embedManyThroughAiStudio(
  origin: string,
  embeddingModel: string,
  texts: string[],
): Promise<{ vectors: number[][] | undefined }> {
  await ProviderRegistry.registerAllProviders();
  let vectors: number[][] | undefined;
  try {
    const provider = await ProviderFactory.createProvider(
      "google-ai",
      "gemini-2.0-flash",
      undefined,
      undefined,
      { googleAiStudio: { apiKey: "k", baseURL: origin } },
    );
    vectors = await provider.embedMany?.(texts, embeddingModel);
  } catch {
    vectors = undefined;
  }
  return { vectors };
}

section("AI Studio embedMany returns one vector per text");

await test("embedMany with gemini-embedding-001 returns one vector per text, in order", async () => {
  await withCleanEnv(async () => {
    const standIn = await startEmbeddingStandIn();
    try {
      const { vectors } = await embedManyThroughAiStudio(
        standIn.origin,
        "gemini-embedding-001",
        ["a", "b", "c"],
      );
      const got = vectors ?? [];
      assert(vectors !== undefined, "embedMany did not return vectors");
      assert(got.length === 3, "embedMany did not return one vector per text");
      assert(
        got.map((v) => v[0]).join(",") === "97,98,99",
        "embedMany returned the vectors out of order",
      );
    } finally {
      await standIn.close();
    }
  });
});

await test("embedMany with gemini-embedding-2-preview returns one vector per text, in order", async () => {
  await withCleanEnv(async () => {
    const standIn = await startEmbeddingStandIn();
    try {
      const { vectors } = await embedManyThroughAiStudio(
        standIn.origin,
        "gemini-embedding-2-preview",
        ["a", "b", "c"],
      );
      const got = vectors ?? [];
      assert(vectors !== undefined, "embedMany did not return vectors");
      assert(got.length === 3, "embedMany did not return one vector per text");
      assert(
        got.map((v) => v[0]).join(",") === "97,98,99",
        "embedMany returned the vectors out of order",
      );
    } finally {
      await standIn.close();
    }
  });
});

section("AI Studio audio input over Gemini Live");

await test("an audio stream settles when the Live server closes the socket before setup completes", async () => {
  await withCleanEnv(async () => {
    let connections = 0;
    const http = createServer();
    const wss = new WebSocketServer({ server: http });
    wss.on("connection", (socket) => {
      connections += 1;
      // Accept the handshake, wait for the client's setup message, then close
      // without ever sending setupComplete: a refused key or model.
      socket.once("message", () => socket.close(1008, "rejected"));
    });
    const port = await listen(http);

    async function* frames(): AsyncIterable<Buffer> {
      yield Buffer.alloc(320);
    }

    const nl = new NeuroLink();
    try {
      const outcome = await Promise.race([
        (async () => {
          try {
            const result = await nl.stream({
              input: { audio: { frames: frames() } },
              provider: "google-ai",
              model: "gemini-2.5-flash-preview-native-audio-dialog",
              disableInternalFallback: true,
              credentials: {
                googleAiStudio: {
                  apiKey: "k",
                  baseURL: `http://127.0.0.1:${port}`,
                },
              },
            });
            for await (const chunk of result.stream) {
              void chunk;
            }
          } catch {
            // A rejection is a settled outcome: what is pinned is that it ends.
          }
          return "settled";
        })(),
        new Promise<string>((resolve) =>
          setTimeout(() => resolve("pending"), 20_000),
        ),
      ]);
      assert(
        connections > 0,
        "the audio branch never dialed the Live stand-in, so this case proves nothing",
      );
      assert(
        outcome === "settled",
        "the audio stream stayed pending after the Live server closed before setup",
      );
    } finally {
      await nl.shutdown();
      wss.clients.forEach((client) => client.terminate());
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => http.close(() => resolve()));
    }
  });
});

await runSuite();
