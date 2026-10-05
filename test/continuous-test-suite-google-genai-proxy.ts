#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Google GenAI SDK requests and the configured proxy.
 *
 * Both Google providers (AI Studio, and Vertex in Express Mode) send their
 * requests through the `@google/genai` SDK. With HTTP_PROXY / HTTPS_PROXY set,
 * that traffic has to go through the proxy, the way every other provider's
 * does, and NO_PROXY has to keep local endpoints direct.
 *
 * Everything drives the shipped surface: `NeuroLink` from `../dist/index.js`,
 * no imports out of `src/`, nothing stubbed. No rule-15 exception. The real SDK
 * is pointed, through the public `credentials.<provider>.baseURL`, at a name
 * that cannot resolve (`genai-upstream.invalid`), so a request that does not
 * go through the proxy has nowhere to land.
 *
 * What the fake forward proxy buys: a live proxy would need network access and
 * could not tell "went through the proxy" from "the proxy path failed and the
 * proxied fetch fell back to a direct connection". Here the answer text itself
 * is the evidence: only the proxy replies with PROXY_MARKER, and it can only
 * be reached by way of the proxy, because the upstream name does not resolve.
 * The proxy accepts both transports undici may use for a plain-HTTP target
 * (absolute-URI forwarding and CONNECT tunnelling) so the suite does not
 * depend on which one it picks.
 *
 * Things that are deliberate and load-bearing:
 *
 *  - Every stream goes through `drainOrFail`, which discards whatever was
 *    thrown and raises a fixed message instead. Without the proxy the SDK
 *    sends the request straight at the unresolvable name, and a resolver or
 *    network error text is exactly what the harness reads as a SKIP, which
 *    would let a regression print a skip and exit 0.
 *  - Env is snapshotted and restored per case, and the proxy variables and
 *    every endpoint override are cleared, so an ambient value cannot change
 *    what a case exercises.
 *  - `disableInternalFallback` on every case, so a failed turn cannot be
 *    rescued by a different provider that happens to have credentials.
 *  - No provider wording and no payload in assertion messages.
 *
 * Not covered, and not claimed: the GoogleGenAI clients built outside the two
 * providers (video analysis, direct tools), Gemini Live websockets, and the
 * Vertex ADC token requests. None of them goes through the SDK's fetch hook.
 *
 * Run: npx tsx test/continuous-test-suite-google-genai-proxy.ts
 *      pnpm run test:google-genai-proxy
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite("Google GenAI proxy", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";
const UPSTREAM_HOST = "genai-upstream.invalid";
const UPSTREAM_ORIGIN = `http://${UPSTREAM_HOST}`;
const PROXY_MARKER = "PROXY_MARKER_7f3a";
const DIRECT_MARKER = "DIRECT_MARKER_91c2";
const EXPRESS_KEY = "express-key";
const API_KEY_HEADER = "x-goog-api-key";

const NO_ANSWER_VIA_PROXY = "no answer came through the configured proxy";
const NO_ANSWER_DIRECT = "the direct stand-in returned no answer";

/**
 * Whether the process was started with Node's own env-proxy support. That is
 * read at startup, so clearing it per case would do nothing: global `fetch`
 * would keep honouring HTTP_PROXY by itself, and a request that bypasses
 * NeuroLink's proxy handling would still reach the fake proxy. Captured before
 * any env is touched.
 */
const GLOBAL_FETCH_PROXIES_ITSELF =
  /^(1|true|yes)$/i.test(process.env.NODE_USE_ENV_PROXY ?? "") ||
  [...process.execArgv, ...(process.env.NODE_OPTIONS ?? "").split(/\s+/)].some(
    (arg) => arg === "--use-env-proxy",
  );

const TOUCHED_ENV_VARS = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
  "NO_PROXY",
  "no_proxy",
  "NODE_USE_ENV_PROXY",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
  "GOOGLE_API_KEY",
  "GOOGLE_VERTEX_BASE_URL",
  "GOOGLE_VERTEX_API_KEY",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "VERTEX_PROJECT_ID",
  "GOOGLE_VERTEX_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "VERTEX_LOCATION",
  "GOOGLE_VERTEX_LOCATION",
  "GOOGLE_APPLICATION_CREDENTIALS",
] as const;

/** Clears every touched variable, applies `set`, and returns the restorer. */
function withEnv(set: Record<string, string> = {}): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(set)) {
    saved[key] ??= process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const key of Object.keys(saved)) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

function sse(text: string): string {
  const payload = {
    candidates: [
      {
        content: { parts: [{ text }], role: "model" },
        finishReason: "STOP",
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

type ServedCall = {
  /** The upstream the request was addressed to, `host[:port]`. */
  host: string;
  /** Request path without the query string. */
  path: string;
  apiKeyHeader: string | undefined;
};

type FakeServer = {
  calls: ServedCall[];
  port: number;
  close: () => Promise<void>;
};

function answer(
  req: IncomingMessage,
  res: ServerResponse,
  host: string,
  path: string,
  marker: string,
  calls: ServedCall[],
): void {
  req.resume();
  req.on("end", () => {
    const header = req.headers[API_KEY_HEADER];
    calls.push({
      host,
      path,
      apiKeyHeader: Array.isArray(header) ? header[0] : header,
    });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(sse(marker));
  });
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

function closer(server: Server, sockets: Set<Socket>): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.closeAllConnections?.();
      server.close(() => resolve());
    });
}

/**
 * The direct upstream. Answers every request it receives with DIRECT_MARKER.
 */
async function startDirectStandIn(): Promise<FakeServer> {
  const calls: ServedCall[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((req, res) => {
    answer(
      req,
      res,
      req.headers.host ?? "",
      String(req.url ?? "").split("?")[0],
      DIRECT_MARKER,
      calls,
    );
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  const port = await listen(server);
  return { calls, port, close: closer(server, sockets) };
}

/**
 * A forward proxy. Answers every request that reaches it with PROXY_MARKER and
 * records which upstream the request was addressed to. A plain-HTTP target
 * arrives either as an absolute-URI request or, when undici tunnels, as a
 * CONNECT followed by an ordinary request on the tunnelled socket; both are
 * handled and attributed to the upstream they name.
 */
async function startForwardProxy(): Promise<FakeServer> {
  const calls: ServedCall[] = [];
  const sockets = new Set<Socket>();
  const tunnelledHost = new WeakMap<Duplex, string>();

  const inner = createServer((req, res) => {
    answer(
      req,
      res,
      tunnelledHost.get(req.socket) ?? req.headers.host ?? "",
      String(req.url ?? "").split("?")[0],
      PROXY_MARKER,
      calls,
    );
  });

  const server = createServer((req, res) => {
    let host = req.headers.host ?? "";
    let path = String(req.url ?? "");
    try {
      const target = new URL(path);
      host = target.host;
      path = target.pathname;
    } catch {
      path = path.split("?")[0];
    }
    answer(req, res, host, path, PROXY_MARKER, calls);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("connect", (req, clientSocket, head) => {
    tunnelledHost.set(clientSocket, String(req.url ?? ""));
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      clientSocket.unshift(head);
    }
    inner.emit("connection", clientSocket);
  });

  const port = await listen(server);
  const closeOuter = closer(server, sockets);
  return {
    calls,
    port,
    close: async () => {
      await closeOuter();
      inner.closeAllConnections?.();
      await new Promise<void>((resolve) => inner.close(() => resolve()));
    },
  };
}

type StreamLike = { stream: AsyncIterable<unknown> };

/**
 * Starts the stream and drains it. On ANY failure the caught error is
 * discarded unread and a fixed message is raised in its place: the harness
 * turns a thrown message that reads like a resolver or network failure into a
 * SKIP, and that is the very failure a request that skipped the proxy
 * produces.
 */
async function drainOrFail(
  run: () => Promise<StreamLike>,
  failMessage: string,
): Promise<string> {
  try {
    const result = await run();
    let text = "";
    for await (const chunk of result.stream) {
      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "content" in chunk &&
        typeof chunk.content === "string"
      ) {
        text += chunk.content;
      }
    }
    return text;
  } catch {
    throw new Error(failMessage);
  }
}

function aiStudioCredentials(baseURL: string) {
  return { googleAiStudio: { apiKey: "k", baseURL } };
}

function vertexCredentials(baseURL: string) {
  return { vertex: { apiKey: EXPRESS_KEY, baseURL } };
}

function streamFrom(
  provider: "google-ai" | "vertex",
  credentials:
    | ReturnType<typeof aiStudioCredentials>
    | ReturnType<typeof vertexCredentials>,
): Promise<StreamLike> {
  return new NeuroLink().stream({
    input: { text: "hi" },
    provider,
    model: MODEL,
    maxTokens: 32,
    disableInternalFallback: true,
    credentials,
  });
}

function assertGlobalFetchDoesNotProxyItself(): void {
  assert(
    !GLOBAL_FETCH_PROXIES_ITSELF,
    "this process proxies global fetch on its own, so a request that bypasses the proxy handling cannot be told apart; unset NODE_USE_ENV_PROXY and --use-env-proxy",
  );
}

section("requests go through the configured proxy");

await test("Google GenAI proxy: AI Studio traffic goes through HTTP_PROXY", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const proxy = await startForwardProxy();
  const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
  try {
    const text = await drainOrFail(
      () => streamFrom("google-ai", aiStudioCredentials(UPSTREAM_ORIGIN)),
      NO_ANSWER_VIA_PROXY,
    );
    assert(
      text.includes(PROXY_MARKER),
      "the answer did not come through the configured proxy",
    );
    assert(
      proxy.calls.length >= 1,
      "the proxy received no request from the provider",
    );
    assert(
      (proxy.calls[0]?.host ?? "").startsWith(UPSTREAM_HOST),
      "the proxy was asked for a different upstream than the configured endpoint",
    );
    assert(
      (proxy.calls[0]?.path ?? "").includes(`/models/${MODEL}:`),
      "the proxied request did not address the requested model",
    );
  } finally {
    restore();
    await proxy.close();
  }
});

await test("Google GenAI proxy: Vertex Express traffic goes through HTTP_PROXY", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const proxy = await startForwardProxy();
  const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
  try {
    const text = await drainOrFail(
      () => streamFrom("vertex", vertexCredentials(UPSTREAM_ORIGIN)),
      NO_ANSWER_VIA_PROXY,
    );
    assert(
      text.includes(PROXY_MARKER),
      "the answer did not come through the configured proxy",
    );
    assert(
      proxy.calls.length >= 1,
      "the proxy received no request from the provider",
    );
    assert(
      (proxy.calls[0]?.host ?? "").startsWith(UPSTREAM_HOST),
      "the proxy was asked for a different upstream than the configured endpoint",
    );
    assert(
      (proxy.calls[0]?.path ?? "").includes(`/models/${MODEL}:`),
      "the proxied request did not address the requested model",
    );
    assert(
      proxy.calls[0]?.apiKeyHeader === EXPRESS_KEY,
      "the proxied request did not carry the Express Mode key",
    );
  } finally {
    restore();
    await proxy.close();
  }
});

section("controls: the proxy is not used when it should not be");

await test("Google GenAI proxy: NO_PROXY keeps a local endpoint direct", async () => {
  const proxy = await startForwardProxy();
  const direct = await startDirectStandIn();
  const restore = withEnv({
    HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
    NO_PROXY: "127.0.0.1",
  });
  try {
    const text = await drainOrFail(
      () =>
        streamFrom(
          "google-ai",
          aiStudioCredentials(`http://127.0.0.1:${direct.port}`),
        ),
      NO_ANSWER_DIRECT,
    );
    assert(
      text.includes(DIRECT_MARKER),
      "the answer for a NO_PROXY endpoint did not come from that endpoint",
    );
    assert(
      direct.calls.length >= 1,
      "the NO_PROXY endpoint received no request",
    );
    assert(
      proxy.calls.length === 0,
      `a NO_PROXY endpoint was still sent through the proxy (${proxy.calls.length} requests)`,
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

await test("Google GenAI proxy: with no proxy configured the request path is unchanged", async () => {
  const proxy = await startForwardProxy();
  const direct = await startDirectStandIn();
  const restore = withEnv();
  try {
    const text = await drainOrFail(
      () =>
        streamFrom(
          "google-ai",
          aiStudioCredentials(`http://127.0.0.1:${direct.port}`),
        ),
      NO_ANSWER_DIRECT,
    );
    assert(
      text.includes(DIRECT_MARKER),
      "the answer without a proxy did not come from the configured endpoint",
    );
    assert(
      direct.calls.length >= 1,
      "the configured endpoint received no request",
    );
    assert(
      proxy.calls.length === 0,
      `a request was sent through a proxy that was not configured (${proxy.calls.length} requests)`,
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

await runSuite();
