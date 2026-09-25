#!/usr/bin/env tsx
/** Determinism exception: exact provider policy/empty-output events and bounded
 * capture overflow require controlled streams and an isolated OTLP receiver.
 * Session-affinity binding through the real attempt loop needs a staged
 * per-account sequence (a 429 and its cooldown, a stream that fails before its
 * first chunk, a stream held open at an admission cap) that only a stubbed
 * Anthropic upstream can produce. A stubbed Vertex endpoint and a stubbed peer
 * serve the fallback legs that must leave a binding alone, and
 * `setForceBindRecheckThrowForTests` makes the post-serve binding re-check
 * throw, which no real request can be staged to do. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { build } from "esbuild";
import type {
  ServerContext,
  LoadedProxyConfig,
} from "../src/lib/types/index.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import { ProxyRuntimeConfigStore } from "../src/lib/proxy/runtimeConfig.js";
import { sessionAffinity } from "../src/lib/proxy/sessionAffinity.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { setVertexAccessTokenProviderForTests } from "../src/lib/proxy/vertexAnthropicFallback.js";
import { addPeer, removePeer } from "../src/lib/proxy/peerStore.js";
import * as logs from "../src/lib/proxy/requestLogger.js";
import * as otel from "../src/lib/proxy/otelLogSink.js";
import * as lifecycle from "../src/lib/proxy/proxyLifecycle.js";
import * as activity from "../src/lib/proxy/proxyActivity.js";
import { __bodyCaptureWorkerTestHooks } from "../src/lib/proxy/bodyCaptureWorker.js";
import { ProviderHealthChecker } from "../src/lib/utils/providerHealth.js";
import { trace, metrics, context, propagation } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";
for (const name of Object.keys(process.env)) {
  if (name.startsWith("OTEL_")) {
    delete process.env[name];
  }
}
class FixtureMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}
const metricReader = new FixtureMetricReader();
const meterProvider = new MeterProvider({ readers: [metricReader] });
metrics.setGlobalMeterProvider(meterProvider);
const spanExporter = new InMemorySpanExporter();
const tracerProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
trace.disable();
tracerProvider.register();
async function metricTotals(): Promise<Record<string, number>> {
  const collected = await metricReader.collect();
  const totals: Record<string, number> = {};
  for (const scope of collected.resourceMetrics.scopeMetrics) {
    for (const metric of scope.metrics) {
      if (metric.dataPointType !== 3) {
        continue;
      }
      totals[metric.descriptor.name] = metric.dataPoints.reduce(
        (total, point) => total + point.value,
        0,
      );
    }
  }
  return totals;
}
const received: Array<{ kind: string; body: Record<string, unknown> }> = [];
const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (b) => (raw += b));
  req.on("end", () => {
    const payload = JSON.parse(raw);
    for (const r of payload.resourceLogs ?? []) {
      for (const s of r.scopeLogs ?? []) {
        for (const l of s.logRecords ?? []) {
          const attrs = Object.fromEntries(
            (l.attributes ?? []).map(
              (a: {
                key: string;
                value: { stringValue?: string; intValue?: number };
              }) => [a.key, a.value.stringValue ?? a.value.intValue],
            ),
          );
          if (
            ["request_final", "attempt", "body_capture_index"].includes(
              String(attrs["proxy.record_kind"]),
            )
          ) {
            received.push({
              kind: String(attrs["proxy.record_kind"]),
              body: JSON.parse(l.body.stringValue),
            });
          }
        }
      }
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/v1/logs`;
const dir = mkdtempSync(join(tmpdir(), "proxy-parent-fixture-"));
const workerPath = join(dir, "bodyCaptureWorkerEntry.mjs");
await build({
  entryPoints: ["src/lib/proxy/bodyCaptureWorkerEntry.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: workerPath,
});
await __bodyCaptureWorkerTestHooks.reset(pathToFileURL(workerPath));
await tokenStore.saveTokens("codex:fixture@example.test", {
  accessToken: "isolated-fixture",
  tokenType: "Bearer",
  expiresAt: Date.now() + 3600000,
});
const configPath = join(dir, "fixture.json");
const config: LoadedProxyConfig = {
  routing: {
    fallbackChain: [
      { provider: "codex", model: "gpt-5.6-terra", reasoningEffort: "low" },
      { provider: "codex", model: "gpt-6-astra", reasoningEffort: "low" },
    ],
  },
};
writeFileSync(configPath, JSON.stringify(config));
const runtimeConfigStore = await ProxyRuntimeConfigStore.create({
  configPath,
  configRequired: true,
  baseEnv: {},
  passthrough: false,
});
logs.initRequestLogger(true);
const sse = (type: string, data: Record<string, unknown> = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const originalFetch = globalThis.fetch;
let wire = "";
let upstreamCalls = 0;
let sdkCalls = 0;
const originalAvailability =
  ProviderHealthChecker.checkFallbackProviderAvailability;
ProviderHealthChecker.checkFallbackProviderAvailability = async () => ({
  available: true,
});
const AFFINITY_ACCOUNT_A = "anthropic:affinity-a@example.test";
const AFFINITY_ACCOUNT_B = "anthropic:affinity-b@example.test";
const AFFINITY_TOKEN_A = "affinity-fixture-token-a";
const AFFINITY_TOKEN_B = "affinity-fixture-token-b";
type AffinityFixtureAccount = "a" | "b";
let anthropicUpstream: (
  account: AffinityFixtureAccount,
  stream: boolean,
) => Response | Promise<Response> = () => new Response("{}", { status: 404 });
const anthropicAttempts: AffinityFixtureAccount[] = [];
const AFFINITY_PEER_HOST = "peer.affinity-fixture.test";
let vertexCalls = 0;
let peerCalls = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === "aiplatform.googleapis.com") {
    vertexCalls++;
    return new Response(anthropicFrames().join(""), {
      headers: { "content-type": "text/event-stream" },
    });
  }
  if (url.hostname === AFFINITY_PEER_HOST && url.pathname === "/v1/messages") {
    peerCalls++;
    return new Response(anthropicFrames().join(""), {
      headers: { "content-type": "text/event-stream" },
    });
  }
  if (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses")) {
    upstreamCalls++;
    return new Response(wire, {
      headers: { "content-type": "text/event-stream" },
    });
  }
  if (
    url.hostname === "api.anthropic.com" &&
    url.pathname.endsWith("/messages")
  ) {
    const authorization = new Headers(init?.headers).get("authorization");
    const account: AffinityFixtureAccount | undefined =
      authorization === `Bearer ${AFFINITY_TOKEN_A}`
        ? "a"
        : authorization === `Bearer ${AFFINITY_TOKEN_B}`
          ? "b"
          : undefined;
    if (account) {
      anthropicAttempts.push(account);
      return anthropicUpstream(
        account,
        JSON.parse(String(init?.body)).stream === true,
      );
    }
  }
  if (url.hostname === "127.0.0.1" && url.port === String(address.port)) {
    return originalFetch(input, init);
  }
  return new Response("{}", { status: 404 });
};
const fixtureNeurolink: Pick<
  ServerContext["neurolink"],
  "getToolRegistry" | "stream"
> = {
  getToolRegistry: () =>
    ({}) as ReturnType<ServerContext["neurolink"]["getToolRegistry"]>,
  stream: async (options) => {
    sdkCalls++;
    assert.equal(options.provider, "openai");
    assert.equal(options.model, "gpt-4o");
    throw Object.assign(new Error("Fixture later SDK failure"), {
      status: 503,
      code: "sdk_fixture_failure",
      retryable: false,
    });
  },
};
const anthropicFrames = (): string[] => [
  sse("message_start", {
    message: {
      id: "affinity-fixture",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content: [],
      usage: { input_tokens: 1, output_tokens: 0 },
    },
  }),
  sse("content_block_delta", {
    index: 0,
    delta: { type: "text_delta", text: "ok" },
  }),
  sse("message_delta", {
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 1 },
  }),
  sse("message_stop"),
];
const anthropicServes = (stream: boolean): Response =>
  stream
    ? new Response(anthropicFrames().join(""), {
        headers: { "content-type": "text/event-stream" },
      })
    : new Response(
        JSON.stringify({
          id: "affinity-fixture",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { headers: { "content-type": "application/json" } },
      );
const anthropicRateLimited = (): Response =>
  new Response(
    JSON.stringify({
      type: "error",
      error: { type: "rate_limit_error", message: "Fixture rate limit" },
    }),
    {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "1" },
    },
  );
const anthropicEmptyStream = (): Response =>
  new Response("", { headers: { "content-type": "text/event-stream" } });
const anthropicResetBeforeFirstChunk = (): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new TypeError("fixture reset before first chunk"));
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
/** Frames wait for `release`; with `firstFrameAtOnce` the first goes out now. */
const anthropicHeldStream = (
  release: Promise<void>,
  firstFrameAtOnce: boolean,
): Response => {
  const encoder = new TextEncoder();
  const frames = anthropicFrames();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        if (firstFrameAtOnce) {
          controller.enqueue(encoder.encode(frames[0]));
        }
        void release.then(() => {
          for (const frame of firstFrameAtOnce ? frames.slice(1) : frames) {
            controller.enqueue(encoder.encode(frame));
          }
          controller.close();
        });
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
};
const AFFINITY_IDLE_TTL_MS = 3_600_000;
const boundAccountOf = (sessionId: string): string | undefined =>
  sessionAffinity.get(sessionId, Date.now(), AFFINITY_IDLE_TTL_MS);
type FixtureProxyApp = Awaited<ReturnType<typeof createProxyStartApp>>["app"];
const sendAffinityRequest = (
  app: FixtureProxyApp,
  sessionId: string,
  stream: boolean,
): Promise<Response> =>
  Promise.resolve(
    app.request("http://localhost/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        stream,
        max_tokens: 16,
        metadata: {
          user_id: JSON.stringify({
            device_id: "d".repeat(64),
            account_uuid: "6f1c1a52-0b3e-4c43-9a55-3b0e4d6b7a10",
            session_id: sessionId,
          }),
        },
        messages: [{ role: "user", content: "affinity fixture" }],
      }),
    }),
  );
const loadAffinityConfig = async (
  routing: Record<string, unknown> = {},
): Promise<void> => {
  writeFileSync(
    configPath,
    JSON.stringify({
      routing: {
        strategy: "fill-first",
        "session-affinity": true,
        fallbackChain: [
          { provider: "codex", model: "gpt-5.6-terra", reasoningEffort: "low" },
        ],
        ...routing,
      },
    }),
  );
  const result = await runtimeConfigStore.reload();
  assert.equal(result.applied, true, "affinity fixture config was rejected");
};
const waitForProxyIdle = async (): Promise<void> => {
  const end = Date.now() + 3000;
  while (
    activity.getProxyActivitySnapshot().activeRequests &&
    Date.now() < end
  ) {
    await delay(5);
  }
};
/** Waits out a real cooldown rather than clearing it through a test hook. */
const waitForCooldownExpiry = async (accountKey: string): Promise<void> => {
  const coolingUntil =
    __testHooks.getAccountRuntimeState(accountKey)?.coolingUntil;
  assert.ok(
    coolingUntil !== undefined && coolingUntil > Date.now(),
    "precondition: the 429 must have put the account into cooldown",
  );
  assert.ok(
    coolingUntil - Date.now() < 30_000,
    "precondition: the fixture 429 should plan a short transient cooldown",
  );
  while (Date.now() <= coolingUntil) {
    await delay(coolingUntil - Date.now() + 10);
  }
};
async function runSessionAffinityRouteCases(
  app: FixtureProxyApp,
): Promise<void> {
  await tokenStore.saveTokens(AFFINITY_ACCOUNT_A, {
    accessToken: AFFINITY_TOKEN_A,
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600000,
  });
  await tokenStore.saveTokens(AFFINITY_ACCOUNT_B, {
    accessToken: AFFINITY_TOKEN_B,
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600000,
  });
  await loadAffinityConfig();
  sessionAffinity.clear();
  anthropicUpstream = (_account, stream) => anthropicServes(stream);

  const session = randomUUID();
  anthropicAttempts.length = 0;
  let response = await sendAffinityRequest(app, session, false);
  await response.text();
  assert.equal(response.status, 200, "bind: the request was not served");
  assert.deepEqual(anthropicAttempts, ["a"], "bind: a should serve first");
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_A,
    "bind: the session was not bound to the account that served it",
  );
  console.log("PASS affinity binds the session to the serving account");

  // B holds its answer until A's real cooldown has expired, so when the
  // session is bound A is eligible again. A was tried and failed in this very
  // request, so the binding must still go to B, which served it.
  let cooldownWait: Promise<void> | undefined;
  anthropicUpstream = (account, stream) => {
    if (account === "a") {
      return anthropicRateLimited();
    }
    cooldownWait = waitForCooldownExpiry(AFFINITY_ACCOUNT_A);
    return cooldownWait.then(
      () => anthropicServes(stream),
      () => anthropicServes(stream),
    );
  };
  anthropicAttempts.length = 0;
  response = await sendAffinityRequest(app, session, false);
  await response.text();
  assert.ok(cooldownWait, "429 move: precondition, b was never asked to serve");
  await cooldownWait;
  assert.equal(response.status, 200, "429 move: b did not serve");
  assert.equal(anthropicAttempts.at(-1), "b", "429 move: b should serve last");
  assert.ok(anthropicAttempts.includes("a"), "429 move: a was never tried");
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_B,
    "429 move: the session did not move to the account that served it",
  );
  anthropicUpstream = (_account, stream) => anthropicServes(stream);
  anthropicAttempts.length = 0;
  response = await sendAffinityRequest(app, session, false);
  await response.text();
  assert.deepEqual(
    anthropicAttempts,
    ["b"],
    "429 move: the session returned to a after its cooldown expired",
  );
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_B,
    "429 move: the binding left b after a recovered",
  );
  anthropicAttempts.length = 0;
  response = await sendAffinityRequest(app, randomUUID(), false);
  await response.text();
  assert.deepEqual(
    anthropicAttempts,
    ["a"],
    "429 move control: an unbound session should reach the recovered a first",
  );
  console.log(
    "PASS affinity binds b, not the failed a, even after a recovers mid-request",
  );

  anthropicUpstream = () => anthropicEmptyStream();
  wire =
    sse("response.output_text.delta", { delta: "fixture fallback text" }) +
    sse("response.completed", {
      response: { model: "gpt-5.6-terra", status: "completed" },
    });
  upstreamCalls = 0;
  anthropicAttempts.length = 0;
  response = await sendAffinityRequest(app, session, true);
  await response.text();
  await waitForProxyIdle();
  assert.equal(response.status, 200, "fallback: the request was not served");
  assert.deepEqual(
    anthropicAttempts,
    ["b", "a"],
    "fallback: both Anthropic accounts should fail before the fallback",
  );
  assert.equal(upstreamCalls, 1, "fallback: Codex did not serve");
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_B,
    "fallback: a Codex-served response changed the binding",
  );
  console.log("PASS affinity leaves the binding when a fallback serves");

  // The Vertex leg and a peer borrow also serve outside the Anthropic account
  // loop, so neither may move the binding off b either.
  const previousProject = process.env.GOOGLE_CLOUD_PROJECT;
  const previousLocation = process.env.GOOGLE_CLOUD_LOCATION;
  process.env.GOOGLE_CLOUD_PROJECT = "affinity-fixture-project";
  process.env.GOOGLE_CLOUD_LOCATION = "global";
  setVertexAccessTokenProviderForTests(async () => "affinity-fixture-token");
  try {
    await loadAffinityConfig({
      fallbackChain: [{ provider: "vertex", model: "claude-opus-5-5" }],
    });
    vertexCalls = 0;
    upstreamCalls = 0;
    anthropicAttempts.length = 0;
    response = await sendAffinityRequest(app, session, true);
    await response.text();
    await waitForProxyIdle();
  } finally {
    setVertexAccessTokenProviderForTests(undefined);
    if (previousProject === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = previousProject;
    }
    if (previousLocation === undefined) {
      delete process.env.GOOGLE_CLOUD_LOCATION;
    } else {
      process.env.GOOGLE_CLOUD_LOCATION = previousLocation;
    }
    await loadAffinityConfig();
  }
  assert.equal(response.status, 200, "vertex: the request was not served");
  assert.deepEqual(
    anthropicAttempts,
    ["b", "a"],
    "vertex: both Anthropic accounts should fail before the fallback",
  );
  assert.equal(vertexCalls, 1, "vertex: the Vertex fallback did not serve");
  assert.equal(upstreamCalls, 0, "vertex: Codex ran although Vertex served");
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_B,
    "vertex: a Vertex-served response changed the binding",
  );
  console.log(
    "PASS affinity leaves the binding when the Vertex fallback serves",
  );

  await addPeer({
    name: "affinity-peer",
    url: `https://${AFFINITY_PEER_HOST}`,
    token: "affinity-fixture-peer-token",
  });
  try {
    peerCalls = 0;
    upstreamCalls = 0;
    anthropicAttempts.length = 0;
    response = await sendAffinityRequest(app, session, true);
    await response.text();
    await waitForProxyIdle();
  } finally {
    await removePeer("affinity-peer");
  }
  assert.equal(response.status, 200, "peer: the request was not served");
  assert.deepEqual(
    anthropicAttempts,
    ["b", "a"],
    "peer: both Anthropic accounts should fail before the borrow",
  );
  assert.equal(peerCalls, 1, "peer: the peer did not serve");
  assert.equal(upstreamCalls, 0, "peer: Codex ran although the peer served");
  assert.equal(
    boundAccountOf(session),
    AFFINITY_ACCOUNT_B,
    "peer: a peer-served response changed the binding",
  );
  console.log("PASS affinity leaves the binding when a peer serves");

  const failedSession = randomUUID();
  anthropicUpstream = () => anthropicResetBeforeFirstChunk();
  anthropicAttempts.length = 0;
  response = await sendAffinityRequest(app, failedSession, true);
  await response.text();
  await waitForProxyIdle();
  assert.equal(response.status, 502, "pre-chunk: expected a terminal 502");
  assert.deepEqual(anthropicAttempts, ["a"], "pre-chunk: a should be tried");
  assert.equal(
    boundAccountOf(failedSession),
    undefined,
    "pre-chunk: a stream that failed before its first chunk bound the session",
  );
  console.log("PASS affinity does not bind on a pre-first-chunk 502");

  await loadAffinityConfig({ "max-inflight-per-account": 1 });
  const cappedSession = randomUUID();
  let releaseHeld: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    releaseHeld = resolve;
  });
  anthropicUpstream = (account, stream) =>
    account === "a" && stream
      ? anthropicHeldStream(held, true)
      : anthropicServes(stream);
  anthropicAttempts.length = 0;
  const heldResponse = await sendAffinityRequest(app, cappedSession, true);
  try {
    assert.equal(heldResponse.status, 200, "overflow: a did not serve");
    assert.equal(
      boundAccountOf(cappedSession),
      AFFINITY_ACCOUNT_A,
      "overflow: precondition, the held stream should bind the session to a",
    );
    response = await sendAffinityRequest(app, cappedSession, false);
    await response.text();
  } finally {
    releaseHeld();
    await heldResponse.text();
    await waitForProxyIdle();
  }
  assert.equal(response.status, 200, "overflow: the second request failed");
  assert.deepEqual(
    anthropicAttempts,
    ["a", "b"],
    "overflow: b should serve while a is at its admission cap",
  );
  assert.equal(
    boundAccountOf(cappedSession),
    AFFINITY_ACCOUNT_A,
    "overflow: serving an admission-cap overflow moved the binding",
  );
  console.log("PASS affinity keeps the binding across an admission overflow");

  // An idle-expired binding cannot be produced through the route without
  // waiting out the 60s minimum TTL, so one is planted directly.
  await loadAffinityConfig();
  sessionAffinity.clear();
  anthropicUpstream = (_account, stream) => anthropicServes(stream);
  response = await sendAffinityRequest(app, randomUUID(), false);
  await response.text();
  sessionAffinity.bind(
    randomUUID(),
    AFFINITY_ACCOUNT_B,
    Date.now() - 2 * AFFINITY_IDLE_TTL_MS,
  );
  const status = await (await app.request("http://localhost/status")).json();
  assert.equal(
    status.boundSessions,
    1,
    "status: boundSessions should count only bindings inside the idle TTL",
  );
  console.log("PASS affinity status counts only active bindings");

  const disabledSession = randomUUID();
  response = await sendAffinityRequest(app, disabledSession, false);
  await response.text();
  assert.equal(
    boundAccountOf(disabledSession),
    AFFINITY_ACCOUNT_A,
    "disable: precondition, the session should be bound before the reload",
  );
  await loadAffinityConfig({ "session-affinity": false });
  assert.equal(
    sessionAffinity.size(),
    0,
    "disable: turning session affinity off left bindings in place",
  );
  console.log("PASS affinity reload to disabled clears bindings");

  // A request routed while affinity was on can finish after a disable reload
  // and bind past that clear; re-enabling must still start empty.
  await loadAffinityConfig();
  const raceSession = randomUUID();
  let releaseRace: () => void = () => undefined;
  const raceGate = new Promise<void>((resolve) => {
    releaseRace = resolve;
  });
  anthropicUpstream = () => anthropicHeldStream(raceGate, false);
  anthropicAttempts.length = 0;
  const racing = sendAffinityRequest(app, raceSession, true);
  try {
    const fetchDeadline = Date.now() + 5000;
    while (anthropicAttempts.length === 0 && Date.now() < fetchDeadline) {
      await delay(5);
    }
    assert.equal(
      anthropicAttempts.length,
      1,
      "enable: precondition, the request should reach a before the reload",
    );
    await loadAffinityConfig({ "session-affinity": false });
  } finally {
    releaseRace();
    await (await racing).text();
    await waitForProxyIdle();
  }
  assert.equal(
    boundAccountOf(raceSession),
    AFFINITY_ACCOUNT_A,
    "enable: precondition, the in-flight request should bind after the disable",
  );
  await loadAffinityConfig();
  assert.equal(
    boundAccountOf(raceSession),
    undefined,
    "enable: turning session affinity on kept a binding made while it was off",
  );
  console.log("PASS affinity reload to enabled starts from an empty store");

  // Only fill-first over more than one account ever reads a binding, so no
  // other request may record one.
  anthropicUpstream = (_account, stream) => anthropicServes(stream);
  for (const [label, routing] of [
    ["round-robin", { strategy: "round-robin" }],
    ["single account", { "account-allowlist": [AFFINITY_ACCOUNT_A] }],
  ] as const) {
    await loadAffinityConfig(routing);
    const unreadSession = randomUUID();
    anthropicAttempts.length = 0;
    response = await sendAffinityRequest(app, unreadSession, false);
    await response.text();
    assert.equal(response.status, 200, `${label}: the request was not served`);
    assert.equal(anthropicAttempts.length, 1, `${label}: expected one attempt`);
    assert.equal(
      boundAccountOf(unreadSession),
      undefined,
      `${label}: a binding was recorded that this routing never reads`,
    );
  }
  console.log("PASS affinity binds only where the binding is read");

  // The preceding loop left routing on round-robin/single-account; restore
  // fill-first with both accounts so bindSessionAfterServe runs again.
  await loadAffinityConfig();
  const guardSession = randomUUID();
  anthropicUpstream = (_account, stream) => anthropicServes(stream);
  anthropicAttempts.length = 0;
  // Only the post-serve re-check throws, so the request is routed, admitted
  // and served before the binding step fails. Its log line is the evidence
  // that the re-check threw at all.
  let bindRecheckErrorLogs = 0;
  const originalConsoleLog = console.log;
  console.log = (...args: unknown[]): void => {
    if (
      String(args[0]).startsWith(
        "[proxy] routing policy threw; falling back to serving-account binding",
      )
    ) {
      bindRecheckErrorLogs += 1;
    }
    originalConsoleLog(...args);
  };
  __testHooks.setForceBindRecheckThrowForTests(true);
  let guardResponse: Response;
  try {
    guardResponse = await sendAffinityRequest(app, guardSession, true);
    await guardResponse.text();
    await waitForProxyIdle();
  } finally {
    __testHooks.setForceBindRecheckThrowForTests(false);
    console.log = originalConsoleLog;
  }
  assert.deepEqual(
    anthropicAttempts,
    ["a"],
    "bind guard: precondition, a should have served the request",
  );
  assert.equal(
    bindRecheckErrorLogs,
    1,
    "bind guard: precondition, the bind-time re-check should have thrown once",
  );
  assert.equal(
    guardResponse.status,
    200,
    "bind guard: a bind-time routing throw must not drop the already-served response",
  );
  assert.equal(
    boundAccountOf(guardSession),
    AFFINITY_ACCOUNT_A,
    "bind guard: a bind-time routing throw must still fall back to binding the serving account",
  );
  assert.equal(
    __testHooks.getAccountInflight(AFFINITY_ACCOUNT_A),
    0,
    "bind guard: a bind-time routing throw must not strand the admission lease",
  );
  console.log(
    "PASS affinity bind-time routing throw keeps the served response",
  );
}
try {
  const { app } = await createProxyStartApp({
    runtimeConfigStore,
    neurolink: fixtureNeurolink,
    modelRouter: undefined,
    strategy: "fill-first",
    passthrough: false,
    port: 0,
    host: "127.0.0.1",
    proxyConfig: config,
    primaryAccountKey: undefined,
    accountAllowlist: new Set(["codex:fixture@example.test"]),
  });
  for (const scenario of ["policy", "empty", "truncated"] as const) {
    received.length = 0;
    upstreamCalls = 0;
    const usage = {
      input_tokens: 101,
      input_tokens_details: { cached_tokens: 41 },
      output_tokens: 13,
      output_tokens_details: { reasoning_tokens: 11 },
    };
    wire =
      scenario === "policy"
        ? sse("response.failed", {
            response: {
              model: "gpt-5.6-terra",
              status: "failed",
              error: {
                code: "cyber_policy",
                message: "Fixture provider policy denied this request",
              },
            },
          })
        : scenario === "empty"
          ? sse("response.completed", {
              response: {
                model: "gpt-5.6-terra",
                status: "completed",
                output: [],
                usage,
              },
            })
          : sse("response.output_text.delta", {
              delta: "fixture text. ".repeat(100000),
            }) +
            sse("response.completed", {
              response: { model: "gpt-5.6-terra", status: "completed", usage },
            });
    const response = await app.request("http://localhost/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        stream: true,
        max_tokens: 128,
        messages: [{ role: "user", content: "fixture" }],
      }),
    });
    const clientText = await response.text();
    const end = Date.now() + 3000;
    while (
      activity.getProxyActivitySnapshot().activeRequests &&
      Date.now() < end
    ) {
      await delay(5);
    }
    await logs.flushRequestLogs();
    await lifecycle.flushProxyLifecycleEvents();
    await otel.flushProxyOtelLogs();
    const finals = received
      .filter((x) => x.kind === "request_final")
      .map((x) => x.body);
    assert.equal(finals.length, 1, `${scenario}: one parent final`);
    const final = finals[0];
    assert.equal(
      upstreamCalls,
      1,
      `${scenario}: no replay onto the next configured model`,
    );
    if (scenario === "policy") {
      assert.equal(final.responseStatus, 403);
      assert.equal(final.errorCode, "cyber_policy");
      assert.equal(final.retryable, false);
      assert.equal(final.model, "gpt-5.6-terra");
      assert.equal(final.accountType, "codex-oauth");
      assert.match(clientText, /cyber_policy|policy denied/);
    } else if (scenario === "empty") {
      assert.equal(final.responseStatus, 502);
      assert.equal(final.errorCode, "empty_response");
      assert.equal(final.inputTokens, 60);
      assert.equal(final.cacheReadTokens, 41);
      assert.equal(final.outputTokens, 13);
      assert.equal(final.reasoningTokens, 11);
    } else {
      assert.equal(final.responseStatus, 200);
      assert.ok(Buffer.byteLength(clientText) > 1024 * 1024);
      const index = received.find(
        (x) =>
          x.kind === "body_capture_index" &&
          x.body.requestId === final.requestId &&
          x.body.phase === "client_response",
      );
      assert.ok(index, "parent client response capture exists");
      assert.equal(index.body.bodyTruncated, true);
    }
    console.log(
      `PASS parent ${scenario}: status=${final.responseStatus}, upstreamCalls=${upstreamCalls}`,
    );
  }
  for (const mixed of [false, true]) {
    const metricsBefore = await metricTotals();
    const fallbackChain = [
      { provider: "codex", model: "gpt-5.6-terra", reasoningEffort: "low" },
      ...(mixed ? [{ provider: "openai", model: "gpt-4o" }] : []),
    ];
    writeFileSync(configPath, JSON.stringify({ routing: { fallbackChain } }));
    await runtimeConfigStore.reload();
    received.length = 0;
    upstreamCalls = 0;
    sdkCalls = 0;
    wire = sse("response.failed", {
      response: {
        model: "gpt-5.6-terra",
        status: "failed",
        error: {
          code: "fixture_codex_retryable",
          message: "Fixture Codex attempt failed after observed usage",
          retryable: true,
        },
        usage: {
          input_tokens: 101,
          input_tokens_details: { cached_tokens: 41 },
          output_tokens: 13,
          output_tokens_details: { reasoning_tokens: 11 },
        },
      },
    });
    const response = await app.request("http://localhost/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        stream: false,
        max_tokens: 128,
        messages: [{ role: "user", content: "mixed attribution fixture" }],
      }),
    });
    const body = await response.json();
    const end = Date.now() + 3000;
    while (
      activity.getProxyActivitySnapshot().activeRequests &&
      Date.now() < end
    ) {
      await delay(5);
    }
    await logs.flushRequestLogs();
    await lifecycle.flushProxyLifecycleEvents();
    await otel.flushProxyOtelLogs();
    await tracerProvider.forceFlush();
    const finals = received
      .filter((row) => row.kind === "request_final")
      .map((row) => row.body);
    assert.equal(
      finals.length,
      1,
      "one client final across the fallback chain",
    );
    const final = finals[0];
    const parentSpans = spanExporter
      .getFinishedSpans()
      .filter(
        (span) =>
          span.name === "proxy.request" &&
          span.attributes["proxy.request_id"] === final.requestId,
      );
    assert.equal(
      parentSpans.length,
      1,
      "exactly one finished parent request span",
    );
    const parentSpan = parentSpans[0];
    assert.equal(upstreamCalls, 1, "Codex attempt was replayed");
    assert.equal(sdkCalls, mixed ? 1 : 0);
    if (mixed) {
      assert.equal(response.status, 503);
      assert.equal(body.error.code, "sdk_fixture_failure");
      assert.equal(final.responseStatus, 503);
      assert.equal(final.errorCode, "sdk_fixture_failure");
      assert.equal(final.model, "gpt-4o", "final retained a prior Codex model");
      assert.equal(final.requestedModel, "claude-sonnet-5");
      assert.equal(final.provider, "openai");
      assert.equal(
        final.account,
        "unknown",
        "final retained a prior Codex account",
      );
      assert.equal(final.accountType, "translation");
      assert.equal(final.accountIdentityStatus, "unavailable");
      assert.equal(parentSpan.attributes["gen_ai.response.model"], "gpt-4o");
      assert.equal(parentSpan.attributes["proxy.actual_provider"], "openai");
      assert.equal(parentSpan.attributes["proxy.account.served"], "unknown");
      assert.equal(
        parentSpan.attributes["proxy.account.served_type"],
        "translation",
      );
      assert.equal(parentSpan.attributes["ai.tokens.input"], undefined);
      assert.equal(
        parentSpan.attributes["gen_ai.usage.input_tokens"],
        undefined,
      );
      for (const field of [
        "inputTokens",
        "outputTokens",
        "cacheReadTokens",
        "reasoningTokens",
      ]) {
        assert.equal(
          final[field],
          undefined,
          `SDK final inherited prior Codex ${field}`,
        );
      }
      const usageAttempts = received
        .filter(
          (row) =>
            row.kind === "attempt" &&
            row.body.parentRequestId === final.requestId &&
            row.body.inputTokens !== undefined,
        )
        .map((row) => row.body);
      assert.equal(
        usageAttempts.length,
        1,
        "observed Codex usage must remain on exactly one child attempt",
      );
      const previous = usageAttempts[0];
      assert.equal(previous.requestId, `${final.requestId}:codex-fallback`);
      assert.equal(previous.model, "gpt-5.6-terra");
      assert.equal(previous.accountType, "codex-oauth");
      assert.equal(previous.responseStatus, 502);
      assert.equal(previous.inputTokens, 101);
      assert.equal(previous.cacheReadTokens, 41);
      assert.equal(previous.outputTokens, 13);
      assert.equal(previous.reasoningTokens, 11);
      assert.equal(previous.inputIncludesCachedTokens, true);
    } else {
      assert.equal(response.status, 502);
      assert.equal(body.error.code, "fixture_codex_retryable");
      assert.equal(final.model, "gpt-5.6-terra");
      assert.equal(final.accountType, "codex-oauth");
      assert.equal(final.inputTokens, 60);
      assert.equal(final.cacheReadTokens, 41);
      assert.equal(final.outputTokens, 13);
      assert.equal(final.reasoningTokens, 11);
      assert.equal(
        parentSpan.attributes["gen_ai.response.model"],
        "gpt-5.6-terra",
      );
      assert.equal(parentSpan.attributes["ai.tokens.input"], 60);
      assert.equal(parentSpan.attributes["ai.tokens.cache_read"], 41);
    }
    const metricsAfter = await metricTotals();
    for (const [name, amount] of Object.entries({
      proxy_requests_total: 1,
      proxy_tokens_input: 60,
      proxy_tokens_cache_read: 41,
      proxy_tokens_output: 13,
      proxy_tokens_reasoning: 11,
    })) {
      assert.equal(
        (metricsAfter[name] ?? 0) - (metricsBefore[name] ?? 0),
        amount,
        `${mixed ? "mixed" : "Codex only"}: ${name} must have one accounting owner`,
      );
    }
    console.log(
      `PASS ${mixed ? "mixed Codex to SDK" : "Codex only"} terminal attribution`,
    );
  }
  await runSessionAffinityRouteCases(app);
} finally {
  sessionAffinity.clear();
  logs.initRequestLogger(false);
  await otel.shutdownProxyOtelLogs();
  await tracerProvider.shutdown();
  await meterProvider.shutdown();
  trace.disable();
  metrics.disable();
  context.disable();
  propagation.disable();
  await __bodyCaptureWorkerTestHooks.reset();
  globalThis.fetch = originalFetch;
  ProviderHealthChecker.checkFallbackProviderAvailability =
    originalAvailability;
  await tokenStore.clearTokens("codex:fixture@example.test");
  await tokenStore.clearTokens(AFFINITY_ACCOUNT_A);
  await tokenStore.clearTokens(AFFINITY_ACCOUNT_B);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dir, { recursive: true, force: true });
}
