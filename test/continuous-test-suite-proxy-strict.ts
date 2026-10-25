#!/usr/bin/env tsx

/**
 * Continuous Test Suite — strict (fail-closed) proxy mode.
 *
 * With a proxy configured, a request whose proxy attempt fails used to be
 * retried over a direct connection, always. NEUROLINK_PROXY_STRICT makes that
 * "proxy or nothing": the request fails and nothing goes out directly. The
 * default must not change, so every strict case has a default-mode twin that
 * pins the fallback.
 *
 * Everything drives the shipped surface: `NeuroLink` and `DeepgramSTT` from
 * `../dist/index.js`, no imports out of `src/`, nothing stubbed. No rule-15
 * exception. Model requests go to Google AI Studio through the public
 * `credentials.googleAiStudio.baseURL`, pointed at a loopback stand-in that
 * counts what reaches it. That count is the evidence: a direct connection is
 * exactly a request the stand-in receives, so "nothing went direct" is
 * `direct.calls === 0`, asserted only after a precondition shows the request
 * was made (the twin in default mode reaches the stand-in through the same
 * path).
 *
 * The failing proxies are: a loopback port nothing listens on (unreachable),
 * a `socks5://` URL (recognized but not supported), and a URL that does not
 * parse. The working proxy is a fake forward proxy that answers with its own
 * marker, so a strict-mode request that does go through it is told apart
 * from one that went direct.
 *
 * The voice WebSocket clients are built without a proxy agent, so they always
 * connect directly. Deepgram's streaming client stands for them: under strict
 * mode it must refuse to connect while a proxy applies to its endpoint, and
 * connect as before when NO_PROXY exempts it or strict mode is off.
 *
 * Every NeuroLink call goes through `drainOrFail`, which discards the thrown
 * error unread and raises a fixed message: a resolver or connection-refused
 * text is exactly what the harness reads as a SKIP.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-proxy-strict.ts
 *      pnpm run test:proxy-strict
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import { WebSocketServer } from "ws";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

// The repository's .mcp-config.json would start an MCP server through npx,
// whose own downloads go through the failing proxies below and hold every
// case for the MCP connect timeout. Nothing here exercises MCP.
process.env.NEUROLINK_SKIP_MCP = "true";

const { test, section, runSuite } = defineSuite("Proxy strict mode", {
  offline: true,
});

const { NeuroLink, DeepgramSTT } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";
const PROXY_MARKER = "PROXY_MARKER_4b1e";
const DIRECT_MARKER = "DIRECT_MARKER_c83d";
const REQUEST_FAILED = "the request failed";

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
  "NEUROLINK_PROXY_STRICT",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
  "GOOGLE_API_KEY",
  "GOOGLE_GEMINI_BASE_URL",
  "DEEPGRAM_API_KEY",
  "DEEPGRAM_BASE_URL",
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

function generateContentPayload(text: string) {
  return {
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
}

type FakeServer = {
  calls: number;
  port: number;
  close: () => Promise<void>;
};

function answer(
  req: IncomingMessage,
  res: ServerResponse,
  marker: string,
  count: () => void,
): void {
  req.resume();
  req.on("end", () => {
    count();
    const path = String(req.url ?? "").split("?")[0];
    if (path.endsWith(":generateContent")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(generateContentPayload(marker)));
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(generateContentPayload(marker))}\r\n\r\n`);
  });
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

function track(server: Server): () => Promise<void> {
  const sockets = new Set<Socket>();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  return () =>
    new Promise<void>((resolve) => {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.closeAllConnections?.();
      server.close(() => resolve());
    });
}

/** The direct upstream: answers with DIRECT_MARKER and counts requests. */
async function startDirectStandIn(): Promise<FakeServer> {
  const state: FakeServer = { calls: 0, port: 0, close: async () => {} };
  const server = createServer((req, res) =>
    answer(req, res, DIRECT_MARKER, () => {
      state.calls++;
    }),
  );
  state.close = track(server);
  state.port = await listen(server);
  return state;
}

/**
 * A forward proxy that answers every request itself with PROXY_MARKER, for
 * both absolute-URI forwarding and CONNECT tunnelling.
 */
async function startForwardProxy(): Promise<FakeServer> {
  const state: FakeServer = { calls: 0, port: 0, close: async () => {} };
  const count = () => {
    state.calls++;
  };
  const inner = createServer((req, res) =>
    answer(req, res, PROXY_MARKER, count),
  );
  const server = createServer((req, res) =>
    answer(req, res, PROXY_MARKER, count),
  );
  server.on("connect", (_req, clientSocket, head) => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      clientSocket.unshift(head);
    }
    inner.emit("connection", clientSocket);
  });
  const closeOuter = track(server);
  state.port = await listen(server);
  state.close = async () => {
    await closeOuter();
    inner.closeAllConnections?.();
    await new Promise<void>((resolve) => inner.close(() => resolve()));
  };
  return state;
}

/** A loopback port with nothing listening on it: connections are refused. */
async function unusedPort(): Promise<number> {
  const server = createServer();
  const port = await listen(server);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

type StreamLike = { stream: AsyncIterable<unknown> };

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

function streamTo(directPort: number): Promise<StreamLike> {
  return new NeuroLink().stream({
    input: { text: "hi" },
    provider: "google-ai",
    model: MODEL,
    maxTokens: 32,
    disableInternalFallback: true,
    credentials: {
      googleAiStudio: {
        apiKey: "k",
        baseURL: `http://127.0.0.1:${directPort}`,
      },
    },
  });
}

/** Resolves to whether the stream failed (true) or answered (false). */
async function failed(directPort: number): Promise<boolean> {
  try {
    await drainOrFail(() => streamTo(directPort), REQUEST_FAILED);
    return false;
  } catch {
    return true;
  }
}

function assertGlobalFetchDoesNotProxyItself(): void {
  assert(
    !GLOBAL_FETCH_PROXIES_ITSELF,
    "this process proxies global fetch on its own; unset NODE_USE_ENV_PROXY and --use-env-proxy",
  );
}

const FAILING_PROXIES: Array<[string, () => Promise<string>]> = [
  [
    "an unreachable proxy",
    async () => `http://127.0.0.1:${await unusedPort()}`,
  ],
  ["a SOCKS proxy URL", async () => "socks5://127.0.0.1:1080"],
  ["an unparsable proxy URL", async () => "http://[not-a-host"],
];

section("default mode keeps the direct fallback");

for (const [label, proxyUrl] of FAILING_PROXIES) {
  await test(`Proxy strict: default mode, ${label}, falls back to a direct connection`, async () => {
    assertGlobalFetchDoesNotProxyItself();
    const direct = await startDirectStandIn();
    const proxy = await proxyUrl();
    const restore = withEnv({ HTTP_PROXY: proxy, HTTPS_PROXY: proxy });
    try {
      const text = await drainOrFail(
        () => streamTo(direct.port),
        "the request failed instead of falling back to a direct connection",
      );
      assert(
        text.includes(DIRECT_MARKER),
        "the answer did not come from the direct stand-in",
      );
      assert(direct.calls >= 1, "the direct stand-in received no request");
    } finally {
      restore();
      await direct.close();
    }
  });
}

await test("Proxy strict: an unrecognized NEUROLINK_PROXY_STRICT value keeps the fallback", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const direct = await startDirectStandIn();
  const proxy = `http://127.0.0.1:${await unusedPort()}`;
  const restore = withEnv({
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    NEUROLINK_PROXY_STRICT: "false",
  });
  try {
    const text = await drainOrFail(
      () => streamTo(direct.port),
      "the request failed instead of falling back to a direct connection",
    );
    assert(
      text.includes(DIRECT_MARKER),
      "the answer did not come from the direct stand-in",
    );
  } finally {
    restore();
    await direct.close();
  }
});

section("strict mode fails closed");

for (const [label, proxyUrl] of FAILING_PROXIES) {
  await test(`Proxy strict: NEUROLINK_PROXY_STRICT, ${label}, fails without a direct connection`, async () => {
    assertGlobalFetchDoesNotProxyItself();
    const direct = await startDirectStandIn();
    const proxy = await proxyUrl();
    const restore = withEnv({
      HTTP_PROXY: proxy,
      HTTPS_PROXY: proxy,
      NEUROLINK_PROXY_STRICT: "true",
    });
    try {
      assert(
        await failed(direct.port),
        "the request succeeded although its proxy could not be used",
      );
      assert(
        direct.calls === 0,
        "a request reached the upstream over a direct connection",
      );
    } finally {
      restore();
      await direct.close();
    }
  });
}

await test("Proxy strict: strict mode still sends requests through a working proxy", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const direct = await startDirectStandIn();
  const proxy = await startForwardProxy();
  const proxyUrl = `http://127.0.0.1:${proxy.port}`;
  const restore = withEnv({
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    NEUROLINK_PROXY_STRICT: "1",
  });
  try {
    const text = await drainOrFail(
      () => streamTo(direct.port),
      "no answer came through the configured proxy",
    );
    assert(
      text.includes(PROXY_MARKER),
      "the answer did not come through the configured proxy",
    );
    assert(proxy.calls >= 1, "the proxy received no request");
    assert(direct.calls === 0, "a request also went out directly");
  } finally {
    restore();
    await direct.close();
    await proxy.close();
  }
});

await test("Proxy strict: strict mode leaves a NO_PROXY host direct", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const direct = await startDirectStandIn();
  const proxy = `http://127.0.0.1:${await unusedPort()}`;
  const restore = withEnv({
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    NO_PROXY: "127.0.0.1",
    NEUROLINK_PROXY_STRICT: "true",
  });
  try {
    const text = await drainOrFail(
      () => streamTo(direct.port),
      "a NO_PROXY request failed under strict mode",
    );
    assert(
      text.includes(DIRECT_MARKER),
      "the answer did not come from the direct stand-in",
    );
  } finally {
    restore();
    await direct.close();
  }
});

section("voice WebSockets");

type WsStandIn = {
  connections: number;
  port: number;
  close: () => Promise<void>;
};

/** A WebSocket endpoint that counts upgrades and closes each one at once. */
async function startWsStandIn(): Promise<WsStandIn> {
  const server = createServer();
  const wss = new WebSocketServer({ server });
  const state: WsStandIn = { connections: 0, port: 0, close: async () => {} };
  wss.on("connection", (socket) => {
    state.connections++;
    socket.close();
  });
  const closeHttp = track(server);
  state.port = await listen(server);
  state.close = async () => {
    for (const client of wss.clients) {
      client.terminate();
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await closeHttp();
  };
  return state;
}

async function* noAudio(): AsyncIterable<Buffer> {
  // An empty recording: the stand-in closes the socket before any is needed.
}

/** Opens a Deepgram stream to the stand-in; true when it threw. */
async function deepgramStreamThrew(port: number): Promise<boolean> {
  const stt = new DeepgramSTT({
    apiKey: "k",
    baseURL: `http://127.0.0.1:${port}/v1`,
  });
  try {
    for await (const _segment of stt.transcribeStream(noAudio(), {})) {
      // nothing is expected
    }
    return false;
  } catch {
    return true;
  }
}

await test("Proxy strict: a Deepgram stream refuses to bypass the proxy under strict mode", async () => {
  const ws = await startWsStandIn();
  const proxy = `http://127.0.0.1:${await unusedPort()}`;
  const restore = withEnv({
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    NEUROLINK_PROXY_STRICT: "true",
  });
  try {
    assert(
      await deepgramStreamThrew(ws.port),
      "the stream opened although strict mode forbids a direct connection",
    );
    assert(ws.connections === 0, "the WebSocket connected directly");
  } finally {
    restore();
    await ws.close();
  }
});

await test("Proxy strict: a Deepgram stream still connects in default mode and for NO_PROXY hosts", async () => {
  const proxy = `http://127.0.0.1:${await unusedPort()}`;
  for (const extra of [
    {},
    { NO_PROXY: "127.0.0.1", NEUROLINK_PROXY_STRICT: "true" },
  ]) {
    const ws = await startWsStandIn();
    const restore = withEnv({
      HTTP_PROXY: proxy,
      HTTPS_PROXY: proxy,
      ...extra,
    });
    try {
      await deepgramStreamThrew(ws.port);
      assert(ws.connections === 1, "the WebSocket did not connect");
    } finally {
      restore();
      await ws.close();
    }
  }
});

await runSuite();
