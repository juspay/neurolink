#!/usr/bin/env tsx
/**
 * Continuous Test Suite — Security: proxy inbound trust (audit 2026-10, report B)
 *
 * One case per finding, each of which fails on the code before the fix:
 *
 * - inbound trust: a non-loopback bind is refused with nothing authenticating
 *       callers; an inbound token, once configured, is required on every door
 *       and on the operator surfaces (`/status`, `/accounts`).
 * - snapshot poisoning: a `system` block mentioning the Agent SDK from a
 *       plain client no longer writes `~/.neurolink/header-snapshots/`, a
 *       poisoned file left by an earlier release is sanitised on load, and the
 *       injected text never reaches the next client's upstream `system`.
 * - header passthrough: `x-neurolink-*` (the share token among them),
 *       trace context and CDN/forwarding identity never reach the upstream.
 * - borrower isolation: `GET /accounts` is 403 for a borrower, Codex
 *       responses carry no account label, 401/403 text names no label.
 * - fan-out: a Codex 400 costs exactly one upstream call across a pool;
 *       Claude rotation is capped at three accounts per request.
 * - PKCE: a pasted `code#state` whose state is not ours is rejected before
 *       anything is sent.
 * - token store: owner-only file and directory modes, a label with an
 *       emoji and a smart quote round-trips, a legacy-codec file still loads,
 *       and an unparseable file is quarantined instead of taking the pool down.
 * - the OAuth callback server ignores a redirect carrying a foreign state.
 * - Codex model discovery skips cooling accounts and forwards only
 *       `client_version`; every call reaches upstream (no stale limits).
 * - Codex reset-driven cooldowns are bounded like the Claude engine's.
 *
 * ## Isolation boundary
 *
 * HOME is a fresh temp directory before anything can resolve the operator's
 * real one; every token is fake; the upstream is a stubbed `globalThis.fetch`
 * that records what the proxy sent and answers from a script. Nothing here
 * reads or writes the installed proxy's state, contacts api.anthropic.com,
 * chatgpt.com or auth.openai.com, or needs a built `dist/`.
 *
 * ## Rule 15 determinism exception
 *
 * This file is on the `neurolink/e2e-tests-only` allow list. What the
 * exception buys is a scripted upstream: a 400 from chatgpt.com on demand, a
 * 500 from api.anthropic.com for every account in turn, a borrower whose grant
 * exists only in this HOME, a snapshot file planted with prompt text, and the
 * exact bytes the proxy put on the wire. No live call can produce any of those
 * on request, and the whole point of the findings is what does NOT reach the
 * wire. The proxy itself is the real one: `createProxyStartApp` from the CLI
 * builds the same Hono app `neurolink proxy start` serves, including the share
 * gate and the inbound-token check, and the bind-policy cases drive the CLI
 * entry point in a child process.
 *
 * ## Assertion-message hazard
 *
 * The harness downgrades a failure to SKIP when its message looks like a
 * provider error, so no assertion below interpolates a response payload —
 * only header names, counts and expected values.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-security-proxy.ts
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { networkInterfaces, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { MCPToolRegistry } from "../src/lib/mcp/toolRegistry.js";

// ---------------------------------------------------------------- isolation
const TEST_HOME = mkdtempSync(join(tmpdir(), "neurolink-security-proxy-"));
process.env.HOME = TEST_HOME;
process.env.USERPROFILE = TEST_HOME;
process.env.XDG_CONFIG_HOME = join(TEST_HOME, ".config");
process.env.NEUROLINK_PROXY_TEST_ISOLATED = "1";
process.env.NEUROLINK_PROXY_IGNORE_LAUNCHD = "1";
for (const name of [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
  "NEUROLINK_PROXY_INBOUND_TOKEN",
  "NEUROLINK_PROXY_REQUIRE_GRANT",
  "NEUROLINK_PROXY_ALLOW_UNAUTHENTICATED",
  "NEUROLINK_PROXY_MAX_ACCOUNTS_PER_REQUEST",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "ALL_PROXY",
  "SOCKS_PROXY",
  "https_proxy",
  "http_proxy",
  "all_proxy",
]) {
  delete process.env[name];
}

const { defineSuite, assert, assertEqual } =
  await import("./helpers/harness.js");

const { test, runSuite } = defineSuite("Security: proxy inbound trust", {
  offline: true,
  perTestTimeoutMs: 180_000,
});

// ------------------------------------------------------------ fake upstream
type UpstreamCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

const upstreamCalls: UpstreamCall[] = [];
const ANTHROPIC_MESSAGES = "https://api.anthropic.com/v1/messages";
const CODEX_RESPONSES = "https://chatgpt.com/backend-api/codex/responses";
const CODEX_MODELS = "https://chatgpt.com/backend-api/codex/models";

function anthropicOk(): Response {
  return new Response(
    JSON.stringify({
      id: `msg_${randomUUID()}`,
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5",
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function codexOk(): Response {
  const body =
    `event: response.created\ndata: ${JSON.stringify({
      type: "response.created",
      response: { id: "resp_1", status: "in_progress" },
    })}\n\n` +
    `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      response: {
        id: "resp_1",
        status: "completed",
        output: [],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      },
    })}\n\n`;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

let responder: (call: UpstreamCall) => Response = (call) => {
  if (call.url.startsWith(CODEX_RESPONSES)) {
    return codexOk();
  }
  if (call.url.startsWith(CODEX_MODELS)) {
    return new Response(JSON.stringify({ models: [{ slug: "gpt-5-codex" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return anthropicOk();
};

function headersToRecord(
  init: HeadersInit | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!init) {
    return out;
  }
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      out[key.toLowerCase()] = value;
    });
    return out;
  }
  if (Array.isArray(init)) {
    for (const [key, value] of init) {
      out[String(key).toLowerCase()] = String(value);
    }
    return out;
  }
  for (const [key, value] of Object.entries(init)) {
    out[key.toLowerCase()] = String(value);
  }
  return out;
}

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const call: UpstreamCall = {
    url,
    method: init?.method ?? "GET",
    headers: headersToRecord(init?.headers as HeadersInit | undefined),
    body: typeof init?.body === "string" ? init.body : "",
  };
  upstreamCalls.push(call);
  return responder(call);
}) as typeof fetch;

function callsTo(prefix: string): UpstreamCall[] {
  return upstreamCalls.filter((call) => call.url.startsWith(prefix));
}

// --------------------------------------------------------------- accounts
const ANTHROPIC_LABELS = [
  "alpha@example.com",
  "beta@example.com",
  "gamma@example.com",
] as const;
const CODEX_LABELS = ["codex-one", "codex-two", "codex-three"] as const;
const FAR_FUTURE = Date.now() + 30 * 24 * 3600 * 1000;

const base64Url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function codexAccessToken(accountId: string): string {
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      exp: Math.floor(FAR_FUTURE / 1000),
      jti: randomUUID(),
      "https://api.openai.com/auth": {
        chatgpt_account_id: accountId,
        chatgpt_plan_type: "plus",
      },
    }),
    "fake-signature",
  ].join(".");
}

const anthropicTokenByLabel = new Map<string, string>();

const { tokenStore, TokenStore } =
  await import("../src/lib/auth/tokenStore.js");
for (const label of ANTHROPIC_LABELS) {
  const token = `fake-oauth-${label.split("@")[0]}-${randomUUID()}`;
  anthropicTokenByLabel.set(label, token);
  await tokenStore.saveTokens(`anthropic:${label}`, {
    accessToken: token,
    refreshToken: `fake-refresh-${label}`,
    expiresAt: FAR_FUTURE,
    tokenType: "Bearer",
    scope: "user:inference",
  });
}
for (const [index, label] of CODEX_LABELS.entries()) {
  await tokenStore.saveTokens(`codex:${label}`, {
    accessToken: codexAccessToken(`acct-${index + 1}`),
    refreshToken: `fake-codex-refresh-${label}`,
    expiresAt: FAR_FUTURE,
    tokenType: "Bearer",
  });
}

function labelForBearer(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const token = authorization.replace(/^Bearer\s+/i, "");
  for (const [label, candidate] of anthropicTokenByLabel) {
    if (candidate === token) {
      return label;
    }
  }
  return undefined;
}

// --------------------------------------------------------------- the proxy
const stateDir = join(TEST_HOME, ".neurolink");
const snapshotDir = join(stateDir, "header-snapshots");

const { initShareGrants, createShareGrant } =
  await import("../src/lib/proxy/shareGrants.js");
const { initShareLedger } = await import("../src/lib/proxy/shareLedger.js");
initShareGrants(join(stateDir, "proxy-grants.json"));
initShareLedger(join(stateDir, "proxy-share-ledger.json"));
const { flushSnapshotWrites } =
  await import("../src/lib/proxy/snapshotPersistence.js");
const { markProxyReady } = await import("../src/lib/proxy/proxyHealth.js");
const { createProxyStartApp } = await import("../src/cli/commands/proxy.js");

type ProxyApp = Awaited<ReturnType<typeof createProxyStartApp>>["app"];

async function buildProxy(options: {
  inboundToken?: string;
}): Promise<ProxyApp> {
  const built = await createProxyStartApp({
    neurolink: {
      getToolRegistry: () => ({}) as unknown as MCPToolRegistry,
    },
    modelRouter: undefined,
    strategy: "fill-first",
    passthrough: false,
    port: 0,
    host: "127.0.0.1",
    proxyConfig: null,
    primaryAccountKey: undefined,
    accountAllowlist: undefined,
    ...(options.inboundToken ? { inboundToken: options.inboundToken } : {}),
    inboundAuthAcknowledged: true,
  });
  markProxyReady(built.readiness);
  return built.app;
}

type ProxyReply = {
  status: number;
  headers: Record<string, string>;
  text: string;
};

async function send(
  app: ProxyApp,
  method: string,
  path: string,
  options: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<ProxyReply> {
  const response = await app.fetch(
    new Request(`http://proxy.test${path}`, {
      method,
      headers: {
        ...(options.body !== undefined
          ? { "content-type": "application/json" }
          : {}),
        ...options.headers,
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    }),
  );
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return { status: response.status, headers, text: await response.text() };
}

function claudeBody(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    model: "claude-sonnet-4-5",
    max_tokens: 32,
    messages: [{ role: "user", content: "hello" }],
    ...extra,
  };
}

function codexBody(): Record<string, unknown> {
  return {
    model: "gpt-5-codex",
    instructions: "You are a coding agent.",
    input: [{ role: "user", content: [{ type: "input_text", text: "hi" }] }],
    stream: true,
    store: true,
    previous_response_id: "resp_shared_state",
    prompt_cache_key: "borrower-pin",
    metadata: { tenant: "borrower" },
    user: "borrower-user",
  };
}

const ATTACKER_DEVICE_ID = "a".repeat(64);
const attackerUserId = JSON.stringify({
  device_id: ATTACKER_DEVICE_ID,
  account_uuid: randomUUID(),
  session_id: randomUUID(),
});
const INJECTED = "SECRET-INJECTED-INSTRUCTION-7f3a";
const POISON = "POISONED-SNAPSHOT-TEXT-91bc";

function upstreamSystemTexts(call: UpstreamCall): string[] {
  const parsed = JSON.parse(call.body) as {
    system?: Array<{ text?: string }> | string;
  };
  if (typeof parsed.system === "string") {
    return [parsed.system];
  }
  return (parsed.system ?? []).map((block) => block.text ?? "");
}

function upstreamDeviceId(call: UpstreamCall): string | undefined {
  const parsed = JSON.parse(call.body) as {
    metadata?: { user_id?: string };
  };
  try {
    return (
      JSON.parse(parsed.metadata?.user_id ?? "{}") as {
        device_id?: string;
      }
    ).device_id;
  } catch {
    return undefined;
  }
}

function snapshotFiles(): string[] {
  return existsSync(snapshotDir) ? readdirSync(snapshotDir) : [];
}

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

const children: ChildProcess[] = [];

function spawnProxyCli(
  args: string[],
  env: Record<string, string>,
): {
  child: ChildProcess;
  output: () => string;
  exit: Promise<number | null>;
} {
  const child = spawn(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("src/cli/index.ts"),
      ...args,
    ],
    {
      cwd: mkdtempSync(join(tmpdir(), "neurolink-security-proxy-cwd-")),
      env: {
        ...process.env,
        ...env,
        HOME: TEST_HOME,
        USERPROFILE: TEST_HOME,
        NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        NEUROLINK_PROXY_SHARE_LISTENER: "0",
        NEUROLINK_PROXY_AUTO_UPDATE: "0",
        NEUROLINK_SKIP_MCP: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  children.push(child);
  let buffer = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
  });
  const exit = new Promise<number | null>((resolveExit) => {
    child.on("exit", (code) => resolveExit(code));
    child.on("error", () => resolveExit(null));
  });
  return { child, output: () => buffer, exit };
}

async function waitFor<T>(
  probe: () => Promise<T | undefined>,
  timeoutMs: number,
  intervalMs = 500,
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== undefined) {
      return value;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return undefined;
}

// ------------------------------------------------------------------ cases
let app: ProxyApp;
let borrowerToken = "";

await runSuite(async () => {
  app = await buildProxy({});
  const issued = await createShareGrant({
    peerLabel: "borrower-node",
    level: "live",
    entitlement: { ledger: "unlimited" },
    gates: {},
  });
  borrowerToken = issued.token;

  await test("a snapshot file carrying prompt text from an earlier release is sanitised and never replayed", async () => {
    mkdirSync(snapshotDir, { recursive: true });
    for (const label of ANTHROPIC_LABELS) {
      writeFileSync(
        join(snapshotDir, `anthropic_${label}.json`),
        JSON.stringify({
          accountKey: `anthropic:${label}`,
          capturedAt: new Date().toISOString(),
          source: "claude-code",
          headers: { "user-agent": "claude-cli/1.0.0" },
          body: {
            agentBlock: `You are a Claude agent, built on Anthropic's Claude Agent SDK. ${POISON}`,
            metadataUserId: attackerUserId,
          },
        }),
      );
    }
    upstreamCalls.length = 0;
    const reply = await send(app, "POST", "/v1/messages", {
      headers: { "user-agent": "curl/8.5" },
      body: claudeBody(),
    });
    assertEqual(reply.status, 200, "plain request must be served");
    const upstream = callsTo(ANTHROPIC_MESSAGES);
    assertEqual(upstream.length, 1, "exactly one upstream call expected");
    const systemTexts = upstreamSystemTexts(upstream[0]);
    assert(
      systemTexts.length > 0 &&
        systemTexts.every((text) => !text.includes(POISON)),
      "upstream system must not contain the planted snapshot text",
    );
    assert(
      upstreamDeviceId(upstream[0]) !== ATTACKER_DEVICE_ID,
      "upstream identity must not be the planted device id",
    );
    await flushSnapshotWrites();
    const served = labelForBearer(upstream[0].headers.authorization);
    assert(served !== undefined, "serving account must be a pooled account");
    const rewritten = readFileSync(
      join(snapshotDir, `anthropic_${served}.json`),
      "utf8",
    );
    assert(
      !rewritten.includes("agentBlock") && !rewritten.includes(POISON),
      "the served account's snapshot must be rewritten without prompt text",
    );
    for (const file of snapshotFiles()) {
      if (file !== `anthropic_${served}.json`) {
        // Untouched accounts keep their file until they serve; only the
        // served one is loaded, so only it is rewritten here.
        continue;
      }
    }
  });

  await test("a hostile system block from a plain client writes no snapshot and never reaches the next client", async () => {
    const before = new Map(
      snapshotFiles().map((file) => [
        file,
        readFileSync(join(snapshotDir, file), "utf8"),
      ]),
    );
    upstreamCalls.length = 0;
    const hostile = await send(app, "POST", "/v1/messages", {
      headers: { "user-agent": "python-requests/2.32" },
      body: claudeBody({
        system: [
          {
            type: "text",
            text: `You are a Claude agent, built on Anthropic's Claude Agent SDK. ${INJECTED}`,
          },
        ],
        metadata: { user_id: attackerUserId },
      }),
    });
    assertEqual(hostile.status, 200, "hostile request itself is served");
    assertEqual(
      callsTo(ANTHROPIC_MESSAGES).length,
      1,
      "exactly one upstream call for the hostile request",
    );
    assert(
      upstreamDeviceId(callsTo(ANTHROPIC_MESSAGES)[0]) !== ATTACKER_DEVICE_ID,
      "a plain client's metadata.user_id must not become the account identity",
    );
    await flushSnapshotWrites();
    const after = snapshotFiles();
    assertEqual(
      after.length,
      before.size,
      "snapshot directory must have the same number of files",
    );
    for (const file of after) {
      assertEqual(
        readFileSync(join(snapshotDir, file), "utf8"),
        before.get(file),
        `snapshot file must be byte-identical: ${file}`,
      );
      assert(
        !readFileSync(join(snapshotDir, file), "utf8").includes(INJECTED),
        "no snapshot may contain the injected text",
      );
    }

    upstreamCalls.length = 0;
    const victim = await send(app, "POST", "/v1/messages", {
      headers: { "user-agent": "curator/1.0" },
      body: claudeBody({ system: "You are a helpful assistant." }),
    });
    assertEqual(victim.status, 200, "next client is served");
    const upstream = callsTo(ANTHROPIC_MESSAGES);
    assertEqual(upstream.length, 1, "exactly one upstream call for the victim");
    const texts = upstreamSystemTexts(upstream[0]);
    assert(
      texts.every((text) => !text.includes(INJECTED)),
      "the next client's upstream system must not carry the injected text",
    );
    assert(
      texts.some((text) => text.includes("Claude Agent SDK")),
      "the compiled-in agent block is still sent",
    );
    assert(
      upstreamDeviceId(upstream[0]) !== ATTACKER_DEVICE_ID,
      "the next client must not present the attacker's device id",
    );
  });

  await test("a genuine Claude Code client captures an identity-only snapshot", async () => {
    const MARKER = "CC-PROMPT-MARKER-5d2e";
    upstreamCalls.length = 0;
    const reply = await send(app, "POST", "/v1/messages", {
      headers: {
        "user-agent": "claude-cli/2.1.0 (external, cli)",
        "x-claude-code-session-id": randomUUID(),
      },
      body: claudeBody({
        system: [
          {
            type: "text",
            text: "x-anthropic-billing-header: cc_version=2.1.0; cc_entrypoint=cli; cch=00000;",
          },
          {
            type: "text",
            text: `You are a Claude agent, built on Anthropic's Claude Agent SDK. ${MARKER}`,
          },
        ],
        metadata: { user_id: attackerUserId },
      }),
    });
    assertEqual(reply.status, 200, "Claude Code request is served");
    await flushSnapshotWrites();
    const served = labelForBearer(
      callsTo(ANTHROPIC_MESSAGES)[0]?.headers.authorization,
    );
    assert(served !== undefined, "serving account must be a pooled account");
    const file = join(snapshotDir, `anthropic_${served}.json`);
    assert(existsSync(file), "a genuine Claude Code client still captures");
    const text = readFileSync(file, "utf8");
    assert(!text.includes(MARKER), "snapshot must not hold the prompt text");
    assert(!text.includes("agentBlock"), "snapshot must have no agentBlock");
    const parsed = JSON.parse(text) as {
      body?: { metadataUserId?: string; sessionId?: string };
    };
    assert(
      typeof parsed.body?.metadataUserId === "string",
      "the identity tuple is what gets persisted",
    );
  });

  await test("proxy-internal, trace and forwarding headers never reach Anthropic", async () => {
    upstreamCalls.length = 0;
    const reply = await send(app, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        "x-neurolink-user-id": "operator",
        "x-neurolink-session-id": "sess-1",
        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        tracestate: "vendor=1",
        baggage: "k=v",
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "203.0.113.9",
        "x-real-ip": "203.0.113.9",
        via: "1.1 edge",
        forwarded: "for=203.0.113.9",
        cookie: "session=abc",
        "x-stainless-lang": "js",
        "anthropic-version": "2023-06-01",
      },
      body: claudeBody(),
    });
    assertEqual(reply.status, 200, "request is served");
    const upstream = callsTo(ANTHROPIC_MESSAGES);
    assertEqual(upstream.length, 1, "exactly one upstream call");
    const sent = upstream[0].headers;
    for (const name of [
      "x-neurolink-user-id",
      "x-neurolink-session-id",
      "tracestate",
      "baggage",
      "cf-connecting-ip",
      "x-forwarded-for",
      "x-real-ip",
      "via",
      "forwarded",
      "cookie",
    ]) {
      assert(!(name in sent), `header must not reach upstream: ${name}`);
    }
    // The proxy stamps its own trace context; the client's must not win.
    assert(
      sent.traceparent === undefined ||
        !sent.traceparent.includes("0af7651916cd43dd8448eb211c80319c"),
      "client traceparent must not be forwarded",
    );
    assert("x-stainless-lang" in sent, "protocol headers still travel");
    assertEqual(
      sent["anthropic-version"],
      "2023-06-01",
      "anthropic-version travels",
    );
    assert(
      (sent.authorization ?? "").startsWith("Bearer fake-oauth-"),
      "pooled credential replaces the client's",
    );
  });

  await test("a borrower's share token never reaches Anthropic", async () => {
    upstreamCalls.length = 0;
    const reply = await send(app, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        "x-neurolink-share-token": borrowerToken,
        "cf-connecting-ip": "198.51.100.7",
      },
      body: claudeBody(),
    });
    assertEqual(reply.status, 200, "borrowed request is served");
    const upstream = callsTo(ANTHROPIC_MESSAGES);
    assertEqual(upstream.length, 1, "exactly one upstream call");
    assert(
      !("x-neurolink-share-token" in upstream[0].headers),
      "the share token must not reach upstream",
    );
    assert(
      !("cf-connecting-ip" in upstream[0].headers),
      "the borrower's address must not reach upstream",
    );
    assert(
      !("x-neurolink-account" in reply.headers),
      "a borrowed Claude response carries no account label",
    );
    // Precondition for the redaction above: the operator's own request on the
    // same path does carry the label, so its absence is the gate's doing.
    const operator = await send(app, "POST", "/v1/messages", {
      headers: { "user-agent": "curl/8.5" },
      body: claudeBody(),
    });
    assertEqual(operator.status, 200, "operator request is served");
    assert(
      "x-neurolink-account" in operator.headers,
      "the operator's response names the serving account",
    );
  });

  await test("GET /accounts is refused for a borrower and served for the operator", async () => {
    const borrower = await send(app, "GET", "/accounts", {
      headers: { "x-neurolink-share-token": borrowerToken },
    });
    assertEqual(borrower.status, 403, "borrower must be refused");
    const refusal = JSON.parse(borrower.text) as {
      error?: { type?: string };
    };
    assertEqual(
      refusal.error?.type,
      "permission_error",
      "refusal is a permission error in the Anthropic shape",
    );
    for (const label of ANTHROPIC_LABELS) {
      assert(!borrower.text.includes(label), "refusal names no account");
    }
    const operator = await send(app, "GET", "/accounts");
    assertEqual(operator.status, 200, "operator still gets the inventory");
    const parsed = JSON.parse(operator.text) as { accounts?: unknown[] };
    assert(
      Array.isArray(parsed.accounts) && parsed.accounts.length >= 3,
      "operator inventory lists the pooled accounts",
    );
  });

  await test("a borrower's Codex response carries no account label and no account-side state", async () => {
    upstreamCalls.length = 0;
    const operator = await send(app, "POST", "/backend-api/codex/responses", {
      headers: { "user-agent": "codex_cli_rs/0.50.0" },
      body: codexBody(),
    });
    assertEqual(operator.status, 200, "operator Codex request is served");
    assert(
      operator.headers["x-neurolink-account"] !== undefined,
      "operator still sees which account served",
    );
    const operatorBody = JSON.parse(callsTo(CODEX_RESPONSES)[0].body) as Record<
      string,
      unknown
    >;
    assertEqual(
      operatorBody.previous_response_id,
      "resp_shared_state",
      "operator body is forwarded as sent",
    );

    upstreamCalls.length = 0;
    const borrower = await send(app, "POST", "/backend-api/codex/responses", {
      headers: {
        "user-agent": "codex_cli_rs/0.50.0",
        "x-neurolink-share-token": borrowerToken,
        traceparent: "00-11111111111111111111111111111111-2222222222222222-01",
      },
      body: codexBody(),
    });
    assertEqual(borrower.status, 200, "borrowed Codex request is served");
    assert(
      !("x-neurolink-account" in borrower.headers) &&
        !("x-neurolink-account-type" in borrower.headers),
      "borrowed Codex response must not name the account",
    );
    const upstream = callsTo(CODEX_RESPONSES);
    assertEqual(upstream.length, 1, "exactly one upstream call");
    assert(
      !("x-neurolink-share-token" in upstream[0].headers) &&
        !("traceparent" in upstream[0].headers),
      "share token and trace context must not reach chatgpt.com",
    );
    const body = JSON.parse(upstream[0].body) as Record<string, unknown>;
    for (const field of [
      "previous_response_id",
      "prompt_cache_key",
      "metadata",
      "user",
    ]) {
      assert(!(field in body), `borrowed body must drop ${field}`);
    }
    assertEqual(body.store, false, "borrowed body must not store");
    assertEqual(
      body.instructions,
      "You are a coding agent.",
      "the borrower's own instructions stay",
    );
  });

  await test("a Codex 400 ends the request after exactly one upstream call across three accounts", async () => {
    const previous = responder;
    responder = (call) =>
      call.url.startsWith(CODEX_RESPONSES)
        ? new Response(
            JSON.stringify({
              error: { type: "invalid_request_error", message: "bad model" },
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          )
        : previous(call);
    try {
      upstreamCalls.length = 0;
      const reply = await send(app, "POST", "/backend-api/codex/responses", {
        headers: { "user-agent": "codex_cli_rs/0.50.0" },
        body: { ...codexBody(), model: "no-such-model" },
      });
      assertEqual(reply.status, 400, "the upstream status is returned");
      assertEqual(
        callsTo(CODEX_RESPONSES).length,
        1,
        "a 400 must cost exactly one upstream call",
      );
    } finally {
      responder = previous;
    }
  });

  await test("Codex model discovery forwards only client_version, reaches upstream on every call and skips cooling accounts", async () => {
    upstreamCalls.length = 0;
    const first = await send(
      app,
      "GET",
      "/backend-api/codex/models?client_version=0.50.0&evil=1&x=2",
    );
    assertEqual(first.status, 200, "discovery is served");
    const second = await send(
      app,
      "GET",
      "/backend-api/codex/models?client_version=0.50.0&evil=1&x=2",
    );
    assertEqual(second.status, 200, "repeated discovery is served");
    const upstream = callsTo(CODEX_MODELS);
    // No response cache: the limits upstream reports are recorded per model
    // on every discovery, so a changed ceiling is never served stale.
    assertEqual(upstream.length, 2, "each discovery reaches upstream once");
    const url = new URL(upstream[0].url);
    assertEqual(
      url.searchParams.get("client_version"),
      "0.50.0",
      "client_version travels",
    );
    assert(
      !url.searchParams.has("evil") && !url.searchParams.has("x"),
      "other query keys are dropped",
    );

    const { saveAccountCooldown, initAccountCooldown } =
      await import("../src/lib/proxy/accountCooldown.js");
    initAccountCooldown(join(stateDir, "account-cooldowns.json"));
    const until = Date.now() + 60_000;
    for (const label of CODEX_LABELS) {
      await saveAccountCooldown(`codex:${label}`, until, "transient");
    }
    try {
      upstreamCalls.length = 0;
      const cooling = await send(
        app,
        "GET",
        "/backend-api/codex/models?client_version=0.51.0",
      );
      assertEqual(cooling.status, 503, "no healthy account means no discovery");
      assertEqual(
        callsTo(CODEX_MODELS).length,
        0,
        "cooling accounts are not probed",
      );
    } finally {
      const { clearAccountCooldown } =
        await import("../src/lib/proxy/accountCooldown.js");
      for (const label of CODEX_LABELS) {
        await clearAccountCooldown(`codex:${label}`, until);
      }
    }
  });

  await test("a far-future Codex reset cannot park an account for days", async () => {
    const { __testHooks } =
      await import("../src/lib/server/routes/codexProxyRoutes.js");
    const { MAX_COOLDOWN_MS_BY_REASON } =
      await import("../src/lib/proxy/routingEvidence.js");
    const now = Date.now();
    const yearAhead = Math.floor(now / 1000) + 365 * 24 * 3600;
    const plan = __testHooks.planCodexCooldown(
      {
        fallbackPercentage: 0,
        overageStatus: "unknown",
        lastUpdated: now,
        sessionUsed: 1,
        weeklyUsed: 1,
        sessionStatus: "allowed",
        weeklyStatus: "rejected",
        unifiedStatus: "allowed",
        sessionResetAt: 0,
        weeklyResetAt: yearAhead,
        fetchedAt: now,
        windows: [],
      } as Parameters<typeof __testHooks.planCodexCooldown>[0],
      0,
      now,
    );
    assertEqual(
      plan.reason,
      "weekly",
      "reset is still attributed to the window",
    );
    assert(
      plan.coolingUntil - now <= MAX_COOLDOWN_MS_BY_REASON.weekly,
      "weekly cooldown is bounded by what a week can mean",
    );
  });

  await test("an inbound token, once configured, is required on every door and operator surface", async () => {
    const gated = await buildProxy({ inboundToken: "inbound-placeholder" });
    upstreamCalls.length = 0;
    const anonymous = await send(gated, "POST", "/v1/messages", {
      headers: { "user-agent": "curl/8.5" },
      body: claudeBody(),
    });
    assertEqual(anonymous.status, 401, "no token must be refused");
    assertEqual(
      anonymous.headers["x-neurolink-inbound-auth"],
      "required",
      "refusal says a token is required",
    );
    assertEqual(
      callsTo(ANTHROPIC_MESSAGES).length,
      0,
      "nothing reached upstream",
    );

    const wrong = await send(gated, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        "x-neurolink-inbound-token": "wrong",
      },
      body: claudeBody(),
    });
    assertEqual(wrong.status, 401, "a wrong token must be refused");

    const codexAnonymous = await send(
      gated,
      "POST",
      "/backend-api/codex/responses",
      {
        body: codexBody(),
      },
    );
    assertEqual(codexAnonymous.status, 401, "the Codex door requires it too");

    const status = await send(gated, "GET", "/status");
    assertEqual(status.status, 401, "/status requires the token");
    const accounts = await send(gated, "GET", "/accounts");
    assertEqual(accounts.status, 401, "/accounts requires the token");
    const health = await send(gated, "GET", "/health");
    assertEqual(health.status, 200, "/health stays open for liveness");

    const viaHeader = await send(gated, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        "x-neurolink-inbound-token": "inbound-placeholder",
      },
      body: claudeBody(),
    });
    assertEqual(viaHeader.status, 200, "the dedicated header admits");
    const viaBearer = await send(gated, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        authorization: "Bearer inbound-placeholder",
      },
      body: claudeBody(),
    });
    assertEqual(viaBearer.status, 200, "Authorization: Bearer admits");
    assert(
      callsTo(ANTHROPIC_MESSAGES).every(
        (call) => !call.headers.authorization?.includes("inbound-placeholder"),
      ),
      "the inbound token itself never travels upstream",
    );
    const borrower = await send(gated, "POST", "/v1/messages", {
      headers: {
        "user-agent": "curl/8.5",
        "x-neurolink-share-token": borrowerToken,
      },
      body: claudeBody(),
    });
    assertEqual(
      borrower.status,
      200,
      "a share token is judged by the share gate",
    );
  });

  await test("the bind policy refuses a non-loopback host with nothing authenticating callers", async () => {
    const { evaluateProxyBindPolicy, isLoopbackHost } =
      await import("../src/lib/proxy/inboundAuth.js");
    for (const host of [
      "127.0.0.1",
      "localhost",
      "::1",
      "[::1]",
      "127.0.0.2",
    ]) {
      assert(isLoopbackHost(host), `loopback must be recognised: ${host}`);
    }
    for (const host of [
      "0.0.0.0",
      "::",
      "10.0.0.5",
      "192.168.1.2",
      "example.com",
    ]) {
      assert(!isLoopbackHost(host), `non-loopback must be recognised: ${host}`);
    }
    const open = evaluateProxyBindPolicy({
      host: "0.0.0.0",
      requireGrant: false,
      allowUnauthenticated: false,
    });
    assertEqual(open.allowed, false, "open bind must be refused");
    const withToken = evaluateProxyBindPolicy({
      host: "0.0.0.0",
      inboundToken: "t",
      requireGrant: false,
      allowUnauthenticated: false,
    });
    assertEqual(withToken.allowed, true, "an inbound token permits the bind");
    const withGate = evaluateProxyBindPolicy({
      host: "0.0.0.0",
      requireGrant: true,
      allowUnauthenticated: false,
    });
    assertEqual(withGate.allowed, true, "the share gate permits the bind");
    const acknowledged = evaluateProxyBindPolicy({
      host: "0.0.0.0",
      requireGrant: false,
      allowUnauthenticated: true,
    });
    assert(
      acknowledged.allowed && acknowledged.warning !== undefined,
      "an explicit acknowledgement permits the bind with a warning",
    );
  });

  await test("`proxy start --host 0.0.0.0` exits non-zero without a gate or token; loopback starts", async () => {
    const openPort = await freePort();
    const refused = spawnProxyCli(
      [
        "proxy",
        "start",
        "--host",
        "0.0.0.0",
        "--port",
        String(openPort),
        "--dev",
        "--quiet",
      ],
      {},
    );
    const code = await Promise.race([
      refused.exit,
      new Promise<null>((r) => setTimeout(() => r(null), 150_000)),
    ]);
    if (code === null) {
      refused.child.kill("SIGKILL");
    }
    assert(code !== null && code !== 0, "an open bind must exit non-zero");
    assert(
      refused.output().includes("Refusing to bind"),
      "the refusal names the bind policy",
    );

    const loopbackPort = await freePort();
    const started = spawnProxyCli(
      [
        "proxy",
        "start",
        "--host",
        "127.0.0.1",
        "--port",
        String(loopbackPort),
        "--dev",
        "--quiet",
      ],
      {},
    );
    try {
      const health = await waitFor(async () => {
        try {
          // The stubbed fetch is this process's; the child is reached over TCP.
          const { request } = await import("node:http");
          return await new Promise<number | undefined>((resolveStatus) => {
            const req = request(
              {
                host: "127.0.0.1",
                port: loopbackPort,
                path: "/health",
                method: "GET",
              },
              (res) => {
                res.resume();
                resolveStatus(res.statusCode);
              },
            );
            req.on("error", () => resolveStatus(undefined));
            req.end();
          });
        } catch {
          return undefined;
        }
      }, 120_000);
      assertEqual(health, 200, "a loopback bind must start and answer /health");
    } finally {
      started.child.kill("SIGTERM");
      await Promise.race([
        started.exit,
        new Promise<void>((r) => setTimeout(r, 10_000)),
      ]);
      started.child.kill("SIGKILL");
    }
  });

  await test("the token store is owner-only, round-trips non-Latin-1 labels, reads legacy files and quarantines garbage", async () => {
    const label = "anthropic:zoë-🚀-“quoted”";
    await tokenStore.saveTokens(label, {
      accessToken: "fake-🔑-token",
      refreshToken: "fake-refresh-“smart”",
      expiresAt: FAR_FUTURE,
      tokenType: "Bearer",
      scope: "disable-reason: “won’t” 🙂",
    });
    const back = await tokenStore.peekTokens(label);
    assertEqual(
      back?.accessToken,
      "fake-🔑-token",
      "emoji in a value round-trips",
    );
    assertEqual(
      back?.scope,
      "disable-reason: “won’t” 🙂",
      "smart quotes round-trip",
    );
    assert(
      (await tokenStore.listProviders()).includes(label),
      "emoji in a label round-trips",
    );
    const fileMode = statSync(tokenStore.getStoragePath()).mode & 0o777;
    assertEqual(fileMode, 0o600, "tokens.json must be 0600");
    const dirMode = statSync(stateDir).mode & 0o777;
    assertEqual(dirMode, 0o700, "~/.neurolink must be 0700");
    assert(
      readFileSync(tokenStore.getStoragePath(), "utf8").startsWith("nlts2:"),
      "the store is written with the UTF-8 codec",
    );
    await tokenStore.clearTokens(label);

    // A file written by the pre-UTF-8 codec must still load.
    const legacyDir = join(TEST_HOME, "legacy-store");
    mkdirSync(legacyDir, { recursive: true });
    const legacyPath = join(legacyDir, "tokens.json");
    const key = createHash("sha256")
      .update(`${TEST_HOME}-neurolink-token-store`)
      .digest("hex");
    const legacyDoc = JSON.stringify({
      version: "2.0",
      lastModified: Date.now(),
      providers: {
        "anthropic:legacy@example.com": {
          tokens: {
            accessToken: "legacy-token",
            expiresAt: FAR_FUTURE,
            tokenType: "Bearer",
          },
          createdAt: 1,
          lastAccessed: 1,
        },
      },
    });
    let xored = "";
    for (let i = 0; i < legacyDoc.length; i++) {
      xored += String.fromCharCode(
        legacyDoc.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    writeFileSync(legacyPath, Buffer.from(xored, "binary").toString("base64"));
    const legacyStore = new TokenStore({ customStoragePath: legacyPath });
    const legacy = await legacyStore.peekTokens("anthropic:legacy@example.com");
    assertEqual(
      legacy?.accessToken,
      "legacy-token",
      "a legacy-codec file still loads",
    );

    // Garbage is set aside, not thrown at every caller.
    const corruptDir = join(TEST_HOME, "corrupt-store");
    mkdirSync(corruptDir, { recursive: true });
    const corruptPath = join(corruptDir, "tokens.json");
    writeFileSync(corruptPath, "not a token store at all \u0000￿");
    const corruptStore = new TokenStore({ customStoragePath: corruptPath });
    assertEqual(
      (await corruptStore.listProviders()).length,
      0,
      "an unparseable store reads as empty",
    );
    assert(
      readdirSync(corruptDir).some((f) => f.startsWith("tokens.json.corrupt-")),
      "the unparseable file is quarantined under a dated name",
    );
    assert(
      !existsSync(corruptPath),
      "the quarantined file is no longer in place",
    );
  });

  await test("a pasted code whose state is not ours is rejected before any exchange", async () => {
    const { parsePastedAuthorizationCode, exchangePastedSubscriptionCode } =
      await import("../src/lib/auth/anthropicOAuth.js");
    const expectedState = "state-" + randomUUID();
    let threw = false;
    try {
      parsePastedAuthorizationCode(
        `code-abc#other-${randomUUID()}`,
        expectedState,
      );
    } catch {
      threw = true;
    }
    assert(threw, "a foreign state must be rejected");
    threw = false;
    try {
      parsePastedAuthorizationCode("code-abc", expectedState);
    } catch {
      threw = true;
    }
    assert(threw, "a missing state must be rejected");
    assertEqual(
      parsePastedAuthorizationCode(`code-abc#${expectedState}`, expectedState)
        .code,
      "code-abc",
      "our own state is accepted",
    );
    upstreamCalls.length = 0;
    let rejected = false;
    try {
      await exchangePastedSubscriptionCode({
        pasted: `code-abc#wrong-${randomUUID()}`,
        expectedState,
        codeVerifier: "verifier",
      });
    } catch {
      rejected = true;
    }
    assert(rejected, "the exchange helper must refuse a foreign state");
    assertEqual(
      upstreamCalls.filter((c) => c.url.includes("/oauth/token")).length,
      0,
      "nothing is sent to the token endpoint",
    );
  });

  await test("the OAuth callback server ignores a redirect carrying a foreign state", async () => {
    const { startCallbackServer } =
      await import("../src/lib/auth/anthropicOAuth.js");
    const { request } = await import("node:http");
    const port = await freePort();
    const expectedState = "cb-" + randomUUID();
    const pending = startCallbackServer(
      port,
      "/callback",
      30_000,
      expectedState,
    );
    let settled = false;
    void pending
      .then(() => {
        settled = true;
      })
      .catch(() => {
        settled = true;
      });
    const hit = (query: string): Promise<number | undefined> =>
      new Promise((resolveStatus) => {
        const req = request(
          {
            host: "127.0.0.1",
            port,
            path: `/callback?${query}`,
            method: "GET",
          },
          (res) => {
            res.resume();
            resolveStatus(res.statusCode);
          },
        );
        req.on("error", () => resolveStatus(undefined));
        req.end();
      });
    const foreign = await waitFor(
      () => hit(`code=evil&state=not-ours`),
      10_000,
    );
    assertEqual(foreign, 400, "a foreign state is answered with 400");
    await new Promise((r) => setTimeout(r, 200));
    assert(!settled, "the flow must still be waiting for the genuine redirect");

    const lanAddress = Object.values(networkInterfaces())
      .flat()
      .find(
        (entry) => entry && !entry.internal && entry.family === "IPv4",
      )?.address;
    if (lanAddress) {
      const offLoopback = await new Promise<number | undefined>(
        (resolveStatus) => {
          const req = request(
            {
              host: lanAddress,
              port,
              path: "/callback?code=x",
              method: "GET",
              timeout: 2_000,
            },
            (res) => {
              res.resume();
              resolveStatus(res.statusCode);
            },
          );
          req.on("error", () => resolveStatus(undefined));
          req.on("timeout", () => {
            req.destroy();
            resolveStatus(undefined);
          });
          req.end();
        },
      );
      assertEqual(
        offLoopback,
        undefined,
        "the callback server is not reachable off loopback",
      );
    }

    const genuine = await hit(`code=good-code&state=${expectedState}`);
    assertEqual(genuine, 200, "the genuine redirect is accepted");
    const result = await pending;
    assertEqual(
      result.code,
      "good-code",
      "the flow resolves with the genuine code",
    );
  });

  // Runs after every other Claude case: the 401 path disables the pooled
  // accounts it exhausts, and the 500 path cools them.
  await test("a borrower's 401 names no account label", async () => {
    const previous = responder;
    responder = (call) => {
      if (call.url.includes("/oauth/token")) {
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      if (call.url.startsWith(ANTHROPIC_MESSAGES)) {
        return new Response(
          JSON.stringify({
            type: "error",
            error: { type: "authentication_error", message: "invalid token" },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
      return previous(call);
    };
    try {
      upstreamCalls.length = 0;
      const borrower = await send(app, "POST", "/v1/messages", {
        headers: {
          "user-agent": "curl/8.5",
          "x-neurolink-share-token": borrowerToken,
        },
        body: claudeBody(),
      });
      assert(
        borrower.status === 401 ||
          borrower.status === 403 ||
          borrower.status === 503,
        "the borrower sees an auth-class failure",
      );
      assert(callsTo(ANTHROPIC_MESSAGES).length >= 1, "upstream was tried");
      for (const label of ANTHROPIC_LABELS) {
        assert(
          !borrower.text.includes(label) &&
            !borrower.text.includes(label.split("@")[0]),
          "borrower error text must not name a pooled account",
        );
      }
    } finally {
      responder = previous;
    }
  });

  await test("Claude fan-out is capped at three accounts per request", async () => {
    // Fresh, enabled accounts: the previous case disabled the original three.
    const extra = [
      "delta@example.com",
      "epsilon@example.com",
      "zeta@example.com",
      "eta@example.com",
      "theta@example.com",
    ];
    for (const label of extra) {
      const token = `fake-oauth-${label.split("@")[0]}-${randomUUID()}`;
      anthropicTokenByLabel.set(label, token);
      await tokenStore.saveTokens(`anthropic:${label}`, {
        accessToken: token,
        refreshToken: `fake-refresh-${label}`,
        expiresAt: FAR_FUTURE,
        tokenType: "Bearer",
      });
    }
    const previous = responder;
    responder = (call) =>
      call.url.startsWith(ANTHROPIC_MESSAGES)
        ? new Response(
            JSON.stringify({
              type: "error",
              error: { type: "api_error", message: "upstream exploded" },
            }),
            { status: 500, headers: { "content-type": "application/json" } },
          )
        : previous(call);
    try {
      upstreamCalls.length = 0;
      const reply = await send(app, "POST", "/v1/messages", {
        headers: { "user-agent": "curl/8.5" },
        body: claudeBody(),
      });
      assert(reply.status >= 500, "every tried account failed");
      const tried = new Set(
        callsTo(ANTHROPIC_MESSAGES).map((call) => call.headers.authorization),
      );
      assert(tried.size >= 1, "at least one account was tried");
      assert(tried.size <= 3, "no more than three accounts may be tried");
    } finally {
      responder = previous;
    }
  });
});

for (const child of children) {
  child.kill("SIGKILL");
}
