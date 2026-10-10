#!/usr/bin/env tsx
/**
 * Continuous Test Suite — server boundaries (no API, no network beyond loopback)
 *
 * Two request-handling boundaries on the built package:
 *
 *  1. Authorization header parsing. `createAuthMiddleware` (public export of
 *     `dist/index.js`) pulls the credential out of `Bearer <token>` and
 *     `Basic <base64>`. The patterns used to let the whitespace run and the
 *     token claim the same characters, so a value that could not match was
 *     retried at every split (quadratic in its length). This is reachable by
 *     any caller that hands the middleware a header value directly. Over a
 *     real HTTP/1 socket Node's parser keeps line terminators out of header
 *     values and caps the header block at 16 KiB, which is why the proof
 *     drives the exported middleware rather than a socket.
 *
 *  2. The voice server (`neurolink serve voice`, the built CLI). Its page and
 *     static assets are served from disk, so the HTTP surface carries a
 *     per-client request budget. The suite proves the budget engages, that it
 *     can be configured, that an ordinary client never meets it, and that the
 *     loopback default, the bearer token and the body bound are unchanged.
 *     The child runs with no credentials, a throwaway HOME and its two
 *     outbound warm-up targets (the LLM base URL and the Cartesia WebSocket
 *     URL) pointed at a local stand-in that answers 500.
 *
 * Run: pnpm run build && pnpm run test:server-boundaries
 */

import "./helpers/credentialFreeEnv.js";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createAuthMiddleware } from "../dist/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { assert, assertEqual, defineSuite, delay } from "./helpers/harness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh({ entrypoints: ["dist/cli/index.js"] });

const { test, runSuite } = defineSuite("Server boundaries", {
  offline: true,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Built from code points: a literal U+2028 or U+00A0 in a tool-written file is
// easy to lose or to have normalised away.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

// ---------------------------------------------------------------------------
// 1. Authorization header parsing
// ---------------------------------------------------------------------------

type AuthKind = "bearer" | "basic";
type AuthProbe = {
  reached: boolean;
  seenToken: string | null;
  cpuMs: number;
};

// CPU time, not wall time: this machine class runs with a load average far
// above its core count, and a preempted process would turn a wall-clock bound
// into a coin flip. A quadratic scan burns CPU; waiting for a slot does not.
const cpuMilliseconds = (since: NodeJS.CpuUsage): number => {
  const spent = process.cpuUsage(since);
  return (spent.user + spent.system) / 1000;
};

const ORIGINAL_PATTERNS: Record<AuthKind, RegExp> = {
  bearer: /^Bearer\s+(.+)$/i,
  basic: /^Basic\s+(.+)$/i,
};

async function probeAuthHeader(
  type: AuthKind,
  header: string,
): Promise<AuthProbe> {
  let seenToken: string | null = null;
  let reached = false;
  const middleware = createAuthMiddleware({
    type,
    skipDevPlayground: false,
    validate: async (token) => {
      seenToken = token;
      return { id: "owned-user" };
    },
  });
  const headers: Record<string, string> = { authorization: header };
  const context = {
    headers,
    metadata: {},
    requestId: "owned-request",
  } as Parameters<typeof middleware.handler>[0];
  const started = process.cpuUsage();
  try {
    await middleware.handler(context, async () => {
      reached = true;
    });
  } catch {
    // Rejection is the expected outcome for a header that does not parse.
  }
  return { reached, seenToken, cpuMs: cpuMilliseconds(started) };
}

await test("valid Authorization headers still yield their credential", async () => {
  const accepted: Array<[AuthKind, string, string]> = [
    ["bearer", "Bearer abc.def-123", "abc.def-123"],
    ["bearer", "bearer   spaced-token", "spaced-token"],
    ["bearer", "BEARER\ttabbed-token", "tabbed-token"],
    ["bearer", `Bearer${NO_BREAK_SPACE}nbsp-token`, "nbsp-token"],
    ["bearer", "Bearer two words", "two words"],
    ["basic", "Basic dXNlcjpwYXNzd29yZA==", "dXNlcjpwYXNzd29yZA=="],
    ["basic", "bAsIc   dXNlcjpwYXNzd29yZA==", "dXNlcjpwYXNzd29yZA=="],
  ];
  for (const [type, header, token] of accepted) {
    const probe = await probeAuthHeader(type, header);
    assert(probe.reached, `${type} header ${JSON.stringify(header)} reached`);
    assertEqual(probe.seenToken, token, `${type} credential extracted`);
  }
  const rejected: Array<[AuthKind, string]> = [
    ["bearer", "Bearer"],
    ["bearer", "Bearer "],
    ["bearer", "Bearerabc"],
    ["bearer", "Basic abc"],
    ["bearer", `Bearer abc${LINE_SEPARATOR}def`],
    ["bearer", "Bearer abc\ndef"],
    ["basic", "Basic"],
    ["basic", "Bearer abc"],
    ["basic", `Basic abc${LINE_SEPARATOR}`],
  ];
  for (const [type, header] of rejected) {
    const probe = await probeAuthHeader(type, header);
    assert(!probe.reached, `${type} header ${JSON.stringify(header)} refused`);
    assertEqual(probe.seenToken, null, `${type} validator not consulted`);
  }
});

await test("extraction matches the original patterns on a generated corpus, except for whitespace-only credentials", async () => {
  const alphabet = [
    "B",
    "e",
    "a",
    "r",
    "x",
    " ",
    "\t",
    "\n",
    "\r",
    NO_BREAK_SPACE,
    LINE_SEPARATOR,
  ];
  const tails: string[] = [""];
  let frontier = [""];
  for (let length = 1; length <= 3; length++) {
    frontier = frontier.flatMap((stem) =>
      alphabet.map((symbol) => stem + symbol),
    );
    tails.push(...frontier);
  }
  let compared = 0;
  let whitespaceOnlyDifferences = 0;
  for (const type of ["bearer", "basic"] as const) {
    const scheme = type === "bearer" ? "Bearer" : "Basic";
    for (const prefix of [scheme, scheme.toLowerCase(), `${scheme} `]) {
      for (const tail of tails) {
        const header = prefix + tail;
        const original = ORIGINAL_PATTERNS[type].exec(header)?.[1] ?? null;
        const probe = await probeAuthHeader(type, header);
        compared++;
        if (probe.seenToken === original) {
          continue;
        }
        // The one intended difference: a credential made only of whitespace
        // (the old pattern backed one character out of the whitespace run to
        // satisfy `.+`) is no longer a credential.
        assert(
          original !== null && /^\s+$/.test(original) && !probe.reached,
          `parse differs for ${type} at corpus index ${compared}`,
        );
        whitespaceOnlyDifferences++;
      }
    }
  }
  assert(compared > 4000, "the corpus measured something");
  assert(whitespaceOnlyDifferences > 0, "the known difference was exercised");
});

await test("a header built to defeat backtracking is refused in linear time", async () => {
  const repeats = 40_000;
  for (const type of ["bearer", "basic"] as const) {
    const scheme = type === "bearer" ? "bearer" : "basic";
    const header = `${scheme}\t${"\t".repeat(repeats)}${LINE_SEPARATOR}`;

    // Precondition: this input really is slow for the original pattern, so a
    // fast result below means the pattern changed, not that the input is tame.
    const originalStarted = process.cpuUsage();
    assertEqual(ORIGINAL_PATTERNS[type].exec(header), null, "original misses");
    const originalMs = cpuMilliseconds(originalStarted);
    assert(
      originalMs > 200,
      `${type}: the adversarial header must be slow for the original pattern`,
    );

    const timings: number[] = [];
    for (let run = 0; run < 3; run++) {
      const probe = await probeAuthHeader(type, header);
      assert(!probe.reached, `${type}: adversarial header refused`);
      assertEqual(probe.seenToken, null, `${type}: validator not consulted`);
      timings.push(probe.cpuMs);
    }
    assert(
      Math.min(...timings) < 100,
      `${type}: refusing the adversarial header used too much CPU`,
    );
  }
});

// ---------------------------------------------------------------------------
// 2. Voice server: per-client request budget
// ---------------------------------------------------------------------------

type VoiceHandle = {
  port: number;
  output: () => string;
  stop: () => Promise<void>;
};

const standIns: Server[] = [];

async function listenOnFreePort(server: Server): Promise<number> {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (address === null || typeof address !== "object") {
    throw new Error("listener has no port");
  }
  return address.port;
}

async function reservePort(): Promise<number> {
  const reservation = createServer();
  const port = await listenOnFreePort(reservation);
  await new Promise<void>((done) => reservation.close(() => done()));
  return port;
}

async function startStandIn(): Promise<number> {
  const server = createServer((_request, response) => {
    response.writeHead(500);
    response.end();
  });
  standIns.push(server);
  return listenOnFreePort(server);
}

async function startVoiceServer(
  standInPort: number,
  extraEnv: Record<string, string> = {},
): Promise<VoiceHandle> {
  const port = await reservePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Startup only checks that the key is present; Cobra reads it when a
    // WebSocket client connects, and this suite never opens one.
    PICOVOICE_ACCESS_KEY: "owned-placeholder-never-presented",
    VOICE_LLM_PROVIDER: "openai",
    OPENAI_API_KEY: "owned-voice-key",
    OPENAI_BASE_URL: `http://127.0.0.1:${standInPort}/v1`,
    CARTESIA_WS_BASE_URL: `ws://127.0.0.1:${standInPort}/tts`,
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
    AWS_EC2_METADATA_DISABLED: "true",
    RECOVERY_PROOF_ALLOWED_PORTS: [port, standInPort].join(","),
    ...extraEnv,
  };
  const child: ChildProcess = spawn(
    process.execPath,
    ["dist/cli/index.js", "serve", "voice", "--port", String(port)],
    {
      cwd: REPO_ROOT,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let captured = "";
  let exited = false;
  child.stdout?.on("data", (chunk: Buffer) => {
    captured += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    captured += chunk.toString();
  });
  child.on("exit", () => {
    exited = true;
  });
  const stop = async (): Promise<void> => {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
    }
    for (let waited = 0; waited < 2_000 && !exited; waited += 100) {
      await delay(100);
    }
    if (!exited && child.pid !== undefined) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  };
  for (let attempt = 0; attempt < 480; attempt++) {
    if (exited) {
      throw new Error("voice server exited before it answered /health");
    }
    try {
      const probe = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (probe.status === 200) {
        return { port, output: () => captured, stop };
      }
    } catch {
      // Not listening yet.
    }
    await delay(250);
  }
  await stop();
  throw new Error("voice server did not answer /health in time");
}

const voiceFetch = (
  handle: VoiceHandle,
  route: string,
  init: RequestInit = {},
): Promise<Response> =>
  fetch(`http://127.0.0.1:${handle.port}${route}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
  });

const standInPort = await startStandIn();

try {
  await test("an ordinary client never meets the default budget", async () => {
    const voice = await startVoiceServer(standInPort);
    try {
      let previousRemaining = Number.POSITIVE_INFINITY;
      for (let request = 1; request <= 30; request++) {
        const response = await voiceFetch(voice, "/");
        assertEqual(response.status, 200, `page request ${request}`);
        if (request === 1) {
          assertEqual(
            response.headers.get("ratelimit-limit"),
            "300",
            "default budget is 300 per window",
          );
        }
        const remaining = Number(response.headers.get("ratelimit-remaining"));
        assert(remaining < previousRemaining, "each request spends budget");
        previousRemaining = remaining;
      }
      assertEqual(previousRemaining, 270, "30 requests spent 30 units");
    } finally {
      await voice.stop();
    }
  });

  await test("the budget engages at the configured size, spares /health and refuses with Retry-After", async () => {
    const voice = await startVoiceServer(standInPort, {
      VOICE_SERVER_RATE_LIMIT_MAX: "5",
      VOICE_SERVER_RATE_LIMIT_WINDOW_MS: "60000",
    });
    try {
      for (let request = 1; request <= 5; request++) {
        const response = await voiceFetch(voice, "/");
        assertEqual(response.status, 200, `request ${request} within budget`);
        assertEqual(response.headers.get("ratelimit-limit"), "5");
      }
      const refused = await voiceFetch(voice, "/");
      assertEqual(refused.status, 429, "sixth request is refused");
      assertEqual((await refused.json()).error, "Too many requests");
      assert(
        Number(refused.headers.get("retry-after")) > 0,
        "Retry-After says when to come back",
      );
      const asset = await voiceFetch(voice, "/index.html");
      assertEqual(asset.status, 429, "static assets share the budget");
      for (let probe = 0; probe < 3; probe++) {
        const health = await voiceFetch(voice, "/health");
        assertEqual(health.status, 200, "health probes are not limited");
      }
    } finally {
      await voice.stop();
    }
  });

  await test("an unusable budget setting falls back to the default", async () => {
    const voice = await startVoiceServer(standInPort, {
      VOICE_SERVER_RATE_LIMIT_MAX: "0",
      VOICE_SERVER_RATE_LIMIT_WINDOW_MS: "soon",
    });
    try {
      const response = await voiceFetch(voice, "/");
      assertEqual(response.status, 200);
      assertEqual(response.headers.get("ratelimit-limit"), "300");
    } finally {
      await voice.stop();
    }
  });

  await test("the bearer token still gates the page, and failed attempts spend the budget", async () => {
    const voice = await startVoiceServer(standInPort, {
      VOICE_SERVER_AUTH_TOKEN: "owned-token",
      VOICE_SERVER_RATE_LIMIT_MAX: "6",
    });
    try {
      const anonymous = await voiceFetch(voice, "/");
      assertEqual(anonymous.status, 401, "no credentials");
      const wrong = await voiceFetch(voice, "/", {
        headers: { authorization: "Bearer not-the-token" },
      });
      assertEqual(wrong.status, 401, "wrong credentials");
      const queryToken = await voiceFetch(voice, "/?token=owned-token");
      assertEqual(queryToken.status, 401, "query tokens stay rejected on HTTP");
      const right = await voiceFetch(voice, "/", {
        headers: { authorization: "Bearer owned-token" },
      });
      assertEqual(right.status, 200, "right credentials");
      const health = await voiceFetch(voice, "/health");
      assertEqual(health.status, 200, "health needs no credentials");
      for (let guess = 0; guess < 2; guess++) {
        const attempt = await voiceFetch(voice, "/", {
          headers: { authorization: `Bearer guess-${guess}` },
        });
        assertEqual(attempt.status, 401, "still within budget");
      }
      const locked = await voiceFetch(voice, "/", {
        headers: { authorization: "Bearer owned-token" },
      });
      assertEqual(locked.status, 429, "budget is spent before auth runs");
    } finally {
      await voice.stop();
    }
  });

  await test("loopback binding, the body bound and the header-size limit are unchanged", async () => {
    const voice = await startVoiceServer(standInPort);
    try {
      const external = Object.values(networkInterfaces())
        .flat()
        .find(
          (address) =>
            address !== undefined &&
            address.family === "IPv4" &&
            !address.internal,
        );
      const reachableOn = async (host: string, port: number) => {
        try {
          const response = await fetch(`http://${host}:${port}/health`, {
            signal: AbortSignal.timeout(3_000),
          });
          return response.status === 200;
        } catch {
          return false;
        }
      };
      if (external === undefined) {
        // No second interface to try, so this half of the control cannot run
        // here; the body and header halves below still do.
        log("no non-loopback IPv4 interface; skipping the bind control");
      } else {
        assert(
          !(await reachableOn(external.address, voice.port)),
          "the default bind must not listen off loopback",
        );
        // Positive control: the same probe does see a server that opted in to
        // a public bind, so the refusal above is the bind and not the probe.
        // A token keeps everything but /health closed while it is up.
        const open = await startVoiceServer(standInPort, {
          VOICE_SERVER_ALLOW_PUBLIC: "1",
          VOICE_SERVER_AUTH_TOKEN: "owned-token",
        });
        try {
          assert(
            await reachableOn(external.address, open.port),
            "an opted-in public bind is reachable on the external address",
          );
        } finally {
          await open.stop();
        }
      }

      const small = await voiceFetch(voice, "/no-such-route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pad: "x".repeat(50_000) }),
      });
      assertEqual(small.status, 404, "a 50 KB body parses and finds no route");
      const large = await voiceFetch(voice, "/no-such-route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pad: "x".repeat(200_000) }),
      });
      // The global error handler answers 500 for the parser's 413 today; either
      // is a refusal, and a 404 would mean the body was read and routed.
      assert(
        large.status === 413 || large.status === 500,
        "a 200 KB body is refused at 100 KB",
      );

      const oversizedHeader = await voiceFetch(voice, "/", {
        headers: { "x-padding": "x".repeat(20_000) },
      });
      assertEqual(oversizedHeader.status, 431, "HTTP parser header cap holds");
    } finally {
      await voice.stop();
    }
  });
} finally {
  await Promise.all(
    standIns.map(
      (server) => new Promise<void>((done) => server.close(() => done())),
    ),
  );
}

function log(message: string): void {
  console.log(`[server-boundaries] ${message}`);
}

await runSuite();
