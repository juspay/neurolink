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
 * The same suite pins how the AI Studio client treats an embedding that comes
 * back without values (missing, or an empty array): the call rejects and names
 * the text's index, rather than handing back an empty vector that downstream
 * scoring would read as a zero. The Vertex client gets the same treatment for
 * `embedMany`, plus a check that the response holds one vector per text.
 *
 * Everything drives the shipped surface (`ProviderFactory`, `NeuroLink` from
 * `../dist/index.js`) against local stand-ins reached through the public
 * `credentials.googleAiStudio.baseURL` and, for Vertex Express Mode,
 * `credentials.vertex.baseURL`. No rule-15 exception: nothing is imported from
 * `src/`. The stand-ins buy what a real endpoint cannot give: a server that
 * accepts a WebSocket and then closes it before setup, one that reports how
 * many vectors a request asked for, and one that answers with an embedding
 * missing its values or with fewer predictions than instances.
 *
 * Assertion messages describe the discrepancy and never quote a response.
 *
 * Run: npx tsx test/continuous-test-suite-google-genai-sdk.ts
 *      pnpm run test:google-genai-sdk
 */

import "./helpers/credentialFreeEnv.js";
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
  "GOOGLE_VERTEX_API_KEY",
  "GOOGLE_VERTEX_BASE_URL",
  "GOOGLE_VERTEX_PROJECT",
  "GOOGLE_VERTEX_LOCATION",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_LOCATION",
  "VERTEX_PROJECT_ID",
  "VERTEX_LOCATION",
  "GOOGLE_APPLICATION_CREDENTIALS",
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

type ValuelessEmbedding = { text: string; as: "missing" | "empty" };

/**
 * Answers `:batchEmbedContents` with one vector per request, first character as
 * its value. The request whose text equals `valueless.text` gets an embedding
 * with no `values` field, or an empty `values` array, instead.
 */
async function startEmbeddingStandIn(valueless?: ValuelessEmbedding): Promise<{
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
          embeddings: requests.map((r) => {
            const text = r.content?.parts?.[0]?.text ?? "?";
            if (valueless && text === valueless.text) {
              return valueless.as === "empty" ? { values: [] } : {};
            }
            return { values: [text.charCodeAt(0)] };
          }),
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
): Promise<{ vectors: number[][] | undefined; message: string | undefined }> {
  await ProviderRegistry.registerAllProviders();
  let vectors: number[][] | undefined;
  let message: string | undefined;
  try {
    const provider = await ProviderFactory.createProvider(
      "google-ai",
      "gemini-2.0-flash",
      undefined,
      undefined,
      { googleAiStudio: { apiKey: "k", baseURL: origin } },
    );
    vectors = await provider.embedMany?.(texts, embeddingModel);
  } catch (error) {
    vectors = undefined;
    message = error instanceof Error ? error.message : String(error);
  }
  return { vectors, message };
}

async function embedThroughAiStudio(
  origin: string,
  embeddingModel: string,
  text: string,
): Promise<{ vector: number[] | undefined; message: string | undefined }> {
  await ProviderRegistry.registerAllProviders();
  let vector: number[] | undefined;
  let message: string | undefined;
  try {
    const provider = await ProviderFactory.createProvider(
      "google-ai",
      "gemini-2.0-flash",
      undefined,
      undefined,
      { googleAiStudio: { apiKey: "k", baseURL: origin } },
    );
    vector = await provider.embed?.(text, embeddingModel);
  } catch (error) {
    vector = undefined;
    message = error instanceof Error ? error.message : String(error);
  }
  return { vector, message };
}

type VertexEmbeddingFault =
  | { kind: "valueless"; text: string; as: "missing" | "empty" }
  | { kind: "short" };

/**
 * Answers Vertex's `:predict` for a `text-embedding-*` model: one prediction per
 * instance, the first character of the text as its only value. With a
 * `valueless` fault the prediction for `text` carries no `values` field, or an
 * empty array; with a `short` fault the last prediction is left out.
 */
async function startVertexEmbeddingStandIn(
  fault?: VertexEmbeddingFault,
): Promise<{ origin: string; close: () => Promise<void> }> {
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      if (!(req.url ?? "").split("?")[0].endsWith(":predict")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "unexpected route" } }));
        return;
      }
      let instances: Array<{ content?: string }> = [];
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          instances?: typeof instances;
        };
        instances = body.instances ?? [];
      } catch {
        instances = [];
      }
      const answered =
        fault?.kind === "short" ? instances.slice(0, -1) : instances;
      const statistics = { token_count: 1, truncated: false };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          predictions: answered.map((instance) => {
            const text = instance.content ?? "?";
            if (fault?.kind === "valueless" && text === fault.text) {
              return {
                embeddings:
                  fault.as === "empty"
                    ? { values: [], statistics }
                    : { statistics },
              };
            }
            return {
              embeddings: { values: [text.charCodeAt(0)], statistics },
            };
          }),
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

const VERTEX_EMBEDDING_MODEL = "text-embedding-004";

async function createVertexExpressProvider(origin: string) {
  await ProviderRegistry.registerAllProviders();
  return ProviderFactory.createProvider(
    "vertex",
    "gemini-2.0-flash",
    undefined,
    undefined,
    { vertex: { apiKey: "k", baseURL: origin } },
  );
}

async function embedManyThroughVertex(
  origin: string,
  texts: string[],
): Promise<{ vectors: number[][] | undefined; message: string | undefined }> {
  let vectors: number[][] | undefined;
  let message: string | undefined;
  try {
    const provider = await createVertexExpressProvider(origin);
    vectors = await provider.embedMany?.(texts, VERTEX_EMBEDDING_MODEL);
  } catch (error) {
    vectors = undefined;
    message = error instanceof Error ? error.message : String(error);
  }
  return { vectors, message };
}

async function embedThroughVertex(
  origin: string,
  text: string,
): Promise<{ vector: number[] | undefined; message: string | undefined }> {
  let vector: number[] | undefined;
  let message: string | undefined;
  try {
    const provider = await createVertexExpressProvider(origin);
    vector = await provider.embed?.(text, VERTEX_EMBEDDING_MODEL);
  } catch (error) {
    vector = undefined;
    message = error instanceof Error ? error.message : String(error);
  }
  return { vector, message };
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

section("AI Studio embeddings that come back without values are rejected");

const EMBEDDING_PATHS = [
  { label: "batch path", model: "gemini-embedding-001" },
  { label: "per-text path", model: "gemini-embedding-2-preview" },
] as const;

for (const path of EMBEDDING_PATHS) {
  for (const shape of ["missing", "empty"] as const) {
    await test(`embedMany rejects a ${shape} embedding and names its index (${path.label})`, async () => {
      await withCleanEnv(async () => {
        const standIn = await startEmbeddingStandIn({ text: "b", as: shape });
        try {
          const { vectors, message } = await embedManyThroughAiStudio(
            standIn.origin,
            path.model,
            ["a", "b", "c"],
          );
          assert(
            vectors === undefined,
            "embedMany returned vectors although one embedding had no values",
          );
          assert(
            message !== undefined,
            "embedMany did not reject an embedding without values",
          );
          assert(
            /\bindex 1\b/.test(message ?? ""),
            "the rejection did not name the index of the embedding without values",
          );
          assert(
            (message ?? "").includes("google-ai"),
            "the rejection did not name the provider",
          );
        } finally {
          await standIn.close();
        }
      });
    });
  }
}

await test("embedMany keeps the real index in the rejection for an index that looks like a status code", async () => {
  await withCleanEnv(async () => {
    const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
    const standIn = await startEmbeddingStandIn({ text: "t429", as: "empty" });
    try {
      const { vectors, message } = await embedManyThroughAiStudio(
        standIn.origin,
        "gemini-embedding-001",
        texts,
      );
      assert(
        vectors === undefined && message !== undefined,
        "embedMany did not reject an embedding without values in a large batch",
      );
      assert(
        /\bindex 429\b/.test(message ?? ""),
        "the rejection lost the index when it resembled a status code",
      );
      assert(
        !/rate limit/i.test(message ?? ""),
        "the rejection was reworded as a rate-limit error",
      );
    } finally {
      await standIn.close();
    }
  });
});

for (const shape of ["missing", "empty"] as const) {
  await test(`embed rejects a ${shape} embedding`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startEmbeddingStandIn({ text: "b", as: shape });
      try {
        const { vector, message } = await embedThroughAiStudio(
          standIn.origin,
          "gemini-embedding-001",
          "b",
        );
        assert(
          vector === undefined,
          "embed returned a vector although the embedding had no values",
        );
        assert(
          message !== undefined,
          "embed did not reject an embedding without values",
        );
      } finally {
        await standIn.close();
      }
    });
  });
}

await test("embed still returns the vector when the embedding has values", async () => {
  await withCleanEnv(async () => {
    const standIn = await startEmbeddingStandIn({ text: "b", as: "empty" });
    try {
      const { vector } = await embedThroughAiStudio(
        standIn.origin,
        "gemini-embedding-001",
        "a",
      );
      assert(
        vector !== undefined && vector.length === 1 && vector[0] === 97,
        "embed did not return the vector for a healthy embedding",
      );
    } finally {
      await standIn.close();
    }
  });
});

await test("embedMany still returns every vector when no embedding lacks values (stand-in set to reject another text)", async () => {
  await withCleanEnv(async () => {
    const standIn = await startEmbeddingStandIn({ text: "zzz", as: "missing" });
    try {
      const { vectors } = await embedManyThroughAiStudio(
        standIn.origin,
        "gemini-embedding-2-preview",
        ["a", "b", "c"],
      );
      assert(
        vectors !== undefined &&
          vectors.map((v) => v[0]).join(",") === "97,98,99",
        "embedMany did not return the healthy vectors in order",
      );
    } finally {
      await standIn.close();
    }
  });
});

section(
  "Vertex embeddings that come back without values or short are rejected",
);

await test("Vertex embedMany returns one vector per text, in order", async () => {
  await withCleanEnv(async () => {
    const standIn = await startVertexEmbeddingStandIn();
    try {
      const { vectors } = await embedManyThroughVertex(standIn.origin, [
        "a",
        "b",
        "c",
      ]);
      assert(vectors !== undefined, "Vertex embedMany did not return vectors");
      assert(
        (vectors ?? []).map((v) => v[0]).join(",") === "97,98,99",
        "Vertex embedMany did not return one vector per text, in order",
      );
    } finally {
      await standIn.close();
    }
  });
});

await test("Vertex embed returns the vector for a healthy embedding", async () => {
  await withCleanEnv(async () => {
    const standIn = await startVertexEmbeddingStandIn();
    try {
      const { vector } = await embedThroughVertex(standIn.origin, "a");
      assert(
        vector !== undefined && vector.length === 1 && vector[0] === 97,
        "Vertex embed did not return the vector for a healthy embedding",
      );
    } finally {
      await standIn.close();
    }
  });
});

for (const shape of ["missing", "empty"] as const) {
  await test(`Vertex embedMany rejects a ${shape} embedding and names its index`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startVertexEmbeddingStandIn({
        kind: "valueless",
        text: "b",
        as: shape,
      });
      try {
        const { vectors, message } = await embedManyThroughVertex(
          standIn.origin,
          ["a", "b", "c"],
        );
        assert(
          vectors === undefined,
          "Vertex embedMany returned vectors although one embedding had no values",
        );
        assert(
          message !== undefined,
          "Vertex embedMany did not reject an embedding without values",
        );
        assert(
          /\bindex 1\b/.test(message ?? ""),
          "the rejection did not name the index of the embedding without values",
        );
        assert(
          (message ?? "").includes("vertex"),
          "the rejection did not name the provider",
        );
      } finally {
        await standIn.close();
      }
    });
  });
}

await test("Vertex embedMany rejects a response with fewer vectors than texts and names the counts", async () => {
  await withCleanEnv(async () => {
    const standIn = await startVertexEmbeddingStandIn({ kind: "short" });
    try {
      const { vectors, message } = await embedManyThroughVertex(
        standIn.origin,
        ["a", "b", "c"],
      );
      assert(
        vectors === undefined,
        "Vertex embedMany returned vectors although the response held fewer than one per text",
      );
      assert(
        message !== undefined,
        "Vertex embedMany did not reject a response with fewer vectors than texts",
      );
      assert(
        /\b2 vectors for 3 texts\b/.test(message ?? ""),
        "the rejection did not name the number of vectors and texts",
      );
    } finally {
      await standIn.close();
    }
  });
});

await test("Vertex embedMany keeps the real index in the rejection for an index that looks like a status code", async () => {
  await withCleanEnv(async () => {
    const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
    const standIn = await startVertexEmbeddingStandIn({
      kind: "valueless",
      text: "t429",
      as: "empty",
    });
    try {
      const { vectors, message } = await embedManyThroughVertex(
        standIn.origin,
        texts,
      );
      assert(
        vectors === undefined && message !== undefined,
        "Vertex embedMany did not reject an embedding without values in a large batch",
      );
      assert(
        /\bindex 429\b/.test(message ?? ""),
        "the rejection lost the index when it resembled a status code",
      );
      assert(
        !/rate limit/i.test(message ?? ""),
        "the rejection was reworded as a rate-limit error",
      );
    } finally {
      await standIn.close();
    }
  });
});

// Vertex `embed` already refused these before this suite grew its embedMany
// cases, so they pin that behaviour rather than prove a change.
for (const shape of ["missing", "empty"] as const) {
  await test(`Vertex embed rejects a ${shape} embedding`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startVertexEmbeddingStandIn({
        kind: "valueless",
        text: "b",
        as: shape,
      });
      try {
        const { vector, message } = await embedThroughVertex(
          standIn.origin,
          "b",
        );
        assert(
          vector === undefined,
          "Vertex embed returned a vector although the embedding had no values",
        );
        assert(
          message !== undefined,
          "Vertex embed did not reject an embedding without values",
        );
      } finally {
        await standIn.close();
      }
    });
  });
}

await test("Vertex embedMany still returns every vector when no embedding lacks values (stand-in set to reject another text)", async () => {
  await withCleanEnv(async () => {
    const standIn = await startVertexEmbeddingStandIn({
      kind: "valueless",
      text: "zzz",
      as: "missing",
    });
    try {
      const { vectors } = await embedManyThroughVertex(standIn.origin, [
        "a",
        "b",
        "c",
      ]);
      assert(
        vectors !== undefined &&
          vectors.map((v) => v[0]).join(",") === "97,98,99",
        "Vertex embedMany did not return the healthy vectors in order",
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

// Owned Gemini Live fixture: exercises the public NeuroLink audio stream
// against a local WebSocket stand-in. Do not import internal provider modules.
const OWNED_LIVE_MODEL = "gemini-owned-live-fixture";
const OWNED_LIVE_KEY = "owned-live-not-a-real-key";
const OWNED_INPUT_FRAMES = [Buffer.alloc(640, 1), Buffer.alloc(640, 2)];
const OWNED_OUTPUT_FRAMES = [Buffer.alloc(480, 3), Buffer.alloc(480, 4)];

async function ownedLiveDeadline<T>(
  promise: Promise<T>,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `${label} did not settle within the owned fixture deadline`,
              ),
            ),
          5000,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function ownedLiveTurns(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function startOwnedLiveStandIn() {
  const observations = {
    connections: 0,
    active: 0,
    closes: 0,
    unexpectedHTTP: 0,
    validRoute: false,
    fakeKeyMatched: false,
    validSetup: false,
    acknowledged: false,
    mediaBeforeAck: false,
    serverInitiatedClose: false,
    cleanupStarted: false,
    outputSent: 0,
    media: [] as Array<{ data: string; mimeType: string }>,
  };
  let socket: import("ws").WebSocket | undefined;
  let setupResolve: () => void = () => {};
  let mediaResolve: () => void = () => {};
  let closeResolve: () => void = () => {};
  const setupObserved = new Promise<void>((resolve) => {
    setupResolve = resolve;
  });
  const mediaObserved = new Promise<void>((resolve) => {
    mediaResolve = resolve;
  });
  const peerClosed = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });
  const http = createServer((_req, res) => {
    observations.unexpectedHTTP++;
    res.writeHead(503, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: "Owned Live fixture rejects HTTP fallback" }),
    );
  });
  const wss = new WebSocketServer({ server: http });
  wss.on("connection", (peer, req) => {
    socket = peer;
    observations.connections++;
    observations.active++;
    const rawTarget = req.url ?? "";
    if (!rawTarget.startsWith("/")) {
      throw new Error("Owned Live request target is not origin-form");
    }
    const knownHost = `127.0.0.1:${port}`;
    const origin = `http://${knownHost}`;
    const target = new URL(origin + rawTarget);
    observations.validRoute =
      target.origin === origin &&
      req.headers.host === knownHost &&
      target.pathname ===
        "//ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
    observations.fakeKeyMatched =
      target.searchParams.get("key") === OWNED_LIVE_KEY;
    peer.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as {
        setup?: {
          model?: string;
          generationConfig?: { responseModalities?: string[] };
        };
        realtimeInput?: {
          mediaChunks?: Array<{ data?: string; mimeType?: string }>;
        };
      };
      if (message.setup) {
        observations.validSetup =
          message.setup.model === `models/${OWNED_LIVE_MODEL}` &&
          message.setup.generationConfig?.responseModalities?.includes(
            "AUDIO",
          ) === true;
        setupResolve();
      }
      for (const media of message.realtimeInput?.mediaChunks ?? []) {
        if (!observations.acknowledged) {
          observations.mediaBeforeAck = true;
        }
        observations.media.push({
          data: media.data ?? "",
          mimeType: media.mimeType ?? "",
        });
      }
      if (observations.media.length >= OWNED_INPUT_FRAMES.length) {
        mediaResolve();
      }
    });
    peer.on("close", () => {
      observations.active--;
      observations.closes++;
      closeResolve();
    });
  });
  const port = await listen(http);
  return {
    origin: `http://127.0.0.1:${port}`,
    observations,
    setupObserved,
    mediaObserved,
    peerClosed,
    acknowledge() {
      const peer = socket;
      if (!peer) {
        throw new Error("Owned Live setup has no socket");
      }
      observations.acknowledged = true;
      peer.send(JSON.stringify({ setupComplete: {} }));
    },
    audio(index: number) {
      const peer = socket;
      if (!peer) {
        throw new Error("Owned Live output has no socket");
      }
      const frame = OWNED_OUTPUT_FRAMES[index];
      assert(frame !== undefined, "Owned Live output index is invalid");
      observations.outputSent++;
      peer.send(
        JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [
                {
                  inlineData: {
                    data: frame.toString("base64"),
                    mimeType: "audio/pcm;rate=24000",
                  },
                },
              ],
            },
          },
        }),
      );
    },
    end() {
      const peer = socket;
      if (!peer) {
        throw new Error("Owned Live close has no socket");
      }
      observations.serverInitiatedClose = true;
      peer.close(1000, "ordinary owned completion");
    },
    async cleanup() {
      // These are backstops, never evidence that the public caller cancelled.
      observations.cleanupStarted = true;
      wss.clients.forEach((client) => client.terminate());
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      http.closeAllConnections();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}

function assertOwnedInput(
  observations: Awaited<
    ReturnType<typeof startOwnedLiveStandIn>
  >["observations"],
): void {
  assert(
    observations.connections === 1 &&
      observations.validRoute &&
      observations.fakeKeyMatched &&
      observations.validSetup,
    "Owned Live route/setup identity was not reached",
  );
  assert(
    !observations.mediaBeforeAck &&
      observations.media.length === OWNED_INPUT_FRAMES.length,
    "Owned Live input ordering/count changed",
  );
  observations.media.forEach((media, index) => {
    assert(
      media.mimeType === "audio/pcm;rate=16000" &&
        Buffer.from(media.data, "base64").equals(OWNED_INPUT_FRAMES[index]),
      "Owned Live input bytes or format changed",
    );
  });
  assert(
    observations.unexpectedHTTP === 0,
    "Audio path attempted HTTP fallback",
  );
}

function assertOwnedAudio(value: unknown, index: number): void {
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    value.type !== "audio" ||
    !("audio" in value) ||
    !value.audio ||
    typeof value.audio !== "object"
  ) {
    throw new Error("Owned Live returned a non-audio public chunk");
  }
  const audio = value.audio as {
    data?: unknown;
    sampleRateHz?: unknown;
    channels?: unknown;
    encoding?: unknown;
  };
  assert(
    Buffer.isBuffer(audio.data) &&
      audio.data.equals(OWNED_OUTPUT_FRAMES[index]),
    "Owned Live public output bytes differ",
  );
  assert(
    audio.sampleRateHz === 24000 &&
      audio.channels === 1 &&
      audio.encoding === "PCM16LE",
    "Owned Live public output format differs",
  );
}

async function ownedLiveFrames(): Promise<AsyncIterable<Buffer>> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const frame of OWNED_INPUT_FRAMES) {
        yield frame;
      }
    },
  };
}

section("AI Studio successful owned Live audio and lifecycle");

await test("owned Live setup, PCM roundtrip and pending close drain", async () => {
  await withCleanEnv(async () => {
    const fixture = await startOwnedLiveStandIn();
    const nl = new NeuroLink();
    try {
      const starting = nl.stream({
        input: {
          audio: {
            frames: await ownedLiveFrames(),
            sampleRateHz: 16000,
            encoding: "PCM16LE",
            channels: 1,
          },
        },
        provider: "google-ai",
        model: OWNED_LIVE_MODEL,
        disableInternalFallback: true,
        disableTools: true,
        credentials: {
          googleAiStudio: { apiKey: OWNED_LIVE_KEY, baseURL: fixture.origin },
        },
      });
      await ownedLiveDeadline(fixture.setupObserved, "client setup");
      fixture.acknowledge();
      const result = await ownedLiveDeadline(starting, "public Live setup");
      assert(
        result.provider === "google-ai" && result.model === OWNED_LIVE_MODEL,
        "Public Live resolved identity changed",
      );
      await ownedLiveDeadline(fixture.mediaObserved, "input PCM");
      assertOwnedInput(fixture.observations);
      const iterator = result.stream[Symbol.asyncIterator]();
      for (let index = 0; index < OWNED_OUTPUT_FRAMES.length; index++) {
        const waiting = iterator.next();
        fixture.audio(index);
        const item = await ownedLiveDeadline(waiting, "output PCM");
        assert(!item.done, "Public Live ended before expected audio");
        assertOwnedAudio(item.value, index);
      }
      let endedBeforeClose = false;
      const pendingEnd = iterator.next().then((item) => {
        endedBeforeClose = true;
        return item;
      });
      await ownedLiveTurns();
      assert(
        !endedBeforeClose,
        "Owned close case had no pending public consumer",
      );
      fixture.end();
      const end = await ownedLiveDeadline(pendingEnd, "pending consumer close");
      assert(end.done === true, "Public Live iterator did not finish");
      await ownedLiveDeadline(fixture.peerClosed, "ordinary peer close");
      assert(
        fixture.observations.active === 0 &&
          !fixture.observations.cleanupStarted,
        "Normal drain required backstop cleanup",
      );
    } finally {
      try {
        await ownedLiveDeadline(nl.shutdown(), "SDK shutdown");
      } finally {
        await fixture.cleanup();
      }
    }
  });
});

await test("owned Live delayed setup gates frames until acknowledgement", async () => {
  await withCleanEnv(async () => {
    const fixture = await startOwnedLiveStandIn();
    const nl = new NeuroLink();
    let resolved = false;
    try {
      const starting = nl
        .stream({
          input: {
            audio: { frames: await ownedLiveFrames(), sampleRateHz: 16000 },
          },
          provider: "google-ai",
          model: OWNED_LIVE_MODEL,
          disableInternalFallback: true,
          disableTools: true,
          credentials: {
            googleAiStudio: { apiKey: OWNED_LIVE_KEY, baseURL: fixture.origin },
          },
        })
        .then((result) => {
          resolved = true;
          return result;
        });
      await ownedLiveDeadline(fixture.setupObserved, "delayed setup observed");
      await ownedLiveTurns();
      assert(
        !resolved && fixture.observations.media.length === 0,
        "Live sent frames or resolved before setup acknowledgement",
      );
      fixture.acknowledge();
      const result = await ownedLiveDeadline(starting, "released setup");
      await ownedLiveDeadline(fixture.mediaObserved, "released input frames");
      assertOwnedInput(fixture.observations);
      const iterator = result.stream[Symbol.asyncIterator]();
      const first = iterator.next();
      fixture.audio(0);
      assertOwnedAudio(
        (await ownedLiveDeadline(first, "delayed output")).value,
        0,
      );
      let endedBeforeClose = false;
      const pendingEnd = iterator.next().then((item) => {
        endedBeforeClose = true;
        return item;
      });
      await ownedLiveTurns();
      assert(
        !endedBeforeClose,
        "Delayed close case had no pending public consumer",
      );
      fixture.end();
      assert(
        (await ownedLiveDeadline(pendingEnd, "delayed completion")).done ===
          true,
        "Delayed Live did not finish",
      );
      await ownedLiveDeadline(fixture.peerClosed, "delayed peer close");
    } finally {
      try {
        await ownedLiveDeadline(nl.shutdown(), "SDK shutdown");
      } finally {
        await fixture.cleanup();
      }
    }
  });
});

await test("owned Live caller abort closes the actual ready peer", async () => {
  await withCleanEnv(async () => {
    const fixture = await startOwnedLiveStandIn();
    const nl = new NeuroLink();
    const controller = new AbortController();
    try {
      const starting = nl.stream({
        input: {
          audio: { frames: await ownedLiveFrames(), sampleRateHz: 16000 },
        },
        provider: "google-ai",
        model: OWNED_LIVE_MODEL,
        abortSignal: controller.signal,
        disableInternalFallback: true,
        disableTools: true,
        credentials: {
          googleAiStudio: { apiKey: OWNED_LIVE_KEY, baseURL: fixture.origin },
        },
      });
      await ownedLiveDeadline(fixture.setupObserved, "abort setup");
      fixture.acknowledge();
      const result = await ownedLiveDeadline(starting, "abort-ready stream");
      await ownedLiveDeadline(fixture.mediaObserved, "abort input");
      assertOwnedInput(fixture.observations);
      const iterator = result.stream[Symbol.asyncIterator]();
      let settledBeforeAbort = false;
      const outcome = iterator.next().then(
        () => {
          settledBeforeAbort = true;
          return "settled";
        },
        () => {
          settledBeforeAbort = true;
          return "settled";
        },
      );
      await ownedLiveTurns();
      assert(!settledBeforeAbort, "Abort case had no pending public consumer");
      controller.abort();
      assert(
        (await ownedLiveDeadline(outcome, "caller abort outcome")) ===
          "settled",
        "Caller abort left public next pending",
      );
      await ownedLiveDeadline(fixture.peerClosed, "caller abort peer close");
      assert(
        !fixture.observations.serverInitiatedClose &&
          fixture.observations.active === 0 &&
          !fixture.observations.cleanupStarted,
        "Caller abort did not release the actual transport",
      );
    } finally {
      try {
        await ownedLiveDeadline(nl.shutdown(), "SDK shutdown");
      } finally {
        await fixture.cleanup();
      }
    }
  });
});

await test("owned Live consumer return releases the actual peer", async () => {
  await withCleanEnv(async () => {
    const fixture = await startOwnedLiveStandIn();
    const nl = new NeuroLink();
    try {
      const starting = nl.stream({
        input: {
          audio: { frames: await ownedLiveFrames(), sampleRateHz: 16000 },
        },
        provider: "google-ai",
        model: OWNED_LIVE_MODEL,
        disableInternalFallback: true,
        disableTools: true,
        credentials: {
          googleAiStudio: { apiKey: OWNED_LIVE_KEY, baseURL: fixture.origin },
        },
      });
      await ownedLiveDeadline(fixture.setupObserved, "return setup");
      fixture.acknowledge();
      const result = await ownedLiveDeadline(starting, "return-ready stream");
      await ownedLiveDeadline(fixture.mediaObserved, "return input");
      assertOwnedInput(fixture.observations);
      const iterator = result.stream[Symbol.asyncIterator]();
      const first = iterator.next();
      fixture.audio(0);
      assertOwnedAudio(
        (await ownedLiveDeadline(first, "return output")).value,
        0,
      );
      const release = iterator.return;
      if (typeof release !== "function") {
        throw new Error("Public Live iterator has no return method");
      }
      await ownedLiveDeadline(release.call(iterator), "consumer return");
      await ownedLiveDeadline(fixture.peerClosed, "consumer return peer close");
      assert(
        !fixture.observations.serverInitiatedClose &&
          fixture.observations.active === 0 &&
          !fixture.observations.cleanupStarted,
        "Consumer return needed backstop transport closure",
      );
    } finally {
      try {
        await ownedLiveDeadline(nl.shutdown(), "SDK shutdown");
      } finally {
        await fixture.cleanup();
      }
    }
  });
});

await runSuite();
