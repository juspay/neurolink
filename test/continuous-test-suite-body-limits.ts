#!/usr/bin/env tsx
/**
 * Continuous Test Suite: request body size limits, end to end.
 *
 * The server adapters share one default, `bodyParser.maxSize` / `jsonLimit`
 * (10 MB), and the proxy has its own ceiling. This suite drives the surfaces
 * that apply them and checks that they agree:
 *
 *  - the public `createServer` from `../dist/index.js`, once per framework
 *    (Hono, Express, Fastify, Koa), over real HTTP on a loopback port. Every
 *    server carries an auth middleware that counts its calls and an echo route,
 *    so "refused before any handler ran" is a counter, not an inference;
 *  - the built CLI, `node dist/cli/index.js proxy start`, in a throwaway HOME,
 *    with no accounts and `NEUROLINK_PROXY_REQUIRE_GRANT=1`. Its share gate
 *    answers a request that carries no share token with 401, which makes
 *    "this request reached the gate" visible in the status code: a body over
 *    the ceiling must be answered 413 before that, and a normal one must get
 *    the gate's 401.
 *
 * What is covered, per framework: JSON over the default limit, JSON just under
 * it (parsed, reaches the route), JSON over and under a configured limit, a
 * chunked JSON body with no Content-Length, a raised limit, malformed JSON
 * under the limit, and url-encoded forms. For the proxy: over and under a
 * configured ceiling, chunked, malformed JSON, and the per-route defaults: the
 * Messages, token-counting and peer routes (32 MiB), Gemini (100 MiB) and the
 * OpenAI chat and Codex routes (64 MiB), each with a body just over its limit
 * refused and one under it reaching the gate. One ceiling set through
 * NEUROLINK_PROXY_MAX_REQUEST_BODY_BYTES replaces all of them, higher or lower.
 *
 * What is NOT the same on every framework, and is pinned here rather than
 * papered over:
 *  - Fastify has no url-encoded parser, so a form is answered 415 whatever its
 *    size; there is no form limit to test.
 *  - Koa reads forms with koa-bodyparser's own 56kb default, which `maxSize`
 *    does not change, so "a raised limit is honoured" is asserted for forms on
 *    Hono and Express only. JSON is asserted on all four.
 *
 * Not covered: a body that never ends is only bounded, not timed out (a
 * slow-read client is the server timeout's concern); `bodyParser.enabled:
 * false`; a multipart upload (the transcribe suite owns that path and runs
 * against the same shared bounded read); a proxy started with an invalid
 * NEUROLINK_PROXY_MAX_REQUEST_BODY_BYTES; and a ceiling raised above 64 MiB on
 * the OpenAI and Codex routes (a raised ceiling is shown on the token-counting
 * route, whose default is lower; the lookup is the same for every route).
 *
 * Run: pnpm run build && pnpm run test:body-limits
 *
 * Against another build (for example a copy of an older dist, to see which
 * cases it fails): NEUROLINK_SKIP_DIST_FRESHNESS_CHECK=1
 * NEUROLINK_BODY_LIMITS_PACKAGE_ROOT=<directory holding dist/ and package.json>
 * pnpm run test:body-limits
 */

import "./helpers/credentialFreeEnv.js";
import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertDistFresh } from "./helpers/distFreshness.js";
import { assert, assertEqual, defineSuite, delay } from "./helpers/harness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });

// Set before anything can construct a NeuroLink: the repo's tracked
// .mcp-config.json declares a server started through `npx`, and every instance
// would wait out the MCP client timeout when it cannot. This suite is about
// request bodies, not MCP.
process.env.NEUROLINK_SKIP_MCP = "true";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = process.env.NEUROLINK_BODY_LIMITS_PACKAGE_ROOT
  ? resolve(process.env.NEUROLINK_BODY_LIMITS_PACKAGE_ROOT)
  : REPO_ROOT;

// One module graph for the whole file: everything comes from the same build.
const dist: typeof import("../dist/index.js") =
  PACKAGE_ROOT === REPO_ROOT
    ? await import("../dist/index.js")
    : await import(pathToFileURL(join(PACKAGE_ROOT, "dist/index.js")).href);
const { NeuroLink, createServer, createAuthMiddleware } = dist;

const { test, runSuite } = defineSuite("Request body size limits", {
  offline: true,
});

console.log(`  package under test: ${PACKAGE_ROOT}`);

const KIB = 1024;
const MIB = 1024 * 1024;

// ---------------------------------------------------------------------------
// A real HTTP client that streams a body of an exact size
// ---------------------------------------------------------------------------

type BodyKind = "json" | "form";

type Reply = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text: string;
};

type SendOptions = {
  path: string;
  /** Total request body size in bytes. */
  size?: number;
  kind?: BodyKind;
  /** A literal body, instead of `size` bytes of padding. */
  literal?: string;
  contentType?: string;
  /** No Content-Length: the body goes out chunked. */
  chunked?: boolean;
  token?: string;
  /**
   * The server is expected to refuse the body. A server that refuses and then
   * closes the connection (Fastify, Koa, Hono's Node server, which drains for
   * 500ms and then closes) resets a client that keeps writing, and the reset
   * can discard the answer unread. So the client stops writing the moment an
   * answer arrives; with a Content-Length it also waits (up to 2s) for that
   * answer after the first chunk, since a declared size is refused on the
   * headers. A server that reads the whole body first (what this suite is
   * about) says nothing in that time and is simply sent the rest.
   */
  expectRefusal?: boolean;
};

const JSON_PREFIX = '{"pad":"';
const JSON_SUFFIX = '"}';
const FORM_PREFIX = "pad=";
const PAD_CHUNK = Buffer.alloc(64 * KIB, 0x61);

/** Padding bytes inside a body of `size` bytes. */
const padLengthFor = (kind: BodyKind, size: number): number =>
  kind === "json"
    ? size - JSON_PREFIX.length - JSON_SUFFIX.length
    : size - FORM_PREFIX.length;

/**
 * POST a body and return the server's answer. The writer stops as soon as the
 * response has been read: a server that refuses early and then stops reading
 * must not leave the client waiting for a drain that never comes.
 */
function send(port: number, options: SendOptions): Promise<Reply> {
  const kind = options.kind ?? "json";
  const contentType =
    options.contentType ??
    (kind === "json"
      ? "application/json"
      : "application/x-www-form-urlencoded");
  const literal = options.literal;
  const total =
    literal !== undefined ? Buffer.byteLength(literal) : (options.size ?? 0);
  const headers: Record<string, string> = { "content-type": contentType };
  if (!options.chunked) {
    headers["content-length"] = String(total);
  }
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  return new Promise<Reply>((resolveReply, rejectReply) => {
    const req = httpRequest({
      host: "127.0.0.1",
      port,
      path: options.path,
      method: "POST",
      headers,
      agent: false,
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        req.destroy();
        rejectReply(new Error("no response within 60s"));
      }
    }, 60_000);
    const settle = (action: () => void): void => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        action();
      }
    };

    let answered: () => void = () => undefined;
    let responseSeen = false;
    const responded = new Promise<void>((done) => {
      answered = () => {
        responseSeen = true;
        done();
      };
    });
    req.on("response", (res) => {
      // A final answer before the body is complete means the server is done
      // with the request; the rest of the body is not sent.
      answered();
      const parts: Buffer[] = [];
      res.on("data", (part: Buffer) => parts.push(part));
      res.on("end", () => {
        settle(() =>
          resolveReply({
            status: res.statusCode ?? 0,
            headers: res.headers,
            text: Buffer.concat(parts).toString("utf8"),
          }),
        );
        req.destroy();
      });
      res.on("error", () =>
        settle(() => rejectReply(new Error("response stream failed"))),
      );
    });
    req.on("error", (error: NodeJS.ErrnoException) =>
      settle(() => rejectReply(new Error(`no response (${error.code})`))),
    );

    const write = (chunk: Buffer | string): Promise<void> =>
      new Promise<void>((done) => {
        if (settled || req.destroyed) {
          done();
          return;
        }
        if (req.write(chunk)) {
          done();
          return;
        }
        const release = (): void => {
          req.off("drain", release);
          req.off("close", release);
          req.off("error", release);
          done();
        };
        req.once("drain", release);
        req.once("close", release);
        req.once("error", release);
      });

    void (async () => {
      if (literal !== undefined) {
        await write(literal);
      } else {
        const prefix = kind === "json" ? JSON_PREFIX : FORM_PREFIX;
        const suffix = kind === "json" ? JSON_SUFFIX : "";
        await write(prefix);
        let remaining = padLengthFor(kind, total);
        let paused = false;
        while (remaining > 0 && !settled && !req.destroyed && !responseSeen) {
          const length = Math.min(PAD_CHUNK.length, remaining);
          await write(PAD_CHUNK.subarray(0, length));
          remaining -= length;
          if (!paused) {
            paused = true;
            if (options.expectRefusal && !options.chunked) {
              await Promise.race([responded, delay(2_000)]);
            }
          }
          if (options.expectRefusal) {
            // Let an answer that is already on the socket be read.
            await new Promise<void>((next) => setImmediate(next));
          }
          if (responseSeen) {
            break;
          }
        }
        if (suffix && !responseSeen) {
          await write(suffix);
        }
      }
      if (!settled && !req.destroyed && !responseSeen) {
        req.end();
      }
    })();
  });
}

const parseJson = (reply: Reply): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(reply.text);
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

/** The route's own answer, unwrapped from the adapters' `{ data, metadata }` envelope. */
const dataOf = (reply: Reply): Record<string, unknown> => {
  const data = parseJson(reply).data;
  return data !== null && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
};

const errorCodeOf = (reply: Reply): unknown => {
  const error = parseJson(reply).error;
  return error !== null && typeof error === "object"
    ? (error as Record<string, unknown>).code
    : undefined;
};

// ---------------------------------------------------------------------------
// One server per framework and limit configuration
// ---------------------------------------------------------------------------

type Framework = "hono" | "express" | "fastify" | "koa";
const FRAMEWORKS: readonly Framework[] = ["hono", "express", "fastify", "koa"];

type LimitConfig = { maxSize?: string; jsonLimit?: string };

const DEFAULT_LIMITS: LimitConfig = {};
const SMALL_LIMITS: LimitConfig = { maxSize: "64kb", jsonLimit: "64kb" };
const RAISED_LIMITS: LimitConfig = { maxSize: "20mb", jsonLimit: "20mb" };

const VALID_TOKEN = "secret";

type Running = {
  port: number;
  authCalls: () => number;
  routeCalls: () => number;
  stop: () => Promise<void>;
};

function freePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createTcpServer();
    probe.once("error", rejectPort);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolvePort(port));
    });
  });
}

const neurolink = new NeuroLink();
const running = new Map<string, Promise<Running>>();

function serverFor(
  framework: Framework,
  limits: LimitConfig,
  label: string,
): Promise<Running> {
  const key = `${framework}/${label}`;
  const existing = running.get(key);
  if (existing) {
    return existing;
  }
  const started = (async (): Promise<Running> => {
    const port = await freePort();
    const adapter = await createServer(neurolink, {
      framework,
      config: {
        port,
        host: "127.0.0.1",
        rateLimit: { enabled: false },
        logging: { enabled: false },
        ...(Object.keys(limits).length > 0 ? { bodyParser: limits } : {}),
      },
    });

    let authCalls = 0;
    let routeCalls = 0;
    const auth = createAuthMiddleware({
      type: "bearer",
      validate: async (token: string) =>
        token === VALID_TOKEN ? { id: "body-limits" } : null,
    });
    adapter.registerMiddleware({
      ...auth,
      handler: (ctx, next) => {
        authCalls += 1;
        return auth.handler(ctx, next);
      },
    });
    adapter.registerRoute({
      method: "POST",
      path: "/echo",
      handler: async (ctx) => {
        routeCalls += 1;
        const body: unknown = ctx.body;
        const isObject =
          body !== null && typeof body === "object" && !Buffer.isBuffer(body);
        const pad = isObject
          ? (body as Record<string, unknown>).pad
          : undefined;
        return {
          bodyType: Buffer.isBuffer(body)
            ? "buffer"
            : body === null
              ? "null"
              : typeof body,
          padLength: typeof pad === "string" ? pad.length : null,
          // Small bodies come back whole so a parse can be compared exactly.
          echo:
            isObject && JSON.stringify(body).length < 2048 ? body : undefined,
        };
      },
    });
    await adapter.initialize();
    await adapter.start();
    return {
      port,
      authCalls: () => authCalls,
      routeCalls: () => routeCalls,
      stop: () => adapter.stop(),
    };
  })();
  running.set(key, started);
  return started;
}

/** Calls the auth middleware and the route made while `action` ran. */
async function countingCalls<T>(
  server: Running,
  action: () => Promise<T>,
): Promise<{ result: T; auth: number; route: number }> {
  const auth = server.authCalls();
  const route = server.routeCalls();
  const result = await action();
  return {
    result,
    auth: server.authCalls() - auth,
    route: server.routeCalls() - route,
  };
}

const DEFAULT_LIMIT_BYTES = 10 * MIB;

/**
 * What a truncated JSON body was answered with before this suite existed.
 * They differ by framework, and only Hono's depends on the code under test.
 */
const MALFORMED_JSON_STATUS: Record<Framework, number> = {
  hono: 200,
  express: 500,
  fastify: 400,
  koa: 400,
};

// ---------------------------------------------------------------------------
// The server adapters
// ---------------------------------------------------------------------------

for (const framework of FRAMEWORKS) {
  const tag = `[${framework}]`;

  await test(`${tag} JSON over the default limit is refused with 413 before any handler runs`, async () => {
    const server = await serverFor(framework, DEFAULT_LIMITS, "default");
    const { result, auth, route } = await countingCalls(server, () =>
      send(server.port, {
        path: "/echo",
        size: DEFAULT_LIMIT_BYTES + KIB,
        expectRefusal: true,
      }),
    );
    assertEqual(result.status, 413, "an oversized JSON body is a 413");
    assertEqual(auth, 0, "the auth middleware did not run");
    assertEqual(route, 0, "the route did not run");
    if (framework === "hono") {
      // The shape the Express adapter already answers with.
      assertEqual(
        errorCodeOf(result),
        "PAYLOAD_TOO_LARGE",
        "the answer carries the adapters' PAYLOAD_TOO_LARGE code",
      );
      assert(
        typeof (parseJson(result).metadata as { requestId?: unknown })
          ?.requestId === "string",
        "the answer carries the adapters' metadata envelope",
      );
    }
  });

  await test(`${tag} JSON just under the default limit is parsed and reaches the route`, async () => {
    const server = await serverFor(framework, DEFAULT_LIMITS, "default");
    const size = DEFAULT_LIMIT_BYTES - KIB;
    const { result, auth, route } = await countingCalls(server, () =>
      send(server.port, { path: "/echo", size, token: VALID_TOKEN }),
    );
    assertEqual(result.status, 200, "a body under the limit is served");
    assertEqual(auth, 1, "the auth middleware ran once");
    assertEqual(route, 1, "the route ran once");
    assertEqual(
      dataOf(result).padLength,
      padLengthFor("json", size),
      "the route saw the whole parsed body",
    );
  });

  await test(`${tag} a configured limit applies: JSON over it is refused, JSON under it is parsed`, async () => {
    const server = await serverFor(framework, SMALL_LIMITS, "small");
    const over = await countingCalls(server, () =>
      send(server.port, {
        path: "/echo",
        size: 128 * KIB,
        expectRefusal: true,
      }),
    );
    assertEqual(over.result.status, 413, "128 KiB is over a 64kb limit");
    assertEqual(over.auth + over.route, 0, "no handler ran for it");

    const under = await countingCalls(server, () =>
      send(server.port, {
        path: "/echo",
        size: 32 * KIB,
        token: VALID_TOKEN,
      }),
    );
    assertEqual(under.result.status, 200, "32 KiB is under a 64kb limit");
    assertEqual(
      dataOf(under.result).padLength,
      padLengthFor("json", 32 * KIB),
      "the body was parsed",
    );
  });

  await test(`${tag} a chunked JSON body with no Content-Length is refused over the limit`, async () => {
    const server = await serverFor(framework, SMALL_LIMITS, "small");
    const { result, auth, route } = await countingCalls(server, () =>
      send(server.port, {
        path: "/echo",
        size: 96 * KIB,
        chunked: true,
        expectRefusal: true,
      }),
    );
    assertEqual(result.status, 413, "a chunked oversized body is a 413");
    assertEqual(auth + route, 0, "no handler ran for it");

    const under = await send(server.port, {
      path: "/echo",
      size: 16 * KIB,
      chunked: true,
      token: VALID_TOKEN,
    });
    assertEqual(under.status, 200, "a chunked body under the limit is served");
    assertEqual(
      dataOf(under).padLength,
      padLengthFor("json", 16 * KIB),
      "the chunked body was parsed",
    );
  });

  await test(`${tag} malformed JSON under the limit keeps today's answer`, async () => {
    const server = await serverFor(framework, DEFAULT_LIMITS, "default");
    const { result, route } = await countingCalls(server, () =>
      send(server.port, {
        path: "/echo",
        literal: '{"pad":',
        token: VALID_TOKEN,
      }),
    );
    assertEqual(
      result.status,
      MALFORMED_JSON_STATUS[framework],
      "the status malformed JSON got before the limit was applied",
    );
    if (framework === "hono") {
      // Hono hands the route an undefined body and lets it decide.
      assertEqual(route, 1, "the route ran");
      assertEqual(
        dataOf(result).bodyType,
        "undefined",
        "the route saw no body",
      );
    } else {
      assertEqual(route, 0, "the framework refused it before the route");
    }
  });

  await test(`${tag} a raised limit is honoured for JSON`, async () => {
    const server = await serverFor(framework, RAISED_LIMITS, "raised");
    const size = 12 * MIB;
    const { result, route } = await countingCalls(server, () =>
      send(server.port, { path: "/echo", size, token: VALID_TOKEN }),
    );
    assertEqual(result.status, 200, "12 MiB is served under a 20mb limit");
    assertEqual(route, 1, "the route ran");
    assertEqual(
      dataOf(result).padLength,
      padLengthFor("json", size),
      "the whole body was parsed",
    );

    const over = await send(server.port, {
      path: "/echo",
      size: 21 * MIB,
      expectRefusal: true,
    });
    assertEqual(over.status, 413, "21 MiB is still over a 20mb limit");
  });

  if (framework === "fastify") {
    await test(`${tag} a url-encoded form is refused 415 whatever its size (no form parser)`, async () => {
      const server = await serverFor(framework, SMALL_LIMITS, "small");
      const { result, auth, route } = await countingCalls(server, () =>
        send(server.port, {
          path: "/echo",
          kind: "form",
          size: 8 * KIB,
          token: VALID_TOKEN,
          expectRefusal: true,
        }),
      );
      assertEqual(result.status, 415, "Fastify has no url-encoded parser");
      assertEqual(auth + route, 0, "no handler ran");
    });
  } else {
    await test(`${tag} a form over the limit is refused with 413, one under it is parsed`, async () => {
      const server = await serverFor(framework, SMALL_LIMITS, "small");
      const over = await countingCalls(server, () =>
        send(server.port, {
          path: "/echo",
          kind: "form",
          size: 256 * KIB,
          expectRefusal: true,
        }),
      );
      assertEqual(over.result.status, 413, "a form over the limit is a 413");
      assertEqual(over.auth + over.route, 0, "no handler ran for it");

      const under = await send(server.port, {
        path: "/echo",
        kind: "form",
        size: 8 * KIB,
        token: VALID_TOKEN,
      });
      assertEqual(under.status, 200, "a form under the limit is served");
      assertEqual(
        dataOf(under).padLength,
        padLengthFor("form", 8 * KIB),
        "the form was parsed",
      );
    });
  }

  if (framework === "hono" || framework === "express") {
    await test(`${tag} a raised limit is honoured for forms`, async () => {
      const server = await serverFor(framework, RAISED_LIMITS, "raised");
      const size = 12 * MIB;
      const { result, route } = await countingCalls(server, () =>
        send(server.port, {
          path: "/echo",
          kind: "form",
          size,
          token: VALID_TOKEN,
        }),
      );
      assertEqual(result.status, 200, "a 12 MiB form is served under 20mb");
      assertEqual(route, 1, "the route ran");
      assertEqual(
        dataOf(result).padLength,
        padLengthFor("form", size),
        "the whole form was parsed",
      );
    });
  }

  if (framework === "hono") {
    await test(`${tag} bodies parse exactly as they did when Hono read them itself`, async () => {
      const server = await serverFor(framework, DEFAULT_LIMITS, "default");
      const post = (literal: string, contentType: string): Promise<Reply> =>
        send(server.port, {
          path: "/echo",
          literal,
          contentType,
          token: VALID_TOKEN,
        });
      const echoOf = (reply: Reply): string =>
        JSON.stringify(dataOf(reply).echo);

      const unicode = {
        name: "h\u00e9llo \u2603 \u65e5\u672c",
        n: [1, 2, { x: null }],
      };
      assertEqual(
        echoOf(await post(JSON.stringify(unicode), "application/json")),
        JSON.stringify(unicode),
        "non-ASCII JSON is decoded as UTF-8",
      );
      // Built from a code point: a literal U+FEFF is easy to lose in a file.
      const byteOrderMark = String.fromCharCode(0xfeff);
      assertEqual(
        echoOf(await post(`${byteOrderMark}{"a":1}`, "application/json")),
        '{"a":1}',
        "a leading byte-order mark is ignored",
      );
      assertEqual(
        echoOf(await post('{"a":"b"}', "application/json; charset=utf-8")),
        '{"a":"b"}',
        "a content type with parameters is JSON",
      );
      assertEqual(
        echoOf(await post("[1,2,3]", "application/json")),
        JSON.stringify([1, 2, 3]),
        "a JSON array is parsed",
      );
      assertEqual(
        dataOf(await post("", "application/json")).bodyType,
        "undefined",
        "an empty JSON body is no body",
      );
      assertEqual(
        echoOf(
          await post(
            "a=1&a=2&b[]=x&b[]=y&c=%C3%A9+z&d=",
            "application/x-www-form-urlencoded",
          ),
        ),
        JSON.stringify({ a: "2", "b[]": ["x", "y"], c: "\u00e9 z", d: "" }),
        "a form keeps the last repeated key, groups [] keys and decodes percent-escapes",
      );
      assertEqual(
        echoOf(await post("", "application/x-www-form-urlencoded")),
        "{}",
        "an empty form is an empty object",
      );
    });
  }
}

// ---------------------------------------------------------------------------
// The proxy (the built CLI)
// ---------------------------------------------------------------------------

const PROXY_CEILING_ENV = "NEUROLINK_PROXY_MAX_REQUEST_BODY_BYTES";
/** The Claude Messages API's documented maximum request size. */
const PROXY_DEFAULT_CEILING_BYTES = 32 * MIB;

type ProxyInstance = {
  port: number;
  child: ChildProcess;
  output: () => string;
  stop: () => Promise<void>;
};

const startedProxies: ProxyInstance[] = [];

// A proxy left running would hold its port and a node process after a failure.
process.on("exit", () => {
  for (const proxy of startedProxies) {
    proxy.child.kill("SIGKILL");
  }
});

/**
 * Start `proxy start` with no accounts. `NEUROLINK_PROXY_REQUIRE_GRANT=1` makes
 * the share gate refuse every request that carries no share token with 401, so
 * a request that got past the body check is told apart from one that did not.
 * `--dev` keeps state out of the real home and skips client auto-configuration;
 * `NEUROLINK_PROXY_IGNORE_LAUNCHD` keeps it away from launchd.
 */
async function startProxy(ceiling: string | undefined): Promise<ProxyInstance> {
  const port = await freePort();
  const sharePort = await freePort();
  const home = mkdtempSync(join(tmpdir(), "body-limits-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "body-limits-cwd-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
    NEUROLINK_PROXY_REQUIRE_GRANT: "1",
  };
  delete env[PROXY_CEILING_ENV];
  if (ceiling !== undefined) {
    env[PROXY_CEILING_ENV] = ceiling;
  }
  const child = spawn(
    process.execPath,
    [
      join(PACKAGE_ROOT, "dist/cli/index.js"),
      "proxy",
      "start",
      "-p",
      String(port),
      "--share-port",
      String(sharePort),
      "-H",
      "127.0.0.1",
      "--dev",
    ],
    { cwd, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout?.on("data", (part: Buffer) => (output += part));
  child.stderr?.on("data", (part: Buffer) => (output += part));

  const stop = async (): Promise<void> => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      for (let waited = 0; child.exitCode === null && waited < 10_000; ) {
        await delay(200);
        waited += 200;
      }
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  };
  const instance: ProxyInstance = { port, child, output: () => output, stop };
  startedProxies.push(instance);

  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`proxy exited during start-up (code ${child.exitCode})`);
    }
    if (Date.now() > deadline) {
      throw new Error("proxy did not become healthy within 120s");
    }
    try {
      const health = await fetch(`http://127.0.0.1:${port}/health`);
      if (health.ok) {
        return instance;
      }
    } catch {
      // not listening yet
    }
    await delay(500);
  }
}

const header = (reply: Reply, name: string): string | undefined => {
  const value = reply.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const errorTypeOf = (reply: Reply): unknown => {
  const error = parseJson(reply).error;
  return error !== null && typeof error === "object"
    ? (error as Record<string, unknown>).type
    : undefined;
};

/** The gate answers a request with no share token 401 and names the reason. */
const assertReachedGate = (reply: Reply, what: string): void => {
  assertEqual(reply.status, 401, `${what}: answered by the share gate`);
  assertEqual(
    header(reply, "x-neurolink-grant-reason"),
    "missing_token",
    `${what}: the gate named its reason`,
  );
};

const MESSAGES_PATH = "/v1/messages";
const COUNT_TOKENS_PATH = "/v1/messages/count_tokens";
const OPENAI_CHAT_PATH = "/v1/chat/completions";
const CODEX_PATH = "/backend-api/codex/responses";
const GEMINI_PATH = "/v1beta/models/gemini-2.5-pro:generateContent";
// Answered by the proxy itself, with no upstream API behind it.
const PEER_PATH = "/peer/heartbeat";

let smallCeiling: ProxyInstance | undefined;
let defaultCeiling: ProxyInstance | undefined;
let raisedCeiling: ProxyInstance | undefined;
// A digit string long enough to overflow to Infinity: it must be ignored.
let overflowCeiling: ProxyInstance | undefined;

await test("[proxy] the built proxy starts with a small, a default, a raised and an overflowing ceiling", async () => {
  // Start-up takes tens of seconds; the four share it.
  const settled = await Promise.allSettled([
    startProxy("1mb"),
    startProxy(undefined),
    startProxy("48mb"),
    startProxy("9".repeat(400)),
  ]);
  const failure = settled.find((entry) => entry.status === "rejected");
  [smallCeiling, defaultCeiling, raisedCeiling, overflowCeiling] = settled.map(
    (entry) => (entry.status === "fulfilled" ? entry.value : undefined),
  );
  if (failure?.status === "rejected") {
    throw new Error(
      `a proxy failed to start: ${
        failure.reason instanceof Error ? failure.reason.message : "unknown"
      }`,
    );
  }
});

const need = (proxy: ProxyInstance | undefined): ProxyInstance => {
  if (!proxy) {
    throw new Error("the proxy did not start");
  }
  return proxy;
};

await test("[proxy] a body over the configured ceiling gets 413 before the share gate", async () => {
  const proxy = need(smallCeiling);
  const reply = await send(proxy.port, {
    path: MESSAGES_PATH,
    size: 2 * MIB,
    expectRefusal: true,
  });
  assertEqual(reply.status, 413, "a 2 MiB body is over a 1mb ceiling");
  assertEqual(parseJson(reply).type, "error", "the proxy's error envelope");
  assertEqual(
    errorTypeOf(reply),
    "request_too_large",
    "Anthropic's error type for an oversized request",
  );
  assertEqual(
    header(reply, "x-neurolink-grant-reason"),
    undefined,
    "the share gate never saw the request",
  );
});

await test("[proxy] a chunked body over the ceiling gets 413 before the share gate", async () => {
  const proxy = need(smallCeiling);
  const reply = await send(proxy.port, {
    path: MESSAGES_PATH,
    size: MIB + 128 * KIB,
    chunked: true,
    expectRefusal: true,
  });
  assertEqual(
    reply.status,
    413,
    "a chunked 1.125 MiB body is over a 1mb ceiling",
  );
  assertEqual(errorTypeOf(reply), "request_too_large", "the error type");
  assertEqual(
    header(reply, "x-neurolink-grant-reason"),
    undefined,
    "the share gate never saw the request",
  );
});

await test("[proxy] a normal-size request still reaches the share gate", async () => {
  const proxy = need(smallCeiling);
  const request = JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 8,
    messages: [{ role: "user", content: "hi" }],
  });
  assertReachedGate(
    await send(proxy.port, { path: MESSAGES_PATH, literal: request }),
    "a small request",
  );
  assertReachedGate(
    await send(proxy.port, { path: MESSAGES_PATH, size: 512 * KIB }),
    "a 512 KiB request under a 1mb ceiling",
  );
});

await test("[proxy] malformed JSON under the ceiling keeps its 400", async () => {
  const proxy = need(smallCeiling);
  const reply = await send(proxy.port, {
    path: MESSAGES_PATH,
    literal: '{"model":',
  });
  assertEqual(reply.status, 400, "malformed JSON is a 400");
  assertEqual(errorTypeOf(reply), "invalid_request_error", "the error type");
});

await test("[proxy] with no override the Messages route's ceiling is its documented 32 MiB", async () => {
  const proxy = need(defaultCeiling);
  const over = await send(proxy.port, {
    path: MESSAGES_PATH,
    size: PROXY_DEFAULT_CEILING_BYTES + MIB,
    expectRefusal: true,
  });
  assertEqual(over.status, 413, "33 MiB is over the default");
  assertEqual(
    header(over, "x-neurolink-grant-reason"),
    undefined,
    "the share gate never saw it",
  );
  assertReachedGate(
    await send(proxy.port, {
      path: MESSAGES_PATH,
      size: PROXY_DEFAULT_CEILING_BYTES - MIB,
    }),
    "a 31 MiB request",
  );
});

await test("[proxy] a raised ceiling is honoured", async () => {
  const proxy = need(raisedCeiling);
  assertReachedGate(
    await send(proxy.port, { path: MESSAGES_PATH, size: 40 * MIB }),
    "a 40 MiB request under a 48mb ceiling",
  );
  const over = await send(proxy.port, {
    path: MESSAGES_PATH,
    size: 50 * MIB,
    expectRefusal: true,
  });
  assertEqual(over.status, 413, "50 MiB is over a 48mb ceiling");
});

/** Refused by the proxy's body bound, so the share gate never answered. */
const assertRefusedBeforeGate = (reply: Reply, what: string): void => {
  assertEqual(reply.status, 413, `${what}: refused with 413`);
  assertEqual(errorTypeOf(reply), "request_too_large", `${what}: error type`);
  assertEqual(
    header(reply, "x-neurolink-grant-reason"),
    undefined,
    `${what}: the share gate never saw it`,
  );
};

await test("[proxy] the token-counting and peer routes share the Messages limit of 32 MiB", async () => {
  const proxy = need(defaultCeiling);
  for (const [path, name] of [
    [COUNT_TOKENS_PATH, "token counting"],
    [PEER_PATH, "peer"],
  ] as const) {
    assertRefusedBeforeGate(
      await send(proxy.port, {
        path,
        size: PROXY_DEFAULT_CEILING_BYTES + MIB,
        expectRefusal: true,
      }),
      `${name}: 33 MiB`,
    );
  }
  assertReachedGate(
    await send(proxy.port, { path: COUNT_TOKENS_PATH, size: 512 * KIB }),
    "token counting: a small request",
  );
});

await test("[proxy] the Gemini route takes up to its documented 100 MiB", async () => {
  const proxy = need(defaultCeiling);
  assertRefusedBeforeGate(
    await send(proxy.port, {
      path: GEMINI_PATH,
      size: 101 * MIB,
      expectRefusal: true,
    }),
    "101 MiB",
  );
  // Over the Messages limit and under Gemini's: the same body that the
  // Messages route refuses is read, parsed and handed to the gate here.
  assertReachedGate(
    await send(proxy.port, { path: GEMINI_PATH, size: 99 * MIB }),
    "a 99 MiB request",
  );
});

await test("[proxy] the OpenAI chat and Codex routes take up to 64 MiB", async () => {
  const proxy = need(defaultCeiling);
  // Over the Messages limit, so the same body is refused there and served here.
  assertRefusedBeforeGate(
    await send(proxy.port, {
      path: MESSAGES_PATH,
      size: 63 * MIB,
      expectRefusal: true,
    }),
    "the Messages route, 63 MiB",
  );
  for (const [path, name] of [
    [OPENAI_CHAT_PATH, "OpenAI chat"],
    [CODEX_PATH, "Codex"],
  ] as const) {
    assertReachedGate(
      await send(proxy.port, { path, size: 63 * MIB }),
      `${name}: 63 MiB`,
    );
    // A declared size over the limit is refused without the body being sent.
    assertRefusedBeforeGate(
      await send(proxy.port, { path, size: 65 * MIB, expectRefusal: true }),
      `${name}: a declared 65 MiB`,
    );
    // With no declared size the body is read up to the limit, then refused.
    assertRefusedBeforeGate(
      await send(proxy.port, {
        path,
        size: 65 * MIB,
        chunked: true,
        expectRefusal: true,
      }),
      `${name}: a chunked 65 MiB`,
    );
  }
});

await test("[proxy] a configured ceiling replaces every route's limit, below their defaults", async () => {
  const proxy = need(smallCeiling);
  for (const [path, name] of [
    [OPENAI_CHAT_PATH, "OpenAI chat"],
    [CODEX_PATH, "Codex"],
    [GEMINI_PATH, "Gemini"],
    [COUNT_TOKENS_PATH, "token counting"],
    [PEER_PATH, "peer"],
  ] as const) {
    assertRefusedBeforeGate(
      await send(proxy.port, { path, size: 2 * MIB, expectRefusal: true }),
      `${name}: 2 MiB over a 1mb ceiling`,
    );
  }
  for (const [path, name] of [
    [OPENAI_CHAT_PATH, "OpenAI chat"],
    [CODEX_PATH, "Codex"],
    [GEMINI_PATH, "Gemini"],
  ] as const) {
    assertReachedGate(
      await send(proxy.port, { path, size: 512 * KIB }),
      `${name}: 512 KiB under a 1mb ceiling`,
    );
  }
});

await test("[proxy] a configured ceiling replaces every route's limit, above and below their defaults", async () => {
  const proxy = need(raisedCeiling);
  // 40 MiB is over the Messages default (32) and under the 48mb ceiling.
  assertReachedGate(
    await send(proxy.port, { path: COUNT_TOKENS_PATH, size: 40 * MIB }),
    "token counting: 40 MiB raised above its 32 MiB default",
  );
  // 50 MiB is under the Gemini default (100) and the OpenAI default (64), and
  // over the 48mb ceiling.
  for (const [path, name] of [
    [GEMINI_PATH, "Gemini"],
    [OPENAI_CHAT_PATH, "OpenAI chat"],
    [CODEX_PATH, "Codex"],
  ] as const) {
    assertRefusedBeforeGate(
      await send(proxy.port, { path, size: 50 * MIB, expectRefusal: true }),
      `${name}: 50 MiB lowered below its default`,
    );
  }
});

await test("[proxy] a ceiling too long to be finite is ignored, so each route keeps its default", async () => {
  const proxy = need(overflowCeiling);
  assertRefusedBeforeGate(
    await send(proxy.port, {
      path: MESSAGES_PATH,
      size: 33 * MIB,
      expectRefusal: true,
    }),
    "the Messages route, 33 MiB under an overflowing ceiling",
  );
  assertReachedGate(
    await send(proxy.port, { path: MESSAGES_PATH, size: 31 * MIB }),
    "the Messages route, 31 MiB under an overflowing ceiling",
  );
});

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

await Promise.allSettled(startedProxies.map((proxy) => proxy.stop()));
await Promise.allSettled(
  [...running.values()].map(async (server) => (await server).stop()),
);

await runSuite();
