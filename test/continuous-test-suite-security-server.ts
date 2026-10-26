#!/usr/bin/env tsx
/**
 * Continuous Test Suite — server hardening (no API, loopback only)
 *
 * 2026-10 hardening: the HTTP server and the transcription
 * WebSocket fail closed on the network. Every case here failed on the code the
 * audit read (`origin/release` @ e42b4db89):
 *
 *  - `neurolink serve` bound 0.0.0.0 with no key and served tool execution to
 *    anyone; now it binds loopback, refuses a non-loopback bind without
 *    NEUROLINK_SERVER_API_KEY unless `--allow-unauthenticated`, and keeps the
 *    built-in filesystem tools out of its registry unless
 *    `--enable-builtin-tools`.
 *  - The API-key middleware exempted the whole `/api/health` prefix, so
 *    `/api/health/detailed` (runtime and MCP inventory) was open and
 *    `/api/version` sat, open, at `/api/health/api/version`.
 *  - The tool and MCP execution routes answered an unauthenticated server;
 *    they now answer 403 until authentication middleware is registered.
 *  - The Hono and Koa rate limiters keyed on `X-Forwarded-For`, so one shared
 *    bucket served every direct client and a rotating header escaped the
 *    limit; now the TCP peer is the key unless `rateLimit.trustProxy`.
 *  - Handler exceptions, SSE error events and the `audioUrl` SSRF verdict went
 *    to the client verbatim; now a fixed message and the request id do.
 *  - Express, Fastify and Koa applied `config.timeout` to nothing a request
 *    could feel; now a request past it is answered 504 and its work aborted.
 *  - Koa reflected the request's Origin under the wildcard; `*` + credentials
 *    is refused at construction for every adapter.
 *  - The transcription WebSocket had no connection cap, took the key as
 *    `?token=`, and let anyone join a session by its id; the STT evaluation
 *    collector was mounted by default.
 *
 * Determinism exception (CLAUDE.md rule 15): the suite imports from `src`,
 * never `dist`, and spawns the CLI through `tsx` from `src/cli/index.ts`. What
 * that buys: fixed loopback source addresses (127.0.0.1 against 127.0.0.2) and
 * a scripted `X-Forwarded-For` rotation for the rate-limiter key, an exact
 * count of upgrades against a connection cap, a scripted session-secret
 * handshake, a request made to outlive a 300 ms timeout, and a provider
 * failure made certain by a child that holds no credential at all — none of
 * which a live `generate()` could be made to emit, and all of which must be
 * checkable before `dist/` is rebuilt. Nothing is stubbed; every server is a
 * real listener on loopback. One module graph: everything from `src`.
 *
 * Assertion messages describe the discrepancy and never quote a payload (a
 * quoted provider-shaped string would downgrade a failure to a skip).
 *
 * Run: pnpm exec tsx test/continuous-test-suite-security-server.ts
 */

import "./helpers/credentialFreeEnv.js";
import { spawn, type ChildProcess } from "node:child_process";
import {
  createServer as createHttpServer,
  request as nodeRequest,
  type IncomingHttpHeaders,
  type Server as HttpServer,
} from "node:http";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

import { NeuroLink } from "../src/lib/neurolink.js";
import type { BaseServerAdapter } from "../src/lib/server/abstract/baseServerAdapter.js";
import {
  attachTranscribeWebSocket,
  createAllRoutes,
  createAuthMiddleware,
  createServer,
  registerAllRoutes,
  WebSocketConnectionManager,
} from "../src/lib/server/index.js";
import { createServerApiKeyMiddleware } from "../src/cli/utils/serverUtils.js";
import type {
  CreateRoutesOptions,
  MiddlewareDefinition,
  ServerAdapterConfig,
  ServerFramework,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite, delay } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Server hardening", {
  offline: true,
  perTestTimeoutMs: 180_000,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSX = resolve(REPO_ROOT, "node_modules/.bin/tsx");
const CLI_ENTRY = resolve(REPO_ROOT, "src/cli/index.ts");
const TSCONFIG = resolve(REPO_ROOT, "tsconfig.json");
const FRAMEWORKS: ServerFramework[] = ["hono", "express", "fastify", "koa"];
const API_KEY = "hardening-suite-key-7f3a";

/** An environment-variable name that carries a credential: never in a response body. */
const CREDENTIAL_NAME =
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_?KEY|KEY|TOKEN|SECRET)\b|API_KEY/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HttpReply = {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
  json: unknown;
};

function http(
  method: string,
  url: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    localAddress?: string;
    timeoutMs?: number;
  } = {},
): Promise<HttpReply> {
  return new Promise((resolvePromise, reject) => {
    const target = new URL(url);
    const payload =
      options.body === undefined ? undefined : JSON.stringify(options.body);
    const req = nodeRequest(
      {
        method,
        hostname: target.hostname,
        port: Number(target.port),
        path: `${target.pathname}${target.search}`,
        localAddress: options.localAddress,
        headers: {
          ...(payload ? { "content-type": "application/json" } : {}),
          ...(options.headers ?? {}),
        },
        timeout: options.timeoutMs ?? 60_000,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          text += chunk;
        });
        res.on("end", () => {
          let json: unknown;
          try {
            json = JSON.parse(text);
          } catch {
            json = undefined;
          }
          resolvePromise({
            status: res.statusCode ?? 0,
            headers: res.headers,
            text,
            json,
          });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("request timed out"));
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function errorCodeOf(reply: HttpReply): string | undefined {
  const body = reply.json as { error?: { code?: unknown } } | undefined;
  return typeof body?.error?.code === "string" ? body.error.code : undefined;
}

function errorMessageOf(reply: HttpReply): string {
  const body = reply.json as { error?: { message?: unknown } } | undefined;
  return typeof body?.error?.message === "string" ? body.error.message : "";
}

async function freePort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolvePromise(port));
    });
  });
}

async function listeningPort(server: HttpServer): Promise<number> {
  if (!server.listening) {
    await new Promise<void>((resolvePromise, reject) => {
      server.once("listening", () => resolvePromise());
      server.once("error", reject);
    });
  }
  return (server.address() as AddressInfo).port;
}

type RunningAdapter = {
  adapter: BaseServerAdapter;
  port: number;
  url: string;
  stop: () => Promise<void>;
};

/** A real adapter on a loopback port with the standard routes, unless told otherwise. */
async function startAdapter(options: {
  framework: ServerFramework;
  config?: ServerAdapterConfig;
  routes?: CreateRoutesOptions | false;
  middleware?: MiddlewareDefinition[];
  extraRoutes?: (adapter: BaseServerAdapter) => void;
}): Promise<RunningAdapter> {
  const adapter = await createServer(new NeuroLink(), {
    framework: options.framework,
    config: {
      port: 0,
      host: "127.0.0.1",
      logging: { enabled: false },
      ...options.config,
    },
  });
  for (const middleware of options.middleware ?? []) {
    adapter.registerMiddleware(middleware);
  }
  if (options.routes !== false) {
    registerAllRoutes(adapter, "/api", options.routes);
  }
  options.extraRoutes?.(adapter);
  await adapter.initialize();
  await adapter.start();
  const native = adapter.getNativeServer() as HttpServer;
  const port = await listeningPort(native);
  return {
    adapter,
    port,
    url: `http://127.0.0.1:${port}`,
    stop: async () => {
      await adapter.stop();
    },
  };
}

/** Open a WebSocket and report how the handshake ended. */
type OpenedSocket = {
  socket: WebSocket;
  /** Text frames parsed as JSON, kept from the moment the socket was created. */
  frames: unknown[];
  closeCode: () => number | undefined;
};

function tryUpgrade(
  url: string,
  init: { headers?: Record<string, string>; protocols?: string[] } = {},
): Promise<{ outcome: "open" | "error" | number; opened?: OpenedSocket }> {
  return new Promise((resolvePromise) => {
    const socket = new WebSocket(url, init.protocols ?? [], {
      headers: init.headers ?? {},
    });
    // Listeners from the start: a server that answers and closes at once
    // would otherwise emit before the test attached its own.
    const frames: unknown[] = [];
    let closeCode: number | undefined;
    socket.on("message", (data: Buffer) => {
      try {
        frames.push(JSON.parse(data.toString("utf8")));
      } catch {
        frames.push(undefined);
      }
    });
    socket.on("close", (code) => {
      closeCode = code;
    });
    const timer = setTimeout(() => {
      socket.terminate();
      resolvePromise({ outcome: "error" });
    }, 5_000);
    socket.once("open", () => {
      clearTimeout(timer);
      resolvePromise({
        outcome: "open",
        opened: { socket, frames, closeCode: () => closeCode },
      });
    });
    socket.once("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      socket.terminate();
      resolvePromise({ outcome: res.statusCode ?? 0 });
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolvePromise({ outcome: "error" });
    });
  });
}

/** The first text frame and the close code of a socket, once it closes or after `ms`. */
async function firstFrameAndClose(
  opened: OpenedSocket,
  ms: number,
): Promise<{ message: unknown; closeCode: number | undefined }> {
  const deadline = Date.now() + ms;
  while (opened.closeCode() === undefined && Date.now() < deadline) {
    await delay(25);
  }
  return { message: opened.frames[0], closeCode: opened.closeCode() };
}

async function withHttpServer<T>(
  body: (server: HttpServer, port: number) => Promise<T>,
): Promise<T> {
  const server = createHttpServer((_req, res) => {
    res.statusCode = 404;
    res.end();
  });
  const sockets = new Set<import("node:net").Socket>();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolvePromise) =>
    server.listen(0, "127.0.0.1", resolvePromise),
  );
  try {
    return await body(server, (server.address() as AddressInfo).port);
  } finally {
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolvePromise) =>
      server.close(() => resolvePromise()),
    );
  }
}

// ---------------------------------------------------------------------------
// The CLI, spawned from source with no credential and an empty cwd
// ---------------------------------------------------------------------------

type CliRun = {
  child: ChildProcess;
  output: () => string;
  exited: Promise<number | null>;
  stop: () => Promise<void>;
};

function spawnServe(args: string[], env: Record<string, string>): CliRun {
  // An empty working directory: the repository root holds a `.mcp-config.json`
  // that would start an MCP server, and nothing here is about that.
  const cwd = mkdtempSync(join(tmpdir(), "nl-sec-server-cwd-"));
  const child = spawn(
    TSX,
    ["--tsconfig", TSCONFIG, CLI_ENTRY, "serve", ...args],
    {
      cwd,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? cwd,
        DOTENV_CONFIG_PATH: "/dev/null",
        NODE_ENV: "test",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const exited = new Promise<number | null>((resolvePromise) => {
    child.once("close", (code) => resolvePromise(code));
  });
  return {
    child,
    output: () => output,
    exited,
    stop: async () => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGTERM");
        const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
        await exited;
        clearTimeout(timer);
      }
    },
  };
}

async function waitForLive(
  run: CliRun,
  port: number,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (run.child.exitCode !== null) {
      throw new Error("the server process exited before it answered a probe");
    }
    try {
      const reply = await http(
        "GET",
        `http://127.0.0.1:${port}/api/health/live`,
        { timeoutMs: 2_000 },
      );
      if (reply.status === 200) {
        return;
      }
    } catch {
      // Not listening yet.
    }
    await delay(250);
  }
  throw new Error("the server did not answer its liveness probe in time");
}

await test("CLI: `serve --host 0.0.0.0` with no API key refuses to start and exits non-zero", async () => {
  const port = await freePort();
  const run = spawnServe(
    ["--host", "0.0.0.0", "--port", String(port), "--quiet"],
    {},
  );
  const code = await Promise.race([
    run.exited,
    delay(120_000).then(() => "timeout" as const),
  ]);
  if (code === "timeout") {
    await run.stop();
    throw new Error("the server neither refused nor exited within the budget");
  }
  assert(code !== 0, "a non-loopback bind without a key must exit non-zero");
  assert(
    /Refusing to listen/.test(run.output()),
    "the refusal must say why on stderr",
  );
  const answered = await http(
    "GET",
    `http://127.0.0.1:${port}/api/health/live`,
    { timeoutMs: 1_000 },
  ).then(
    () => true,
    () => false,
  );
  assert(!answered, "nothing may be listening after the refusal");
});

await test("CLI: `--allow-unauthenticated` lets a non-loopback bind start, and opens tool execution on purpose", async () => {
  const port = await freePort();
  const run = spawnServe(
    ["--host", "0.0.0.0", "--port", String(port), "--allow-unauthenticated"],
    {},
  );
  try {
    await waitForLive(run, port);
    const execute = await http(
      "POST",
      `http://127.0.0.1:${port}/api/tools/execute`,
      { body: { name: "no-such-tool", arguments: {} } },
    );
    assertEqual(
      execute.status,
      200,
      "with the opt-out, tool execution is served (the unknown tool is a 200 with success:false)",
    );
  } finally {
    await run.stop();
  }
});

await test("CLI with an API key: probes open, inventory and version behind the key at the right paths, no built-in tools, no eval collector, no `?token=`", async () => {
  const port = await freePort();
  const run = spawnServe(["--host", "127.0.0.1", "--port", String(port)], {
    NEUROLINK_SERVER_API_KEY: API_KEY,
  });
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: `Bearer ${API_KEY}` };
  try {
    await waitForLive(run, port);
    assert(
      /Listening:.*this machine only/.test(run.output()),
      "the banner must name the loopback bind",
    );

    for (const probe of [
      "/api/health",
      "/api/health/live",
      "/api/health/ready",
      "/api/health/startup",
      "/api/health/live?probe=1",
    ]) {
      const reply = await http("GET", `${base}${probe}`);
      assertEqual(reply.status, 200, `probe ${probe} must stay open`);
    }
    assertEqual(
      (await http("GET", `${base}/api/health/detailed`)).status,
      401,
      "/api/health/detailed must need the key",
    );
    assertEqual(
      (await http("GET", `${base}/api/health/detailed`, { headers: auth }))
        .status,
      200,
      "/api/health/detailed must open with the key",
    );
    assertEqual(
      (await http("GET", `${base}/api/version`)).status,
      401,
      "/api/version must be registered at its own path and need the key",
    );
    assertEqual(
      (await http("GET", `${base}/api/version`, { headers: auth })).status,
      200,
      "/api/version must open with the key",
    );
    assertEqual(
      (await http("GET", `${base}/api/health/api/version`, { headers: auth }))
        .status,
      404,
      "the mis-registered version path must be gone",
    );

    const executeNoKey = await http("POST", `${base}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
    });
    assertEqual(executeNoKey.status, 401, "tool execution needs the key");
    const executeKey = await http("POST", `${base}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
      headers: auth,
    });
    assertEqual(
      executeKey.status,
      200,
      "tool execution is served with the key",
    );

    const tools = await http("GET", `${base}/api/tools`, { headers: auth });
    assertEqual(tools.status, 200, "the tool list opens with the key");
    const names = (
      (tools.json as { data?: { tools?: Array<{ name: string }> } }).data
        ?.tools ?? []
    ).map((tool) => tool.name);
    const builtIn = names.filter((name) =>
      /^(getCurrentTime|calculateMath|readFile|writeFile|listDirectory|executeBashCommand)$/.test(
        name,
      ),
    );
    assertEqual(
      builtIn.length,
      0,
      "no built-in tool may be registered without --enable-builtin-tools",
    );

    const evals = await http("GET", `${base}/v1/evals/stt`, { headers: auth });
    assertEqual(
      evals.status,
      404,
      "the STT evaluation collector must not be mounted by default",
    );

    const generate = await http("POST", `${base}/api/agent/execute`, {
      body: { input: { text: "hello" } },
      headers: auth,
      timeoutMs: 120_000,
    });
    assert(
      generate.status >= 500 && generate.status < 600,
      "with no provider configured the request fails server-side",
    );
    assert(
      !CREDENTIAL_NAME.test(generate.text),
      "the error body must not name a credential or environment variable",
    );

    const transcribe = await http("POST", `${base}/api/agent/transcribe`, {
      body: { audioUrl: "https://localhost/x" },
      headers: auth,
    });
    assertEqual(transcribe.status, 400, "a refused audioUrl is a 400");
    assert(
      errorMessageOf(transcribe).startsWith("audioUrl could not be fetched"),
      "the audioUrl refusal must be the fixed message",
    );
    assert(
      !/127\.0\.0\.1|::1|loopback|resolved/i.test(transcribe.text),
      "the audioUrl refusal must not carry the guard's verdict",
    );

    const wsUrl = `ws://127.0.0.1:${port}/v1/audio/transcriptions/stream`;
    assertEqual(
      (await tryUpgrade(`${wsUrl}?token=${API_KEY}`)).outcome,
      401,
      "the key in ?token= must be refused by default",
    );
    const viaHeader = await tryUpgrade(wsUrl, { headers: auth });
    assertEqual(viaHeader.outcome, "open", "the key in the header opens");
    viaHeader.opened?.socket.terminate();
    const viaProtocol = await tryUpgrade(wsUrl, {
      protocols: ["neurolink", `neurolink-api-key.${API_KEY}`],
    });
    assertEqual(
      viaProtocol.outcome,
      "open",
      "the key in the subprotocol opens",
    );
    viaProtocol.opened?.socket.terminate();
  } finally {
    await run.stop();
  }
});

await test("CLI: `--enable-builtin-tools` puts the built-in tools back", async () => {
  const port = await freePort();
  const run = spawnServe(
    ["--host", "127.0.0.1", "--port", String(port), "--enable-builtin-tools"],
    { NEUROLINK_SERVER_API_KEY: API_KEY },
  );
  try {
    await waitForLive(run, port);
    const tools = await http("GET", `http://127.0.0.1:${port}/api/tools`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    const names = (
      (tools.json as { data?: { tools?: Array<{ name: string }> } }).data
        ?.tools ?? []
    ).map((tool) => tool.name);
    assert(
      names.includes("getCurrentTime"),
      "the built-in tools must be registered when asked for",
    );
  } finally {
    await run.stop();
  }
});

// ---------------------------------------------------------------------------
// The SDK surface, in process
// ---------------------------------------------------------------------------

await test("SDK: createServer() binds loopback by default", async () => {
  const running = await startAdapter({
    framework: "hono",
    config: { host: undefined },
    routes: false,
  });
  try {
    assertEqual(
      running.adapter.getConfig().host,
      "127.0.0.1",
      "the default host must be loopback",
    );
    const address = (
      running.adapter.getNativeServer() as HttpServer
    ).address() as AddressInfo;
    assertEqual(
      address.address,
      "127.0.0.1",
      "the listener must be on loopback",
    );
  } finally {
    await running.stop();
  }
});

await test("SDK: /api/version is registered at its own path, not under /api/health", async () => {
  const running = await startAdapter({
    framework: "hono",
    routes: { allowUnauthenticated: true },
  });
  try {
    const paths = running.adapter.listRoutes().map((route) => route.path);
    assert(paths.includes("/api/version"), "/api/version must be registered");
    assert(
      !paths.includes("/api/health/api/version"),
      "the health prefix must not be prepended to a full path",
    );
    assertEqual(
      (await http("GET", `${running.url}/api/version`)).status,
      200,
      "/api/version must answer",
    );
  } finally {
    await running.stop();
  }
});

await test("SDK: the API-key middleware exempts the probes exactly, at a segment boundary", async () => {
  const running = await startAdapter({
    framework: "hono",
    middleware: [createServerApiKeyMiddleware([API_KEY], "/api")],
    routes: {},
  });
  try {
    for (const probe of [
      "/api/health",
      "/api/health/live",
      "/api/health/ready",
      "/api/health/startup",
      "/api/health/ready?x=1",
    ]) {
      assertEqual(
        (await http("GET", `${running.url}${probe}`)).status,
        200,
        `probe ${probe} must stay open`,
      );
    }
    for (const guarded of [
      "/api/health/detailed",
      "/api/version",
      "/api/metrics",
      "/api/tools",
    ]) {
      assertEqual(
        (await http("GET", `${running.url}${guarded}`)).status,
        401,
        `${guarded} must need the key`,
      );
    }
    assert(
      running.adapter.hasAuthenticationMiddleware(),
      "the key middleware must declare that it authenticates",
    );
  } finally {
    await running.stop();
  }
});

await test("SDK: tool and MCP execution routes answer 403 on a server with no authentication, unless opted out", async () => {
  const closed = await startAdapter({ framework: "hono", routes: {} });
  try {
    const execute = await http("POST", `${closed.url}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
    });
    assertEqual(execute.status, 403, "tool execution must be refused");
    assertEqual(
      errorCodeOf(execute),
      "FORBIDDEN",
      "the refusal must carry the FORBIDDEN code",
    );
    const byName = await http(
      "POST",
      `${closed.url}/api/tools/no-such-tool/execute`,
      { body: {} },
    );
    assertEqual(byName.status, 403, "execution by name must be refused");
    const remove = await http(
      "DELETE",
      `${closed.url}/api/mcp/servers/some-server`,
    );
    assertEqual(remove.status, 403, "removing an MCP server must be refused");
    const mcpExecute = await http(
      "POST",
      `${closed.url}/api/mcp/servers/s/tools/t/execute`,
      { body: {} },
    );
    assertEqual(
      mcpExecute.status,
      403,
      "executing an MCP tool must be refused",
    );
    const list = await http("GET", `${closed.url}/api/tools`);
    assertEqual(list.status, 200, "listing tools stays open");
    const servers = await http("GET", `${closed.url}/api/mcp/servers`);
    assertEqual(servers.status, 200, "listing MCP servers stays open");
  } finally {
    await closed.stop();
  }

  const open = await startAdapter({
    framework: "hono",
    routes: { allowUnauthenticated: true },
  });
  try {
    const execute = await http("POST", `${open.url}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
    });
    assertEqual(
      execute.status,
      200,
      "with allowUnauthenticated the route is served",
    );
  } finally {
    await open.stop();
  }

  process.env.NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED = "1";
  let viaEnv: RunningAdapter | undefined;
  try {
    viaEnv = await startAdapter({ framework: "hono", routes: {} });
    const execute = await http("POST", `${viaEnv.url}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
    });
    assertEqual(
      execute.status,
      200,
      "NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED=1 opens the route",
    );
  } finally {
    delete process.env.NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED;
    await viaEnv?.stop();
  }

  const keyed = await startAdapter({
    framework: "hono",
    middleware: [createServerApiKeyMiddleware([API_KEY], "/api")],
    routes: {},
  });
  try {
    const noKey = await http("POST", `${keyed.url}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
    });
    assertEqual(noKey.status, 401, "with authentication, no key is a 401");
    const withKey = await http("POST", `${keyed.url}/api/tools/execute`, {
      body: { name: "no-such-tool", arguments: {} },
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    assertEqual(withKey.status, 200, "with the key the route is served");
  } finally {
    await keyed.stop();
  }
});

await test("SDK: createAllRoutes({ tools: false }) leaves the tool routes out", async () => {
  const withTools = createAllRoutes("/api", {});
  const withoutTools = createAllRoutes("/api", { tools: false });
  assert(
    withTools.some((group) => group.prefix === "/api/tools"),
    "the tool routes are mounted by default",
  );
  assert(
    !withoutTools.some((group) => group.prefix === "/api/tools"),
    "tools: false must omit the tool routes",
  );
});

await test("rate limiter: the TCP peer is the key; a rotating X-Forwarded-For does not escape, a second address is not blocked", async () => {
  for (const framework of FRAMEWORKS) {
    const running = await startAdapter({
      framework,
      config: {
        rateLimit: { enabled: true, maxRequests: 3, windowMs: 60_000 },
      },
      routes: { allowUnauthenticated: true },
    });
    try {
      const statuses: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const reply = await http("GET", `${running.url}/api/health/live`, {
          headers: { "x-forwarded-for": `10.0.0.${i}, 192.168.1.${i}` },
          localAddress: "127.0.0.1",
        });
        statuses.push(reply.status);
      }
      assertEqual(
        statuses.slice(0, 3).filter((s) => s === 200).length,
        3,
        `${framework}: the first three requests from one peer pass`,
      );
      assertEqual(
        statuses[3],
        429,
        `${framework}: the fourth request from one peer is limited although every header differed`,
      );
      const other = await http("GET", `${running.url}/api/health/live`, {
        localAddress: "127.0.0.2",
      });
      assertEqual(
        other.status,
        200,
        `${framework}: a second peer address has its own bucket`,
      );
    } finally {
      await running.stop();
    }
  }
});

await test("rate limiter: with trustProxy the forwarded client is the key, taken from the right of X-Forwarded-For", async () => {
  for (const framework of FRAMEWORKS) {
    const running = await startAdapter({
      framework,
      config: {
        rateLimit: {
          enabled: true,
          maxRequests: 3,
          windowMs: 60_000,
          trustProxy: true,
          trustedProxies: ["192.168.1.1"],
        },
      },
      routes: { allowUnauthenticated: true },
    });
    try {
      const distinct: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const reply = await http("GET", `${running.url}/api/health/live`, {
          // The leftmost entry is what a client would forge; the client as the
          // trusted proxy saw it is the one before the proxy's own hop.
          headers: { "x-forwarded-for": `1.1.1.1, 10.0.0.${i}, 192.168.1.1` },
        });
        distinct.push(reply.status);
      }
      assertEqual(
        distinct.filter((s) => s === 200).length,
        4,
        `${framework}: four different forwarded clients get four buckets`,
      );
      const same: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const reply = await http("GET", `${running.url}/api/health/live`, {
          headers: { "x-forwarded-for": `1.1.1.${i}, 10.0.0.9, 192.168.1.1` },
        });
        same.push(reply.status);
      }
      assertEqual(
        same[3],
        429,
        `${framework}: one forwarded client is limited although the forgeable leftmost entry rotated`,
      );
    } finally {
      await running.stop();
    }
  }
});

await test("errors: a provider failure reaches the client as a fixed message and a request id, never a credential name", async () => {
  for (const framework of FRAMEWORKS) {
    const running = await startAdapter({
      framework,
      routes: { allowUnauthenticated: true },
    });
    try {
      const execute = await http("POST", `${running.url}/api/agent/execute`, {
        body: { input: { text: "hello" } },
        timeoutMs: 120_000,
      });
      assert(
        execute.status >= 500 && execute.status < 600,
        `${framework}: with no provider the request fails server-side`,
      );
      assert(
        !CREDENTIAL_NAME.test(execute.text),
        `${framework}: the execute error body must not name a credential`,
      );
      const code = errorCodeOf(execute);
      assert(
        code === "PROVIDER_NOT_CONFIGURED" ||
          code === "INTERNAL_ERROR" ||
          code === "EXECUTION_FAILED",
        `${framework}: the execute error carries a category code`,
      );
      const body = execute.json as {
        metadata?: { requestId?: unknown };
      };
      assert(
        typeof body.metadata?.requestId === "string",
        `${framework}: the execute error carries the request id`,
      );

      const stream = await http("POST", `${running.url}/api/agent/stream`, {
        body: { input: { text: "hello" } },
        timeoutMs: 120_000,
      });
      assert(
        !CREDENTIAL_NAME.test(stream.text),
        `${framework}: the stream error event must not name a credential`,
      );
      assert(
        /error/i.test(stream.text),
        `${framework}: the stream must report the failure as an error event`,
      );
    } finally {
      await running.stop();
    }
  }
});

await test("errors: the audioUrl SSRF verdict is not returned to the caller", async () => {
  const running = await startAdapter({
    framework: "hono",
    routes: { allowUnauthenticated: true },
  });
  try {
    for (const audioUrl of ["https://localhost/x", "https://127.0.0.1/x"]) {
      const reply = await http("POST", `${running.url}/api/agent/transcribe`, {
        body: { audioUrl },
      });
      assertEqual(reply.status, 400, "a refused audioUrl is a 400");
      assert(
        errorMessageOf(reply).startsWith("audioUrl could not be fetched"),
        "the refusal must be the fixed message",
      );
      assert(
        !/127\.0\.0\.1|::1|loopback|resolved|private/i.test(reply.text),
        "the refusal must not describe the address",
      );
    }
  } finally {
    await running.stop();
  }
});

await test("timeouts: a request past config.timeout is answered 504 and its handler is aborted, on every adapter", async () => {
  for (const framework of FRAMEWORKS) {
    let sawAbort = false;
    const running = await startAdapter({
      framework,
      config: { timeout: 300 },
      routes: false,
      extraRoutes: (adapter) => {
        adapter.registerRoute({
          method: "GET",
          path: "/api/slow",
          handler: async (ctx) => {
            await new Promise<void>((resolvePromise) => {
              const timer = setTimeout(resolvePromise, 3_000);
              ctx.abortSignal?.addEventListener(
                "abort",
                () => {
                  sawAbort = true;
                  clearTimeout(timer);
                  resolvePromise();
                },
                { once: true },
              );
            });
            return { done: true };
          },
        });
      },
    });
    try {
      const started = Date.now();
      const reply = await http("GET", `${running.url}/api/slow`);
      const elapsed = Date.now() - started;
      assertEqual(reply.status, 504, `${framework}: the slow request is a 504`);
      assert(
        elapsed < 2_500,
        `${framework}: the 504 arrives at the timeout, not when the handler would have finished`,
      );
      // Hono answers 504 from its own timeout middleware and aborts through
      // the same controller; give the abort a tick to land before checking.
      await delay(50);
      assert(sawAbort, `${framework}: the handler's abort signal must fire`);
    } finally {
      await running.stop();
    }
  }
});

await test("CORS: Koa sends the literal wildcard, and wildcard + credentials is refused for every adapter", async () => {
  const running = await startAdapter({
    framework: "koa",
    config: { cors: { enabled: true, origins: ["*"] } },
    routes: { allowUnauthenticated: true },
  });
  try {
    const reply = await http("GET", `${running.url}/api/health/live`, {
      headers: { origin: "http://evil.test" },
    });
    assertEqual(
      reply.headers["access-control-allow-origin"],
      "*",
      "the wildcard must be sent as the literal *, not the request's Origin",
    );
  } finally {
    await running.stop();
  }
  for (const framework of FRAMEWORKS) {
    let refused = false;
    try {
      await createServer(new NeuroLink(), {
        framework,
        config: {
          port: 0,
          host: "127.0.0.1",
          cors: { enabled: true, origins: ["*"], credentials: true },
        },
      });
    } catch {
      refused = true;
    }
    assert(
      refused,
      `${framework}: cors.credentials with the wildcard origin must be refused at construction`,
    );
  }
});

await test("WebSocket: the (N+1)th connection is answered 503 before the handshake, in all and per address", async () => {
  await withHttpServer(async (server, port) => {
    const nl = new NeuroLink();
    const attached = await attachTranscribeWebSocket(server, nl, {
      maxConnections: 2,
      path: "/cap",
    });
    const perAddress = await attachTranscribeWebSocket(server, nl, {
      maxConnectionsPerAddress: 1,
      path: "/per",
    });
    const open: WebSocket[] = [];
    try {
      for (let i = 0; i < 2; i++) {
        const result = await tryUpgrade(`ws://127.0.0.1:${port}/cap`);
        assertEqual(result.outcome, "open", `connection ${i + 1} of 2 opens`);
        if (result.opened) {
          open.push(result.opened.socket);
        }
      }
      const third = await tryUpgrade(`ws://127.0.0.1:${port}/cap`);
      assertEqual(third.outcome, 503, "the third connection is refused");
      open[0]?.terminate();
      await delay(100);
      const again = await tryUpgrade(`ws://127.0.0.1:${port}/cap`);
      assertEqual(again.outcome, "open", "a closed connection frees its slot");
      if (again.opened) {
        open.push(again.opened.socket);
      }

      const first = await tryUpgrade(`ws://127.0.0.1:${port}/per`);
      assertEqual(first.outcome, "open", "the first per-address socket opens");
      if (first.opened) {
        open.push(first.opened.socket);
      }
      const second = await tryUpgrade(`ws://127.0.0.1:${port}/per`);
      assertEqual(
        second.outcome,
        503,
        "the second from one address is refused",
      );
    } finally {
      for (const socket of open) {
        socket.terminate();
      }
      attached.close();
      perAddress.close();
    }
  });
});

await test("WebSocket: `?token=` is refused unless allowQueryToken; the header and the subprotocol carry the key", async () => {
  await withHttpServer(async (server, port) => {
    const nl = new NeuroLink();
    const strict = await attachTranscribeWebSocket(server, nl, {
      authToken: "s3cret",
      path: "/strict",
    });
    const lenient = await attachTranscribeWebSocket(server, nl, {
      authToken: "s3cret",
      path: "/lenient",
      allowQueryToken: true,
    });
    const sockets: WebSocket[] = [];
    try {
      assertEqual(
        (await tryUpgrade(`ws://127.0.0.1:${port}/strict?token=s3cret`))
          .outcome,
        401,
        "the key in the URL is refused by default",
      );
      const header = await tryUpgrade(`ws://127.0.0.1:${port}/strict`, {
        headers: { authorization: "Bearer s3cret" },
      });
      assertEqual(header.outcome, "open", "the key in the header opens");
      if (header.opened) {
        sockets.push(header.opened.socket);
      }
      const protocol = await tryUpgrade(`ws://127.0.0.1:${port}/strict`, {
        protocols: ["neurolink", "neurolink-api-key.s3cret"],
      });
      assertEqual(protocol.outcome, "open", "the key in the subprotocol opens");
      if (protocol.opened) {
        assertEqual(
          protocol.opened.socket.protocol,
          "neurolink",
          "the server selects the plain subprotocol, never the key-bearing one",
        );
        sockets.push(protocol.opened.socket);
      }
      assertEqual(
        (
          await tryUpgrade(`ws://127.0.0.1:${port}/strict`, {
            protocols: ["neurolink", "neurolink-api-key.wrong"],
          })
        ).outcome,
        401,
        "a wrong key in the subprotocol is refused",
      );
      const query = await tryUpgrade(
        `ws://127.0.0.1:${port}/lenient?token=s3cret`,
      );
      assertEqual(
        query.outcome,
        "open",
        "with allowQueryToken the key in the URL opens",
      );
      if (query.opened) {
        sockets.push(query.opened.socket);
      }
    } finally {
      for (const socket of sockets) {
        socket.terminate();
      }
      strict.close();
      lenient.close();
    }
  });
});

await test("WebSocket: a session opened with a secret admits only joins that present it; requireSessionSecret refuses a bare session", async () => {
  await withHttpServer(async (server, port) => {
    const nl = new NeuroLink();
    const attached = await attachTranscribeWebSocket(server, nl, {
      path: "/s",
    });
    const strict = await attachTranscribeWebSocket(server, nl, {
      path: "/strict",
      requireSessionSecret: true,
    });
    const sockets: WebSocket[] = [];
    try {
      const owner = await tryUpgrade(
        `ws://127.0.0.1:${port}/s/subscribe?session=call-1&secret=abc`,
      );
      assertEqual(
        owner.outcome,
        "open",
        "the first listener opens the session",
      );
      if (owner.opened) {
        sockets.push(owner.opened.socket);
        const quiet = await firstFrameAndClose(owner.opened, 300);
        assertEqual(
          quiet.closeCode,
          undefined,
          "the listener that set the secret stays connected",
        );
      }
      const stranger = await tryUpgrade(
        `ws://127.0.0.1:${port}/s/subscribe?session=call-1`,
      );
      assertEqual(stranger.outcome, "open", "the handshake itself succeeds");
      if (stranger.opened) {
        sockets.push(stranger.opened.socket);
        const refused = await firstFrameAndClose(stranger.opened, 3_000);
        assertEqual(
          refused.closeCode,
          1008,
          "a join without the secret is closed with 1008",
        );
        assertEqual(
          (refused.message as { type?: string } | undefined)?.type,
          "error",
          "the refusal is announced as an error event",
        );
      }
      const wrong = await tryUpgrade(
        `ws://127.0.0.1:${port}/s/subscribe?session=call-1&secret=nope`,
      );
      assertEqual(wrong.outcome, "open", "the handshake itself succeeds");
      if (wrong.opened) {
        sockets.push(wrong.opened.socket);
        const refused = await firstFrameAndClose(wrong.opened, 3_000);
        assertEqual(
          refused.closeCode,
          1008,
          "a join with a wrong secret is closed with 1008",
        );
      }
      const peer = await tryUpgrade(
        `ws://127.0.0.1:${port}/s/subscribe?session=call-1&secret=abc`,
      );
      assertEqual(peer.outcome, "open", "a join with the secret opens");
      if (peer.opened) {
        sockets.push(peer.opened.socket);
        const quiet = await firstFrameAndClose(peer.opened, 300);
        assertEqual(
          quiet.closeCode,
          undefined,
          "the join with the secret stays connected",
        );
      }
      const bare = await tryUpgrade(
        `ws://127.0.0.1:${port}/strict/subscribe?session=call-2`,
      );
      assertEqual(bare.outcome, "open", "the handshake itself succeeds");
      if (bare.opened) {
        sockets.push(bare.opened.socket);
        const refused = await firstFrameAndClose(bare.opened, 3_000);
        assertEqual(
          refused.closeCode,
          1008,
          "with requireSessionSecret a new session without a secret is refused",
        );
      }
    } finally {
      for (const socket of sockets) {
        socket.terminate();
      }
      attached.close();
      strict.close();
    }
  });
});

await test("WebSocketConnectionManager: naming an auth strategy makes authentication required", async () => {
  const manager = new WebSocketConnectionManager({
    auth: { strategy: "bearer" },
  });
  let refused = false;
  try {
    await manager.handleConnection({}, "/ws");
  } catch {
    refused = true;
  }
  assert(
    refused,
    "a connection with no user must be refused once a strategy is configured",
  );
  const open = new WebSocketConnectionManager();
  const connection = await open.handleConnection(
    { close: () => undefined },
    "/ws",
  );
  assert(
    typeof connection.id === "string",
    "with no strategy the manager stays open, as before",
  );
  await open.close(connection.id);
});

await test("STT evals: off by default, on by option or NEUROLINK_STT_EVAL_ENABLED=1, bounded in bytes, and scoped to the caller", async () => {
  const segment = (id: string, text: string) => ({
    id,
    source: "primary",
    model: "m",
    participant_identity: "alice",
    text,
    received_at: 1_792_000_000,
  });
  const batch = (call: string, text = "hello there") => ({
    call_id: call,
    batch: 1,
    models: { primary: "a", shadow: "b" },
    segments: [segment(`${call}-1`, text)],
  });

  const off = await startAdapter({
    framework: "hono",
    routes: { allowUnauthenticated: true },
  });
  try {
    assertEqual(
      (await http("GET", `${off.url}/v1/evals/stt`)).status,
      404,
      "the collector is not mounted by default",
    );
  } finally {
    await off.stop();
  }

  process.env.NEUROLINK_STT_EVAL_ENABLED = "1";
  let viaEnv: RunningAdapter | undefined;
  try {
    viaEnv = await startAdapter({
      framework: "hono",
      routes: { allowUnauthenticated: true },
    });
    assertEqual(
      (await http("GET", `${viaEnv.url}/v1/evals/stt`)).status,
      200,
      "NEUROLINK_STT_EVAL_ENABLED=1 mounts the collector",
    );
  } finally {
    delete process.env.NEUROLINK_STT_EVAL_ENABLED;
    await viaEnv?.stop();
  }

  const bounded = await startAdapter({
    framework: "hono",
    routes: {
      allowUnauthenticated: true,
      transcribe: { evals: { maxBytes: 600 } },
    },
  });
  try {
    const filler = "x".repeat(400);
    for (const call of ["c-1", "c-2", "c-3"]) {
      const reply = await http("POST", `${bounded.url}/v1/evals/stt`, {
        body: batch(call, filler),
      });
      assertEqual(reply.status, 200, "a batch is accepted");
    }
    const list = await http("GET", `${bounded.url}/v1/evals/stt`);
    const calls = (
      (list.json as { data?: { calls?: Array<{ call_id: string }> } }).data
        ?.calls ?? []
    ).map((call) => call.call_id);
    assert(
      calls.length < 3,
      "the byte budget must evict the oldest call once exceeded",
    );
    assert(calls.includes("c-3"), "the newest call is kept");
    assert(!calls.includes("c-1"), "the oldest call is evicted first");
  } finally {
    await bounded.stop();
  }

  const scoped = await startAdapter({
    framework: "hono",
    config: { carryMiddlewareState: true },
    middleware: [
      createAuthMiddleware({
        type: "bearer",
        skipDevPlayground: false,
        validate: async (token) => ({ id: token }),
      }),
    ],
    routes: { transcribe: { evals: {} } },
  });
  try {
    const asAlice = { authorization: "Bearer alice" };
    const asBob = { authorization: "Bearer bob" };
    assertEqual(
      (
        await http("POST", `${scoped.url}/v1/evals/stt`, {
          body: batch("owned"),
          headers: asAlice,
        })
      ).status,
      200,
      "the owner posts a call",
    );
    const bobList = await http("GET", `${scoped.url}/v1/evals/stt`, {
      headers: asBob,
    });
    const bobCalls = (
      (bobList.json as { data?: { calls?: Array<{ call_id: string }> } }).data
        ?.calls ?? []
    ).map((call) => call.call_id);
    assert(
      !bobCalls.includes("owned"),
      "another caller does not list the call",
    );
    assertEqual(
      (
        await http("GET", `${scoped.url}/v1/evals/stt/owned`, {
          headers: asBob,
        })
      ).status,
      404,
      "another caller cannot read the call",
    );
    assertEqual(
      (
        await http("POST", `${scoped.url}/v1/evals/stt`, {
          body: batch("owned"),
          headers: asBob,
        })
      ).status,
      403,
      "another caller cannot append to the call",
    );
    assertEqual(
      (
        await http("GET", `${scoped.url}/v1/evals/stt/owned`, {
          headers: asAlice,
        })
      ).status,
      200,
      "the owner reads the call",
    );
  } finally {
    await scoped.stop();
  }
});

await runSuite();
