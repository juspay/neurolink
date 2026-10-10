#!/usr/bin/env tsx

/**
 * Continuous Test Suite — outbound requests and the configured HTTP(S) proxy.
 *
 * With HTTP_PROXY / HTTPS_PROXY / ALL_PROXY set, the SDK's own outbound calls
 * have to leave through that proxy, and NO_PROXY has to keep listed hosts
 * direct. The SDK never installs a process-global dispatcher; each call site
 * opts in. This suite samples the call sites that used to go straight to
 * global `fetch`: a voice provider (ElevenLabs TTS, and its multipart STT
 * upload), a music provider (ElevenLabs Music), the MCP Streamable HTTP
 * transport, an OAuth token refresh (`neurolink auth refresh codex`) and the
 * proxy server's own Codex upstream (`neurolink proxy start`). It also pins a
 * multipart body on the older `createProxyFetch` path (Stability), the
 * direct-connection fallback when the proxy fails, NEUROLINK_PROXY_STRICT,
 * SOCKS being refused, and that nothing changes without a proxy.
 *
 * Everything drives the shipped surface: `../dist/index.js` exports and the
 * built CLI, no imports out of `src/`, nothing stubbed. No rule-15 exception.
 *
 * What the fake proxy buys: a live proxy would need network access, and could
 * not tell "went through the proxy" from "the proxy failed and the request
 * fell back to a direct connection". Here the upstream host names end in
 * `.invalid`, which never resolve, so an answer from them can only have come
 * through the proxy, which maps them onto local stand-ins. For the HTTPS
 * hosts the CLI talks to (auth.openai.com, chatgpt.com) the proxy terminates
 * the CONNECT tunnel itself with a throwaway certificate that only the
 * spawned CLI trusts (NODE_EXTRA_CA_CERTS); a request that skipped the proxy
 * would reach the real host, or nothing, and fail the case either way.
 *
 * Deliberate and load-bearing:
 *  - Env is snapshotted and restored per case, and every proxy variable is
 *    cleared first, so an ambient HTTPS_PROXY / NO_PROXY cannot change what a
 *    case exercises.
 *  - Failures caught from the SDK are rethrown with fixed messages: a
 *    resolver or connection error text is what the harness reads as a SKIP.
 *  - The process must not be started with Node's own env-proxy support, or
 *    global fetch would proxy by itself and a call site that bypassed the
 *    SDK's handling would still pass.
 *
 * Run: pnpm run test:proxy-egress (needs a current build)
 */

import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect as netConnect, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { flatPng } from "./helpers/flatPng.js";
import { assert, defineSuite, runCLI, Skip } from "./helpers/harness.js";

assertDistFresh({ entrypoints: ["dist/cli/index.js"] });

const { test, section, runSuite } = defineSuite("Outbound proxy egress", {
  offline: true,
});

/** Captured before any env is touched; see the header. */
const GLOBAL_FETCH_PROXIES_ITSELF =
  /^(1|true|yes)$/i.test(process.env.NODE_USE_ENV_PROXY ?? "") ||
  [...process.execArgv, ...(process.env.NODE_OPTIONS ?? "").split(/\s+/)].some(
    (arg) => arg === "--use-env-proxy",
  );

const PROXY_ENV_VARS = [
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
  "NEUROLINK_PROXY_STRICT",
] as const;

const VOICE_HOST = "voice.egress.invalid";
const MUSIC_HOST = "music.egress.invalid";
const MCP_HOST = "mcp.egress.invalid";
const IMAGE_HOST = "image.egress.invalid";
const TOKEN_HOST = "auth.openai.com";
const CODEX_HOST = "chatgpt.com";

const ELEVENLABS_KEY = "egress-elevenlabs-key";
const TTS_AUDIO = Buffer.from("ID3-egress-tts-audio");
const MUSIC_AUDIO = Buffer.from("ID3-egress-music-audio");
const STT_AUDIO_MARKER = "EGRESS-STT-AUDIO";
const TRANSCRIPT = "egress transcript";

// The ElevenLabs handlers are registered once per process and read their
// key, and the music handler its base URL, at construction.
process.env.ELEVENLABS_API_KEY = ELEVENLABS_KEY;
process.env.ELEVENLABS_BASE_URL = `http://${MUSIC_HOST}/v1`;

const {
  MCPClientFactory,
  MusicProcessor,
  NeuroLink,
  STTProcessor,
  TTSProcessor,
  registerDefaultMusicHandlers,
  registerDefaultSTTHandlers,
  registerDefaultTTSHandlers,
} = await import("../dist/index.js");
registerDefaultTTSHandlers();
registerDefaultSTTHandlers();
registerDefaultMusicHandlers();

/** Clears every proxy variable, applies `set`, and returns the restorer. */
function withEnv(set: Record<string, string> = {}): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of PROXY_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(set)) {
    saved[key] ??= process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, prior] of Object.entries(saved)) {
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

/** The same isolation for a spawned CLI: every proxy variable blanked. */
function cliProxyEnv(set: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of PROXY_ENV_VARS) {
    env[key] = "";
  }
  return { ...env, ...set };
}

// ---------------------------------------------------------------------------
// Local servers
// ---------------------------------------------------------------------------

type Listening = { port: number; close: () => Promise<void> };

async function listen(server: Server): Promise<Listening> {
  const sockets = new Set<Socket>();
  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    port,
    close: () =>
      new Promise<void>((done) => {
        for (const socket of sockets) {
          socket.destroy();
        }
        server.closeAllConnections?.();
        server.close(() => done());
      }),
  };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((done, fail) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => done(Buffer.concat(chunks)));
    req.on("error", fail);
  });
}

type UpstreamCall = {
  host: string;
  method: string;
  path: string;
  contentType: string;
  apiKey: string | undefined;
  body: Buffer;
};

/**
 * The stand-in for every plain-HTTP upstream. It answers as ElevenLabs
 * (TTS, STT, sound generation), as Stability, and as an MCP Streamable HTTP
 * server, chosen by path, and records what each request carried.
 */
async function startUpstream(): Promise<Listening & { calls: UpstreamCall[] }> {
  const calls: UpstreamCall[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = String(req.url ?? "").split("?")[0];
    const record = (body: Buffer): void => {
      const key = req.headers["xi-api-key"];
      calls.push({
        host: String(req.headers.host ?? ""),
        method: String(req.method),
        path,
        contentType: String(req.headers["content-type"] ?? ""),
        apiKey: Array.isArray(key) ? key[0] : key,
        body,
      });
    };
    if (path === "/mcp") {
      record(Buffer.alloc(0));
      void serveMcp(req, res);
      return;
    }
    void readBody(req).then((body) => {
      record(body);
      if (path.startsWith("/v1/text-to-speech/")) {
        res.writeHead(200, { "content-type": "audio/mpeg" });
        res.end(TTS_AUDIO);
      } else if (path === "/v1/speech-to-text") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            text: TRANSCRIPT,
            language_code: "en",
            language_probability: 0.99,
            words: [],
          }),
        );
      } else if (path === "/v1/sound-generation") {
        res.writeHead(200, { "content-type": "audio/mpeg" });
        res.end(MUSIC_AUDIO);
      } else if (path.startsWith("/v2beta/stable-image/generate/")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            image: flatPng(2, 2).toString("base64"),
            finish_reason: "SUCCESS",
          }),
        );
      } else {
        res.writeHead(404).end();
      }
    });
  });
  return { ...(await listen(server)), calls };
}

/** One stateless MCP server per request, exposing a single tool. */
async function serveMcp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = new McpServer({ name: "egress-fixture", version: "1.0.0" });
  server.registerTool(
    "egress_echo",
    { description: "Answers with a fixed marker" },
    async () => ({ content: [{ type: "text", text: "egress-ok" }] }),
  );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

type ProxyCall = { method: string; target: string };

type TlsFixture = {
  certPath: string;
  key: Buffer;
  cert: Buffer;
  dir: string;
};

/** A certificate for the HTTPS hosts the proxy intercepts, or null. */
function makeTlsFixture(): TlsFixture | null {
  const dir = mkdtempSync(join(tmpdir(), "neurolink-egress-tls-"));
  const keyPath = join(dir, "fixture.key");
  const certPath = join(dir, "fixture.crt");
  const configPath = join(dir, "fixture.cnf");
  writeFileSync(
    configPath,
    [
      "[req]",
      "distinguished_name = dn",
      "x509_extensions = v3",
      "prompt = no",
      "[dn]",
      "CN = egress-fixture.invalid",
      "[v3]",
      `subjectAltName = DNS:${TOKEN_HOST},DNS:${CODEX_HOST}`,
      "",
    ].join("\n"),
  );
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-config",
        configPath,
        "-keyout",
        keyPath,
        "-out",
        certPath,
      ],
      { stdio: "ignore" },
    );
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
  return {
    certPath,
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
    dir,
  };
}

/**
 * A forward proxy. Plain-HTTP hosts in `routes` are forwarded to the local
 * upstream, whether undici sends an absolute-URI request or tunnels with
 * CONNECT. A CONNECT to a host in `intercept` is terminated here with the TLS
 * fixture and answered by `intercept`'s handler. Any other CONNECT is refused
 * with a 403. Every request and tunnel is recorded.
 */
async function startForwardProxy(options: {
  routes: Record<string, number>;
  tls?: TlsFixture;
  intercept?: (req: IncomingMessage, res: ServerResponse) => void;
}): Promise<Listening & { calls: ProxyCall[] }> {
  const calls: ProxyCall[] = [];
  const innerTls =
    options.tls && options.intercept
      ? createHttpsServer(
          { key: options.tls.key, cert: options.tls.cert },
          options.intercept,
        )
      : undefined;
  const server = createServer((req, res) => {
    let target: URL;
    try {
      target = new URL(String(req.url));
    } catch {
      res.writeHead(400).end();
      return;
    }
    calls.push({ method: String(req.method), target: target.host });
    const port = options.routes[target.hostname];
    if (!port) {
      res.writeHead(502).end();
      return;
    }
    const forwarded = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method: req.method,
        path: `${target.pathname}${target.search}`,
        headers: req.headers,
      },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    forwarded.on("error", () => res.destroy());
    req.pipe(forwarded);
  });
  server.on("connect", (req: IncomingMessage, client: Socket, head: Buffer) => {
    const target = String(req.url ?? "");
    calls.push({ method: "CONNECT", target });
    const host = target.replace(/:\d+$/, "");
    const port = options.routes[host];
    if (port) {
      const upstream = netConnect(port, "127.0.0.1", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length > 0) {
          upstream.write(head);
        }
        upstream.pipe(client);
        client.pipe(upstream);
      });
      upstream.on("error", () => client.destroy());
      client.on("error", () => upstream.destroy());
      return;
    }
    if (innerTls && (host === TOKEN_HOST || host === CODEX_HOST)) {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) {
        client.unshift(head);
      }
      innerTls.emit("connection", client);
      return;
    }
    client.end("HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\n\r\n");
  });
  const listening = await listen(server);
  return {
    ...listening,
    calls,
    close: async () => {
      innerTls?.closeAllConnections?.();
      await listening.close();
    },
  };
}

/** A port with nothing listening on it: a proxy that is down. */
async function deadPort(): Promise<number> {
  const probe = await listen(createServer());
  await probe.close();
  return probe.port;
}

function proxyCalled(proxy: { calls: ProxyCall[] }, host: string): boolean {
  return proxy.calls.some((call) => call.target.split(":")[0] === host);
}

function assertNotSelfProxying(): void {
  assert(
    !GLOBAL_FETCH_PROXIES_ITSELF,
    "this process proxies global fetch on its own, so a request that bypasses the SDK's proxy handling cannot be told apart; unset NODE_USE_ENV_PROXY and --use-env-proxy",
  );
}

/** Runs `run`, replacing any thrown error with `message` (see the header). */
async function orFail<T>(run: () => Promise<T>, message: string): Promise<T> {
  try {
    return await run();
  } catch {
    throw new Error(message);
  }
}

/** Resolves to whether `run` rejected, discarding the error itself. */
async function rejects(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return false;
  } catch {
    return true;
  }
}

function synthesize(baseUrl: string) {
  return TTSProcessor.synthesize("hello through the proxy", "elevenlabs", {
    format: "mp3",
    baseUrl,
    retries: 0,
  } as Parameters<typeof TTSProcessor.synthesize>[2]);
}

const upstream = await startUpstream();
const directBase = `http://127.0.0.1:${upstream.port}/v1`;
const routes = {
  [VOICE_HOST]: upstream.port,
  [MUSIC_HOST]: upstream.port,
  [MCP_HOST]: upstream.port,
  [IMAGE_HOST]: upstream.port,
};

try {
  section("SDK call sites go through the configured proxy");

  await test("Proxy egress: ElevenLabs TTS goes through HTTP_PROXY", async () => {
    assertNotSelfProxying();
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
    upstream.calls.length = 0;
    try {
      const result = await orFail(
        () => synthesize(`http://${VOICE_HOST}/v1`),
        "TTS synthesis did not complete through the proxy",
      );
      assert(
        Buffer.compare(result.buffer, TTS_AUDIO) === 0,
        "the audio did not come from the stand-in behind the proxy",
      );
      assert(
        proxyCalled(proxy, VOICE_HOST),
        "the proxy was not asked for the TTS host",
      );
      assert(
        upstream.calls.some(
          (call) =>
            call.path.startsWith("/v1/text-to-speech/") &&
            call.apiKey === ELEVENLABS_KEY,
        ),
        "the proxied TTS request did not carry the API key header",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  await test("Proxy egress: ElevenLabs STT keeps its multipart upload through HTTP_PROXY", async () => {
    assertNotSelfProxying();
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
    upstream.calls.length = 0;
    try {
      const result = await orFail(
        () =>
          STTProcessor.transcribe(
            Buffer.from(`RIFF${STT_AUDIO_MARKER}`),
            "elevenlabs-stt",
            {
              format: "wav",
              baseUrl: `http://${VOICE_HOST}/v1`,
            } as Parameters<typeof STTProcessor.transcribe>[2],
          ),
        "STT transcription did not complete through the proxy",
      );
      assert(
        result.text === TRANSCRIPT,
        "the transcript did not come from the stand-in behind the proxy",
      );
      const call = upstream.calls.find((c) => c.path === "/v1/speech-to-text");
      assert(call !== undefined, "the stand-in received no STT request");
      assert(
        call.contentType.startsWith("multipart/form-data"),
        "the proxied STT request was not sent as multipart/form-data",
      );
      assert(
        call.body.includes(STT_AUDIO_MARKER),
        "the proxied STT upload lost the audio part",
      );
      assert(
        proxyCalled(proxy, VOICE_HOST),
        "the proxy was not asked for the STT host",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  await test("Proxy egress: ElevenLabs Music goes through HTTP_PROXY", async () => {
    assertNotSelfProxying();
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
    upstream.calls.length = 0;
    try {
      const result = await orFail(
        () =>
          MusicProcessor.generate("elevenlabs-music", {
            prompt: "a short calm pad",
            duration: 4,
          }),
        "music generation did not complete through the proxy",
      );
      assert(
        Buffer.compare(result.buffer, MUSIC_AUDIO) === 0,
        "the music did not come from the stand-in behind the proxy",
      );
      assert(
        proxyCalled(proxy, MUSIC_HOST),
        "the proxy was not asked for the music host",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  await test("Proxy egress: the MCP Streamable HTTP transport goes through HTTP_PROXY", async () => {
    assertNotSelfProxying();
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
    upstream.calls.length = 0;
    try {
      const toolNames = await orFail(async () => {
        const created = await MCPClientFactory.createClient(
          {
            id: "egress-mcp",
            name: "egress-mcp",
            description: "MCP server behind the egress proxy",
            transport: "http",
            status: "initializing",
            tools: [],
            url: `http://${MCP_HOST}/mcp`,
          },
          20_000,
        );
        if (!created.success || !created.client) {
          throw new Error("no client");
        }
        try {
          const listed = await created.client.listTools();
          return listed.tools.map((tool) => tool.name);
        } finally {
          await created.client.close().catch(() => undefined);
        }
      }, "the MCP client did not connect through the proxy");
      assert(
        toolNames.includes("egress_echo"),
        "the tool list did not come from the MCP server behind the proxy",
      );
      assert(
        proxyCalled(proxy, MCP_HOST),
        "the proxy was not asked for the MCP host",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  await test("Proxy egress: a createProxyFetch multipart body survives the proxy (Stability)", async () => {
    // The older createProxyFetch path sends through the npm undici, which
    // used to serialize a global FormData as the text "[object FormData]".
    assertNotSelfProxying();
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({ HTTP_PROXY: `http://127.0.0.1:${proxy.port}` });
    upstream.calls.length = 0;
    try {
      const result = await orFail(
        () =>
          new NeuroLink({ conversationMemory: { enabled: false } }).generate({
            provider: "stability",
            model: "stable-image-core",
            input: { text: "egress image prompt" },
            credentials: {
              stability: {
                apiKey: "egress-stability-key",
                baseURL: `http://${IMAGE_HOST}`,
              },
            },
          }),
        "image generation did not complete through the proxy",
      );
      assert(
        typeof result.imageOutput?.base64 === "string",
        "no image came back through the proxy",
      );
      const call = upstream.calls.find((c) =>
        c.path.startsWith("/v2beta/stable-image/generate/"),
      );
      assert(call !== undefined, "the stand-in received no image request");
      assert(
        call.contentType.startsWith("multipart/form-data"),
        "the proxied image request was not sent as multipart/form-data",
      );
      assert(
        call.body.includes("egress image prompt"),
        "the proxied image request lost its prompt part",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  section("proxy failure: fallback, strict mode, SOCKS");

  await test("Proxy egress: a proxy that is down falls back to a direct connection by default", async () => {
    // No NO_PROXY, so the local stand-in is routed to the dead proxy first.
    const restore = withEnv({
      HTTP_PROXY: `http://127.0.0.1:${await deadPort()}`,
    });
    upstream.calls.length = 0;
    try {
      const result = await orFail(
        () => synthesize(directBase),
        "TTS synthesis did not fall back to the direct connection",
      );
      assert(
        Buffer.compare(result.buffer, TTS_AUDIO) === 0,
        "the fallback answer did not come from the direct endpoint",
      );
      assert(
        upstream.calls.length === 1,
        "the direct endpoint was not reached exactly once",
      );
    } finally {
      restore();
    }
  });

  await test("Proxy egress: NEUROLINK_PROXY_STRICT fails instead of bypassing a proxy that is down", async () => {
    const restore = withEnv({
      HTTP_PROXY: `http://127.0.0.1:${await deadPort()}`,
      NEUROLINK_PROXY_STRICT: "true",
    });
    upstream.calls.length = 0;
    try {
      assert(
        await rejects(() => synthesize(directBase)),
        "a strict-mode request succeeded although its proxy was down",
      );
      assert(
        upstream.calls.length === 0,
        "a strict-mode request still reached the endpoint directly",
      );
    } finally {
      restore();
    }
  });

  await test("Proxy egress: a SOCKS proxy is refused, never silently used", async () => {
    const socks = `socks5://127.0.0.1:${await deadPort()}`;
    let restore = withEnv({ ALL_PROXY: socks, NEUROLINK_PROXY_STRICT: "1" });
    upstream.calls.length = 0;
    try {
      assert(
        await rejects(() => synthesize(directBase)),
        "a SOCKS proxy URL was accepted under strict mode",
      );
      assert(
        upstream.calls.length === 0,
        "a strict-mode request with a SOCKS proxy reached the endpoint directly",
      );
    } finally {
      restore();
    }
    restore = withEnv({ ALL_PROXY: socks });
    upstream.calls.length = 0;
    try {
      await orFail(
        () => synthesize(directBase),
        "with a SOCKS proxy and no strict mode the request did not fall back",
      );
      assert(
        upstream.calls.length === 1,
        "the SOCKS fallback did not reach the direct endpoint once",
      );
    } finally {
      restore();
    }
  });

  section("controls: the proxy is not used when it should not be");

  await test("Proxy egress: NO_PROXY keeps a listed host direct", async () => {
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv({
      HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
      NO_PROXY: "127.0.0.1",
    });
    upstream.calls.length = 0;
    try {
      await orFail(
        () => synthesize(directBase),
        "TTS synthesis to a NO_PROXY host did not complete",
      );
      assert(
        upstream.calls.length === 1,
        "the NO_PROXY endpoint was not reached directly",
      );
      assert(
        proxy.calls.length === 0,
        `a NO_PROXY host was still sent through the proxy (${proxy.calls.length} requests)`,
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  await test("Proxy egress: with no proxy configured the request path is unchanged", async () => {
    const proxy = await startForwardProxy({ routes });
    const restore = withEnv();
    upstream.calls.length = 0;
    try {
      await orFail(
        () => synthesize(directBase),
        "TTS synthesis without a proxy did not complete",
      );
      assert(
        upstream.calls.length === 1,
        "the endpoint was not reached directly",
      );
      assert(
        proxy.calls.length === 0,
        `a request was sent through a proxy that was not configured (${proxy.calls.length} requests)`,
      );
    } finally {
      restore();
      await proxy.close();
    }
  });

  section("the built CLI: OAuth refresh and the proxy server's upstream");

  const tls = makeTlsFixture();

  /** An unsigned JWT shaped like a Codex access token, valid for an hour. */
  const codexJwt = (marker: string): string => {
    const b64 = (value: unknown): string =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${b64({ alg: "none" })}.${b64({
      exp: Math.floor(Date.now() / 1000) + 3600,
      marker,
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acct-egress",
        chatgpt_plan_type: "plus",
      },
    })}.sig`;
  };

  /** A throwaway HOME with one Codex account in the pool. */
  const codexHome = async (): Promise<string> => {
    const home = mkdtempSync(join(tmpdir(), "neurolink-egress-home-"));
    mkdirSync(join(home, ".codex"), { recursive: true });
    writeFileSync(
      join(home, ".codex", "auth.json"),
      JSON.stringify({
        auth_mode: "chatgpt",
        tokens: {
          access_token: codexJwt("imported"),
          refresh_token: "egress-refresh-token",
        },
      }),
    );
    const login = await runCLI(
      ["auth", "login", "codex", "--label", "egress"],
      {
        env: { HOME: home, USERPROFILE: home, ...cliProxyEnv({}) },
        timeoutMs: 60_000,
      },
    );
    assert(login.exitCode === 0, "the Codex account could not be staged");
    return home;
  };

  let tokenRequests = 0;
  let codexRequests = 0;
  const intercept = (req: IncomingMessage, res: ServerResponse): void => {
    const host = String(req.headers.host ?? "").split(":")[0];
    void readBody(req).then(() => {
      if (host === TOKEN_HOST && req.url?.startsWith("/oauth/token")) {
        tokenRequests++;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            access_token: codexJwt("refreshed"),
            refresh_token: "egress-rotated-refresh-token",
          }),
        );
        return;
      }
      if (host === CODEX_HOST && req.url?.includes("/codex/responses")) {
        codexRequests++;
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end(
          `event: response.completed\ndata: ${JSON.stringify({
            type: "response.completed",
            response: {
              model: "gpt-5.6-terra",
              status: "completed",
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: "EGRESS_CODEX_OK" }],
                },
              ],
              usage: { input_tokens: 3, output_tokens: 1 },
            },
          })}\n\n`,
        );
        return;
      }
      res.writeHead(404).end();
    });
  };

  await test("Proxy egress: `auth refresh codex` reaches the token endpoint through HTTPS_PROXY", async () => {
    if (!tls) {
      throw new Skip("openssl is not available to mint the TLS fixture");
    }
    const home = await codexHome();
    const proxy = await startForwardProxy({ routes: {}, tls, intercept });
    tokenRequests = 0;
    try {
      const result = await runCLI(["auth", "refresh", "codex"], {
        env: {
          HOME: home,
          USERPROFILE: home,
          NODE_EXTRA_CA_CERTS: tls.certPath,
          ...cliProxyEnv({
            HTTPS_PROXY: `http://127.0.0.1:${proxy.port}`,
            // A failed proxy attempt must not be retried against the real host.
            NEUROLINK_PROXY_STRICT: "true",
          }),
        },
        timeoutMs: 60_000,
      });
      assert(
        proxy.calls.some(
          (call) =>
            call.method === "CONNECT" && call.target === `${TOKEN_HOST}:443`,
        ),
        "the proxy was not asked to tunnel to the token endpoint",
      );
      assert(
        tokenRequests === 1,
        "the token endpoint behind the proxy did not receive the refresh",
      );
      assert(result.exitCode === 0, "the refresh did not succeed");
      assert(
        result.stdout.includes("All Codex accounts refreshed"),
        "the CLI did not report the refreshed account",
      );
    } finally {
      await proxy.close();
      rmSync(home, { recursive: true, force: true });
    }
  });

  await test("Proxy egress: the proxy server sends its Codex upstream through HTTPS_PROXY", async () => {
    if (!tls) {
      throw new Skip("openssl is not available to mint the TLS fixture");
    }
    const home = await codexHome();
    const proxy = await startForwardProxy({ routes: {}, tls, intercept });
    const port = await deadPort();
    const configPath = join(home, "proxy-config.json");
    writeFileSync(configPath, JSON.stringify({ routing: {} }));
    codexRequests = 0;
    const child = spawn(
      process.execPath,
      [
        resolve("dist/cli/index.js"),
        "proxy",
        "start",
        "--port",
        String(port),
        "--config",
        configPath,
        "--quiet",
      ],
      {
        cwd: home,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          HOME: home,
          USERPROFILE: home,
          XDG_CONFIG_HOME: join(home, ".config"),
          GROK_HOME: join(home, ".grok"),
          NODE_EXTRA_CA_CERTS: tls.certPath,
          NEUROLINK_SKIP_MCP: "true",
          NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
          NEUROLINK_PROXY_SHARE_LISTENER: "off",
          NEUROLINK_PROXY_AUTO_UPDATE: "off",
          ...cliProxyEnv({
            HTTPS_PROXY: `http://127.0.0.1:${proxy.port}`,
            // The proxy's own health probe is plain HTTP to 127.0.0.1.
            NO_PROXY: "127.0.0.1,localhost",
          }),
        },
      },
    );
    child.stdout?.resume();
    child.stderr?.resume();
    try {
      const deadline = Date.now() + 60_000;
      let healthy = false;
      while (!healthy && Date.now() < deadline && child.exitCode === null) {
        healthy = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(5_000),
        }).then(
          (r) => r.ok,
          () => false,
        );
        if (!healthy) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      assert(healthy, "the built proxy server did not come up");
      const response = await fetch(
        `http://127.0.0.1:${port}/backend-api/codex/responses`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: "gpt-5.6-terra",
            stream: true,
            store: false,
            input: [
              {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: "egress" }],
              },
            ],
          }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      const text = await response.text();
      assert(
        proxy.calls.some(
          (call) =>
            call.method === "CONNECT" && call.target === `${CODEX_HOST}:443`,
        ),
        "the proxy server did not tunnel its Codex upstream through the proxy",
      );
      assert(
        codexRequests >= 1,
        "the Codex upstream behind the proxy received no request",
      );
      assert(response.status === 200, "the Codex route did not succeed");
      assert(
        text.includes("EGRESS_CODEX_OK"),
        "the Codex answer was not relayed from the upstream behind the proxy",
      );
    } finally {
      child.kill("SIGTERM");
      if (child.exitCode === null) {
        await Promise.race([
          once(child, "exit"),
          new Promise((r) => setTimeout(r, 10_000)),
        ]);
      }
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      await proxy.close();
      rmSync(home, { recursive: true, force: true });
    }
  });

  if (tls) {
    rmSync(tls.dir, { recursive: true, force: true });
  }
} finally {
  await upstream.close();
}

await runSuite();
