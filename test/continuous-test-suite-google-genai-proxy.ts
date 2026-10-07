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
 * The `websearchGrounding` direct tool builds its own Vertex client, outside
 * the providers, and is driven here through `NeuroLink.executeTool()`. Its
 * credentials are a throwaway service-account key whose universe domain is not
 * googleapis.com: such a key signs its own JWT instead of asking Google's OAuth
 * endpoint for a token, so no request leaves the machine for authentication
 * (the token request is not part of what this suite, or the SDK's fetch hook,
 * covers).
 *
 * NO_PROXY is matched against a Google host name, plain or written as a fully
 * qualified name with a trailing dot, which a URL keeps. `dns.lookup` is
 * replaced for the length of each case so `*.googleapis.com`, with or without
 * that dot, resolves to the loopback stand-in and nothing here can reach the
 * real service; every other lookup is left alone. That is a stand-in for the
 * resolver, not for anything this package ships, so the suite is still driven
 * only through `../dist`.
 *
 * Not covered, and not claimed: the two GoogleGenAI clients in the video
 * analyzer (src/lib/adapters/video/videoAnalyzer.ts). Nothing reachable from
 * `NeuroLink.generate()`, `stream()` or the CLI builds them in this release:
 * the analyzer is called only from BaseProvider's video-frame route, every
 * text provider overrides `generate()`, and the providers that do reach that
 * route throw before it. They are changed the same way as the direct tool and
 * are exercised only by that shared helper. Also not covered: Gemini Live
 * websockets and the Vertex ADC token requests. Neither goes through the SDK's
 * fetch hook.
 *
 * Run: npx tsx test/continuous-test-suite-google-genai-proxy.ts
 *      pnpm run test:google-genai-proxy
 */

import { generateKeyPairSync } from "node:crypto";
import dns from "node:dns";
import { writeFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import { join } from "node:path";
import type { Duplex } from "node:stream";
import { assert, defineSuite, tempDir } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite("Google GenAI proxy", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";
const UPSTREAM_HOST = "genai-upstream.invalid";
const UPSTREAM_ORIGIN = `http://${UPSTREAM_HOST}`;
const GOOGLE_HOST = "generativelanguage.googleapis.com";
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
  "GOOGLE_GEMINI_BASE_URL",
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
  "NEUROLINK_WEBSEARCH_LOCATION",
  "NEUROLINK_WEBSEARCH_MODEL",
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

function sse(text: string): string {
  return `data: ${JSON.stringify(generateContentPayload(text))}\r\n\r\n`;
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
  /** `host:port` of every CONNECT the server received (proxy only). */
  connects: string[];
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
    if (path.endsWith(":generateContent")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(generateContentPayload(marker)));
      return;
    }
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
  return { calls, connects: [], port, close: closer(server, sockets) };
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
  const connects: string[] = [];
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
    connects.push(String(req.url ?? ""));
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
    connects,
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

/**
 * Resolves every `*.googleapis.com` name, with or without a trailing dot, to
 * the loopback address and leaves every other lookup to the real resolver.
 * Node's connect path reads `dns.lookup` when it connects. Both call shapes (a
 * single address, and `all: true`) are answered, because which one a Node
 * version asks for is its own business. Returns the restorer.
 */
function withGoogleNamesOnLoopback(): () => void {
  const original = dns.lookup;
  const stand = (hostname: string, ...rest: unknown[]): unknown => {
    const callback = rest[rest.length - 1];
    if (
      /\.googleapis\.com\.?$/.test(hostname) &&
      typeof callback === "function"
    ) {
      const options = rest.length > 1 ? rest[0] : undefined;
      const all =
        typeof options === "object" &&
        options !== null &&
        "all" in options &&
        options.all === true;
      process.nextTick(() => {
        if (all) {
          callback(null, [{ address: "127.0.0.1", family: 4 }]);
        } else {
          callback(null, "127.0.0.1", 4);
        }
      });
      return undefined;
    }
    return Reflect.apply(original, dns, [hostname, ...rest]);
  };
  dns.lookup = stand as unknown as typeof dns.lookup;
  return () => {
    dns.lookup = original;
  };
}

/**
 * A service-account key file generated for this run. Its universe domain is not
 * googleapis.com, so the auth library signs the JWT itself and never calls
 * Google's OAuth endpoint (a key without it would send a token request to the
 * real service).
 */
function writeServiceAccountKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const file = join(tempDir("genai-proxy-"), "service-account.json");
  writeFileSync(
    file,
    JSON.stringify({
      type: "service_account",
      project_id: "genai-proxy-test",
      private_key_id: "test-key",
      private_key: privateKey,
      client_email: "tester@genai-proxy-test.iam.gserviceaccount.com",
      client_id: "1",
      universe_domain: "example.test",
    }),
  );
  return file;
}

/**
 * Runs the tool and returns what it resolved with. On ANY throw the error is
 * discarded unread and a fixed message is raised, for the reason
 * `drainOrFail` gives.
 */
async function toolOrFail(
  run: () => Promise<unknown>,
  failMessage: string,
): Promise<unknown> {
  try {
    return await run();
  } catch {
    throw new Error(failMessage);
  }
}

function toolSucceededWith(result: unknown, marker: string): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "success" in result &&
    result.success === true &&
    JSON.stringify(result).includes(marker)
  );
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

section("the websearchGrounding direct tool goes through the proxy");

const SERVICE_ACCOUNT_KEY = writeServiceAccountKey();
const WEBSEARCH_PROJECT = "genai-proxy-test";

await test("Google GenAI proxy: websearchGrounding traffic goes through HTTP_PROXY", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const proxy = await startForwardProxy();
  const restore = withEnv({
    HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
    GOOGLE_APPLICATION_CREDENTIALS: SERVICE_ACCOUNT_KEY,
    GOOGLE_VERTEX_PROJECT: WEBSEARCH_PROJECT,
    GOOGLE_VERTEX_BASE_URL: UPSTREAM_ORIGIN,
  });
  try {
    const result = await toolOrFail(
      () =>
        new NeuroLink().executeTool("websearchGrounding", {
          query: "proxy routing",
        }),
      NO_ANSWER_VIA_PROXY,
    );
    assert(
      toolSucceededWith(result, PROXY_MARKER),
      "the web search answer did not come through the configured proxy",
    );
    assert(
      proxy.calls.length >= 1,
      "the proxy received no request from the web search tool",
    );
    assert(
      (proxy.calls[0]?.host ?? "").startsWith(UPSTREAM_HOST),
      "the proxy was asked for a different upstream than the configured endpoint",
    );
    assert(
      (proxy.calls[0]?.path ?? "").includes(
        `/projects/${WEBSEARCH_PROJECT}/`,
      ) && (proxy.calls[0]?.path ?? "").endsWith(":generateContent"),
      "the proxied request did not address the project's generateContent endpoint",
    );
  } finally {
    restore();
    await proxy.close();
  }
});

await test("Google GenAI proxy: websearchGrounding with no proxy configured goes straight to its endpoint", async () => {
  const proxy = await startForwardProxy();
  const direct = await startDirectStandIn();
  const restore = withEnv({
    GOOGLE_APPLICATION_CREDENTIALS: SERVICE_ACCOUNT_KEY,
    GOOGLE_VERTEX_PROJECT: WEBSEARCH_PROJECT,
    GOOGLE_VERTEX_BASE_URL: `http://127.0.0.1:${direct.port}`,
  });
  try {
    const result = await toolOrFail(
      () =>
        new NeuroLink().executeTool("websearchGrounding", {
          query: "no proxy",
        }),
      NO_ANSWER_DIRECT,
    );
    assert(
      toolSucceededWith(result, DIRECT_MARKER),
      "the web search answer without a proxy did not come from the configured endpoint",
    );
    assert(
      direct.calls.length >= 1,
      "the configured endpoint received no request from the web search tool",
    );
    assert(
      proxy.calls.length === 0,
      `the web search tool used a proxy that was not configured (${proxy.calls.length} requests)`,
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

/**
 * NO_PROXY entries, written the ways curl accepts them, against a Google host
 * name. `port` is the direct stand-in's, so an entry with a port can name the
 * one the request really uses (a real run would write :443). `host` is the name
 * the request is addressed to: the plain Google host unless a case says
 * otherwise.
 */
type NoProxyCase = {
  label: string;
  entry: (port: number) => string;
  host?: string;
};

const GOOGLE_HOST_WITH_DOT = `${GOOGLE_HOST}.`;

const BYPASS_ENTRIES: NoProxyCase[] = [
  { label: "a wildcard domain", entry: () => "*.googleapis.com" },
  { label: "a bare domain", entry: () => "googleapis.com" },
  {
    label: "a leading-dot domain with its port",
    entry: (port) => `.googleapis.com:${port}`,
  },
  {
    label: "a space-separated mixed-case list",
    entry: () => "localhost *.GoogleAPIs.com",
  },
  {
    label: "a domain written with a trailing dot",
    entry: () => "googleapis.com.",
  },
  {
    label: "a wildcard domain written with a trailing dot",
    entry: () => "*.googleapis.com.",
  },
  {
    label: "a bare domain, for a host written with a trailing dot",
    entry: () => "googleapis.com",
    host: GOOGLE_HOST_WITH_DOT,
  },
];

/**
 * Entries that must not bypass the proxy for the request their case makes.
 * Those made only of dots are here because the rules that applied before
 * NO_PROXY followed curl are still consulted, and they once took `.` for a
 * suffix of every host and `..` for one of every host written with a trailing
 * dot, so both bypassed the proxy. `*..` they never matched, and the
 * trailing-dot rule would reduce it to an empty name.
 */
const PROXIED_ENTRIES: NoProxyCase[] = [
  {
    label: "a lookalike domain and an unrelated wildcard",
    entry: () => "oogleapis.com,*.example.org",
  },
  {
    label: "the right domain on another port",
    entry: () => ".googleapis.com:1",
  },
  { label: "IP literals only", entry: () => "127.0.0.1,[::1]" },
  {
    label: "a lookalike domain written with a trailing dot",
    entry: () => "oogleapis.com.",
  },
  {
    label: "an unrelated domain, for a host written with a trailing dot",
    entry: () => "example.org",
    host: GOOGLE_HOST_WITH_DOT,
  },
  {
    label: "only dots and a wildcard, for a host written with a trailing dot",
    entry: () => "*..",
    host: GOOGLE_HOST_WITH_DOT,
  },
  { label: "a lone dot", entry: () => "." },
  {
    label: "two dots, for a host written with a trailing dot",
    entry: () => "..",
    host: GOOGLE_HOST_WITH_DOT,
  },
];

section("NO_PROXY entries keep a Google host direct");

for (const { label, entry, host = GOOGLE_HOST } of BYPASS_ENTRIES) {
  await test(`Google GenAI proxy: NO_PROXY as ${label} keeps a Google host direct`, async () => {
    const proxy = await startForwardProxy();
    const direct = await startDirectStandIn();
    const restoreDns = withGoogleNamesOnLoopback();
    const restore = withEnv({
      HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
      NO_PROXY: entry(direct.port),
    });
    try {
      const text = await drainOrFail(
        () =>
          streamFrom(
            "google-ai",
            aiStudioCredentials(`http://${host}:${direct.port}`),
          ),
        NO_ANSWER_DIRECT,
      );
      assert(
        text.includes(DIRECT_MARKER),
        "the answer for a NO_PROXY Google host did not come from the direct endpoint",
      );
      assert(
        direct.calls[0]?.host === `${host}:${direct.port}`,
        "the direct endpoint was not reached under the Google host name",
      );
      assert(
        proxy.calls.length === 0 && proxy.connects.length === 0,
        `a NO_PROXY Google host was still sent to the proxy (${proxy.calls.length} requests, ${proxy.connects.length} tunnels)`,
      );
    } finally {
      restore();
      restoreDns();
      await proxy.close();
      await direct.close();
    }
  });
}

section("controls: NO_PROXY entries that do not name the host");

for (const { label, entry, host = GOOGLE_HOST } of PROXIED_ENTRIES) {
  await test(`Google GenAI proxy: NO_PROXY as ${label} does not bypass the proxy`, async () => {
    assertGlobalFetchDoesNotProxyItself();
    const proxy = await startForwardProxy();
    const direct = await startDirectStandIn();
    const restoreDns = withGoogleNamesOnLoopback();
    const restore = withEnv({
      HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
      NO_PROXY: entry(direct.port),
    });
    try {
      const text = await drainOrFail(
        () =>
          streamFrom(
            "google-ai",
            aiStudioCredentials(`http://${host}:${direct.port}`),
          ),
        NO_ANSWER_VIA_PROXY,
      );
      assert(
        text.includes(PROXY_MARKER),
        "the answer for a Google host that NO_PROXY does not name did not come through the proxy",
      );
      assert(
        proxy.calls[0]?.host === `${host}:${direct.port}`,
        "the proxy was asked for a different upstream than the Google host",
      );
      assert(
        direct.calls.length === 0,
        `a Google host that NO_PROXY does not name was sent direct (${direct.calls.length} requests)`,
      );
    } finally {
      restore();
      restoreDns();
      await proxy.close();
      await direct.close();
    }
  });
}

await test("Google GenAI proxy: NO_PROXY as an IP literal written with a trailing dot does not bypass the proxy", async () => {
  assertGlobalFetchDoesNotProxyItself();
  const proxy = await startForwardProxy();
  const direct = await startDirectStandIn();
  const restore = withEnv({
    HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
    NO_PROXY: "127.0.0.1.",
  });
  try {
    const text = await drainOrFail(
      () =>
        streamFrom(
          "google-ai",
          aiStudioCredentials(`http://127.0.0.1:${direct.port}`),
        ),
      NO_ANSWER_VIA_PROXY,
    );
    assert(
      text.includes(PROXY_MARKER),
      "the answer for an IP literal that NO_PROXY writes with a trailing dot did not come through the proxy",
    );
    assert(
      proxy.calls[0]?.host === `127.0.0.1:${direct.port}`,
      "the proxy was asked for a different upstream than the IP literal",
    );
    assert(
      direct.calls.length === 0,
      "an IP literal that NO_PROXY writes with a trailing dot was sent direct",
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

await runSuite();
