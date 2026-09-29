#!/usr/bin/env tsx
/** Determinism exception: this suite proves the Codex-outbound fallback
 * dispatcher's four trigger classes (no_accounts, pool_exhausted,
 * non_retryable_transport, loop_fallthrough) and its loop-prevention
 * boundary. Each trigger needs a staged failure (a planted cooldown file
 * entry, a transport error carrying a specific `.code`, a stubbed upstream
 * status) that no live provider call can be made to produce on demand, plus
 * an isolated OTLP receiver to read back the terminal accounting record
 * without depending on the real log sink. The unforgeable-marker case sends
 * a header combination — `x-neurolink-internal-origin` with a token this
 * process never minted — that a legitimate client can never construct; the
 * only way to prove the guard rejects it is to construct it directly. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import type {
  ServerContext,
  LoadedProxyConfig,
  CodexResponseEnvelope,
} from "../src/lib/types/index.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import { __testHooks as codexRouteTestHooks } from "../src/lib/server/routes/codexProxyRoutes.js";
import { ProxyRuntimeConfigStore } from "../src/lib/proxy/runtimeConfig.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import {
  saveAccountCooldown,
  clearAccountCooldown,
} from "../src/lib/proxy/accountCooldown.js";
import { setVertexAccessTokenProviderForTests } from "../src/lib/proxy/vertexAnthropicFallback.js";
import { codexAnthropicAffinityKey } from "../src/lib/proxy/codexOutboundCache.js";
import { logger } from "../src/lib/utils/logger.js";
import { analyzeProxyLogs } from "../src/lib/proxy/proxyAnalysis.js";
import { reconcileProxyUsageOwnership } from "../scripts/observability/proxy-telemetry-check.mjs";
import * as logs from "../src/lib/proxy/requestLogger.js";
import * as otel from "../src/lib/proxy/otelLogSink.js";
import * as lifecycle from "../src/lib/proxy/proxyLifecycle.js";
import * as activity from "../src/lib/proxy/proxyActivity.js";
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
// The vertex target resolves its project/location from these env vars
// (resolveVertexTarget in vertexAnthropicFallback.ts) and otherwise refuses
// to dispatch; "global" keeps the upstream host as the bare
// aiplatform.googleapis.com the fetch stub below matches, instead of a
// region-prefixed host. The token provider hook avoids a real GoogleAuth ADC
// lookup, which would fail outright in this sandboxed process.
process.env.GOOGLE_CLOUD_PROJECT = "outbound-fixture-project";
process.env.GOOGLE_CLOUD_LOCATION = "global";
setVertexAccessTokenProviderForTests(async () => "fixture-vertex-token");
class FixtureMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}
const metricReader = new FixtureMetricReader();
const meterProvider = new MeterProvider({
  readers: [metricReader],
});
metrics.setGlobalMeterProvider(meterProvider);
const spanExporter = new InMemorySpanExporter();
const tracerProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
trace.disable();
tracerProvider.register();

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
            ["request_final", "attempt"].includes(
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
const dir = mkdtempSync(join(tmpdir(), "proxy-codex-outbound-fallback-"));
logs.initRequestLogger(true);

const sse = (type: string, data: Record<string, unknown> = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

const CODEX_ACCOUNT_KEY = "codex:outbound-fixture@example.test";
const ANTHROPIC_ACCOUNT_KEY = "anthropic:outbound-fixture@example.test";
const ANTHROPIC_TOKEN = "outbound-fixture-anthropic-token";
// A distinct requested model routes the anthropic stub to a forced failure,
// which is how scenario H (unforgeable marker) drives the Claude engine's
// own account pool to exhaustion without needing a second config shape.
const UNFORGEABLE_TRIGGER_MODEL = "claude-sonnet-5-unforgeable-fixture";

const originalFetch = globalThis.fetch;
const originalAvailability =
  ProviderHealthChecker.checkFallbackProviderAvailability;
ProviderHealthChecker.checkFallbackProviderAvailability = async () => ({
  available: true,
});

let codexUpstreamCalls = 0;
let anthropicUpstreamCalls = 0;
let vertexCalls = 0;
// Captures the most recent request the anthropic-loopback branch actually
// forwarded upstream, so tests can assert on the cache-preservation markers
// (item 1) and the session-affinity header (item 2) that reach the real
// wire -- not just on the pure translation/breakpoint functions in isolation.
let lastAnthropicUpstreamHeaders: Headers | undefined;
let lastAnthropicUpstreamBody: Record<string, unknown> | undefined;
type CodexUpstreamMode =
  | "success"
  | "error500"
  | "error403"
  | "error403Policy"
  | "error400"
  | "throwTransport"
  | "incompleteStream";
let codexUpstreamMode: CodexUpstreamMode = "success";

// The usage block the anthropic stub puts on message_start. Scenarios that
// exercise the 1-hour cache-write breakdown swap it and must restore it.
const DEFAULT_MESSAGE_START_USAGE: Record<string, unknown> = {
  input_tokens: 1,
  output_tokens: 0,
};
let anthropicMessageStartUsage: Record<string, unknown> =
  DEFAULT_MESSAGE_START_USAGE;

// When true, the stub stream ends in an upstream `error` event after
// message_start, which the codec serializes as response.failed.
let anthropicStreamFails = false;
const anthropicFrames = (): string[] =>
  anthropicStreamFails
    ? [
        sse("message_start", {
          message: {
            id: "codex-outbound-fixture",
            type: "message",
            role: "assistant",
            model: "claude-sonnet-5",
            content: [],
            usage: anthropicMessageStartUsage,
          },
        }),
        sse("error", {
          type: "error",
          error: { type: "overloaded_error", message: "fixture overload" },
        }),
      ]
    : anthropicServedFrames();
const anthropicServedFrames = (): string[] => [
  sse("message_start", {
    message: {
      id: "codex-outbound-fixture",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content: [],
      usage: anthropicMessageStartUsage,
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
// When > 0, the anthropic stub sends message_start, pauses this long, then
// sends the rest, so a scenario can outlast the loopback headers timeout.
let anthropicStreamPauseMs = 0;
const anthropicServes = (): Response => {
  if (anthropicStreamPauseMs <= 0) {
    return new Response(anthropicFrames().join(""), {
      headers: { "content-type": "text/event-stream" },
    });
  }
  const [first, ...rest] = anthropicFrames();
  const pauseMs = anthropicStreamPauseMs;
  const encoder = new TextEncoder();
  let sentFirst = false;
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (!sentFirst) {
          sentFirst = true;
          controller.enqueue(encoder.encode(first));
          return;
        }
        await delay(pauseMs);
        controller.enqueue(encoder.encode(rest.join("")));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
};

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === "aiplatform.googleapis.com") {
    vertexCalls++;
    return anthropicServes();
  }
  if (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses")) {
    codexUpstreamCalls++;
    if (codexUpstreamMode === "throwTransport") {
      throw Object.assign(new Error("fixture transport failure"), {
        code: "ECONNRESET",
      });
    }
    if (codexUpstreamMode === "error500") {
      return new Response(
        JSON.stringify({ error: { message: "fixture upstream 500" } }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    if (codexUpstreamMode === "error403") {
      return new Response(
        JSON.stringify({ error: { message: "fixture upstream 403" } }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    if (codexUpstreamMode === "error403Policy") {
      return new Response(
        JSON.stringify({
          error: {
            message: "fixture upstream policy 403",
            code: "content_policy_violation",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    if (codexUpstreamMode === "error400") {
      return new Response(
        JSON.stringify({
          error: {
            message: "fixture upstream 400",
            code: "unsupported_parameter",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    if (codexUpstreamMode === "incompleteStream") {
      // Status 200, so the client-facing relay is already committed by the
      // time this closes -- but the body carries only a delta frame and
      // ends without a `response.completed` event, simulating an upstream
      // that drops the connection mid-turn.
      return new Response(
        sse("response.output_text.delta", { delta: "partial" }),
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return new Response(
      sse("response.completed", {
        response: {
          model: "gpt-5.6-terra",
          status: "completed",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "ok" }],
            },
          ],
          usage: { input_tokens: 5, output_tokens: 1 },
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  }
  if (
    url.hostname === "api.anthropic.com" &&
    url.pathname.endsWith("/messages")
  ) {
    const authorization = new Headers(init?.headers).get("authorization");
    // Only the account this suite registers may serve a request; anything
    // else (including a forged loopback that never went through the real
    // account pool) falls through to the 404 default below.
    if (authorization !== `Bearer ${ANTHROPIC_TOKEN}`) {
      return new Response("{}", { status: 404 });
    }
    anthropicUpstreamCalls++;
    const parsedBody = JSON.parse(String(init?.body)) as Record<
      string,
      unknown
    >;
    lastAnthropicUpstreamHeaders = new Headers(init?.headers);
    lastAnthropicUpstreamBody = parsedBody;
    if (parsedBody.model === UNFORGEABLE_TRIGGER_MODEL) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "fixture forced exhaustion" },
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    return anthropicServes();
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
  stream: async () => {
    throw Object.assign(new Error("Fixture: SDK path must not be reached"), {
      status: 500,
      retryable: false,
    });
  },
};

const configPath = join(dir, "fixture.json");
const PORT = 61247; // Nonzero: dispatchCodexOutboundTarget's anthropic branch
// treats a falsy loopbackPort as "not configured" and refuses to dispatch.
// app.request() never opens a real socket on this port; internalDispatch
// (wired by createProxyStartApp itself) stays fully in-process.

const writeConfig = async (routing: Record<string, unknown>): Promise<void> => {
  const config: LoadedProxyConfig = { routing };
  writeFileSync(configPath, JSON.stringify(config));
  const result = await runtimeConfigStore.reload();
  assert.equal(result.applied, true, "fixture config was rejected");
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

const flushAll = async (): Promise<void> => {
  await logs.flushRequestLogs();
  await lifecycle.flushProxyLifecycleEvents();
  await otel.flushProxyOtelLogs();
};

const codexFixtureBody = (overrides: Record<string, unknown> = {}) => ({
  model: "gpt-5.6-terra",
  stream: true,
  store: false,
  input: [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "codex outbound fixture" }],
    },
  ],
  ...overrides,
});

const oversizedCodexBody = () => ({
  model: "gpt-5.6-terra",
  stream: true,
  store: false,
  input: [
    {
      type: "function_call_output",
      call_id: "c1",
      output: "x".repeat(16 * 1024 * 1024 + 1),
    },
  ],
});

const initialConfig: LoadedProxyConfig = { routing: {} };
writeFileSync(configPath, JSON.stringify(initialConfig));
const runtimeConfigStore = await ProxyRuntimeConfigStore.create({
  configPath,
  configRequired: true,
  baseEnv: {},
  passthrough: false,
});

try {
  const { app } = await createProxyStartApp({
    runtimeConfigStore,
    neurolink: fixtureNeurolink,
    modelRouter: undefined,
    strategy: "fill-first",
    passthrough: false,
    port: PORT,
    host: "127.0.0.1",
    proxyConfig: initialConfig,
    primaryAccountKey: undefined,
    accountAllowlist: undefined,
  });

  const sendCodex = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) =>
    app.request("http://localhost/backend-api/codex/responses", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  const sendMessages = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) =>
    app.request("http://localhost/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  // A dispatched fallback leg is itself a full internal /v1/messages request
  // and writes its own request_final record, so the client-facing Codex
  // request's record must be picked out by path rather than by uniqueness.
  const lastFinal = (): Record<string, unknown> => {
    const finals = received
      .filter(
        (r) =>
          r.kind === "request_final" &&
          r.body.path === "/backend-api/codex/responses",
      )
      .map((r) => r.body);
    assert.equal(
      finals.length,
      1,
      "exactly one Codex-route final accounting record",
    );
    return finals[0];
  };
  // Cumulative proxy_tokens_input per label set, for before/after deltas.
  const inputTokenTotals = async (): Promise<Map<string, number>> => {
    const collected = await metricReader.collect();
    const totals = new Map<string, number>();
    for (const scope of collected.resourceMetrics.scopeMetrics) {
      for (const metric of scope.metrics) {
        if (metric.descriptor.name !== "proxy_tokens_input") {
          continue;
        }
        for (const point of metric.dataPoints) {
          const key = JSON.stringify(
            Object.entries(point.attributes).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          );
          totals.set(key, (totals.get(key) ?? 0) + Number(point.value));
        }
      }
    }
    return totals;
  };
  // The anthropic target's loopback leg: the entry that owns the call's usage.
  const childFinal = (): Record<string, unknown> => {
    const finals = received
      .filter(
        (r) => r.kind === "request_final" && r.body.path === "/v1/messages",
      )
      .map((r) => r.body);
    assert.equal(
      finals.length,
      1,
      "exactly one loopback /v1/messages final accounting record",
    );
    return finals[0];
  };

  // --- Scenario A: flag OFF, no Codex accounts -> byte-identical 401. ---
  {
    received.length = 0;
    await writeConfig({});
    const response = await sendCodex(codexFixtureBody());
    const body = await response.json();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      error: {
        type: "proxy_error",
        message:
          "No Codex accounts configured. Run `neurolink auth login codex`.",
      },
    });
    assert.equal(response.headers.get("x-neurolink-served-by"), null);
    console.log(
      "PASS flag OFF: no_accounts response is byte-identical to pre-feature behavior",
    );
  }

  // --- Scenario B: flag ON, no accounts, target=anthropic -> dispatches. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    const tokensBefore = await inputTokenTotals();
    lastAnthropicUpstreamHeaders = undefined;
    lastAnthropicUpstreamBody = undefined;
    await tokenStore.saveTokens(ANTHROPIC_ACCOUNT_KEY, {
      accessToken: ANTHROPIC_TOKEN,
      tokenType: "Bearer",
      expiresAt: Date.now() + 3600000,
    });
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    // A developer-role message is required so translateCodexRequestToClaude
    // actually produces a `system` block (buildSystemBlocksFromDeveloperMessages
    // reads only `role: "developer"` items) -- otherwise there is no stable
    // head for applyClaudeRequestCacheBreakpoints to anchor breakpoint 1 on,
    // and the item-1/item-2 assertions below would have nothing to find.
    const scenarioBBody = codexFixtureBody({
      input: [
        {
          type: "message",
          role: "developer",
          content: [
            { type: "input_text", text: "You are a helpful assistant." },
          ],
        },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "codex outbound fixture" }],
        },
      ],
    });
    const response = await sendCodex(scenarioBBody);
    const text = await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "no_accounts+anthropic target must dispatch",
    );
    assert.equal(
      response.headers.get("x-neurolink-served-by"),
      "codex-outbound-fallback:anthropic",
    );
    assert.equal(
      anthropicUpstreamCalls,
      1,
      "the anthropic loopback must reach the real upstream once",
    );
    assert.match(text, /response\.completed/);
    const final = lastFinal();
    assert.equal(final.responseStatus, 200);
    assert.equal(final.terminalOutcome, "completed");
    const parentSpan = spanExporter
      .getFinishedSpans()
      .find(
        (s) =>
          s.name === "proxy.request" &&
          s.attributes["proxy.request_id"] === final.requestId,
      );
    assert.ok(parentSpan, "no_accounts dispatch must produce a finished span");
    assert.equal(parentSpan!.attributes["proxy.model_substituted"], true);
    assert.equal(
      parentSpan!.attributes["proxy.actual_model"],
      "claude-sonnet-5",
    );
    assert.equal(parentSpan!.attributes["proxy.actual_provider"], "anthropic");
    // Item 3: setRequestOrigin("codex-fallback") must have been called where
    // the outbound path entered dispatch, and it must land on the SAME span
    // this test already reads (`proxy.request` for the outer request id).
    assert.equal(
      parentSpan!.attributes["proxy.request_origin"],
      "codex-fallback",
      "the outer request span must carry the codex-fallback origin once the outbound path dispatches",
    );
    // Item 1: cache preservation must reach the actual upstream body, not
    // just the pure translation/breakpoint functions in isolation. The
    // translated Codex request has no "Claude Agent SDK" identity block, so
    // claudeProxyRoutes.ts's polyfillOAuthBody treats this as a non-CC
    // client: it relocates the marked system blocks into the first user
    // message's content (systemRelocation.ts's
    // relocateClientSystemIntoMessages, which copies `cache_control` onto
    // the relocated block) rather than leaving them under `system`. So the
    // 1h breakpoint 1 marker must be looked for there, not on `system`.
    assert.ok(
      lastAnthropicUpstreamBody,
      "the anthropic upstream mock must have captured a forwarded body",
    );
    const forwardedMessages = (
      lastAnthropicUpstreamBody as {
        messages?: Array<{ role?: string; content?: unknown }>;
      }
    ).messages;
    const firstUserContent = forwardedMessages?.find(
      (m) => m.role === "user",
    )?.content;
    assert.ok(
      Array.isArray(firstUserContent) && firstUserContent.length > 0,
      "the forwarded first user message must carry the relocated system content",
    );
    const relocatedBlockWithBreakpoint = (
      firstUserContent as Array<{
        cache_control?: { type?: string; ttl?: string };
      }>
    ).find((b) => b.cache_control);
    assert.equal(
      relocatedBlockWithBreakpoint?.cache_control?.type,
      "ephemeral",
      "the relocated system content must carry a cache_control breakpoint",
    );
    assert.equal(
      relocatedBlockWithBreakpoint?.cache_control?.ttl,
      "1h",
      "the forwarded breakpoint 1 must carry the 1h ttl the outbound leg requests",
    );
    // Item 2: the derived affinity key must reach the wire, unmodified, as
    // the header selectClaudeProxyAccountOrder already reads for session
    // affinity. Asserting mere non-emptiness would pass even with the fix
    // disabled: polyfillOAuthBody's OAuth identity polyfill always sets
    // SOME x-claude-code-session-id when the loopback sends none (it falls
    // back to getOrCreateClaudeCodeIdentity's cached/random UUID), so a
    // presence-only check cannot distinguish "our derived key reached the
    // wire" from "no key was forwarded and a fallback filled the gap".
    // Compare the actual forwarded header against codexAnthropicAffinityKey
    // computed from this scenario's own request body, so the assertion is
    // pinned to the exact value the fix is supposed to produce.
    const expectedAffinityHeader = codexAnthropicAffinityKey(
      scenarioBBody as unknown as Parameters<
        typeof codexAnthropicAffinityKey
      >[0],
    );
    assert.ok(
      expectedAffinityHeader,
      "the scenario fixture must derive a non-empty affinity key (test setup)",
    );
    // The fetch stub reassigns this; without the cast, control-flow
    // narrowing from the reset above types it as `undefined` here.
    const forwardedAffinityHeader = (
      lastAnthropicUpstreamHeaders as Headers | undefined
    )?.get("x-claude-code-session-id");
    assert.equal(
      forwardedAffinityHeader,
      expectedAffinityHeader,
      "the anthropic-target loopback must forward the exact codexAnthropicAffinityKey value as x-claude-code-session-id",
    );
    // Fix pass 2 item 1: the anthropic-loopback child is a full /v1/messages
    // request that logs its own token usage, so the outer Codex-route entry
    // must name it as the usage owner. Without that link, an aggregate sums
    // the same provider call twice (once per entry).
    const outerFinal = lastFinal();
    const childFinals = received
      .filter(
        (r) => r.kind === "request_final" && r.body.path === "/v1/messages",
      )
      .map((r) => r.body);
    assert.equal(
      childFinals.length,
      1,
      "exactly one loopback /v1/messages final record (precondition for the ownership check)",
    );
    const childFinal = childFinals[0];
    assert.notEqual(childFinal.requestId, outerFinal.requestId);
    assert.equal(outerFinal.accountingScope, "client");
    // Like the OpenAI bridge's parent entry, the outer entry names what the
    // child served, and keeps the Codex model as the requested one.
    assert.equal(outerFinal.provider, childFinal.provider);
    assert.equal(outerFinal.model, childFinal.model);
    assert.equal(outerFinal.account, childFinal.account);
    assert.equal(outerFinal.accountType, childFinal.accountType);
    assert.equal(outerFinal.requestedModel, "gpt-5.6-terra");
    assert.equal(
      outerFinal.usageOwnerRequestId,
      childFinal.requestId,
      "the outer Codex entry must name the loopback child as its usage owner",
    );
    assert.ok(
      childFinal.usageOwnerRequestId === undefined ||
        childFinal.usageOwnerRequestId === childFinal.requestId,
      "the child must own its own usage, or the pair would be skipped entirely",
    );
    const aggregateLogsDir = join(dir, "aggregate-logs");
    mkdirSync(aggregateLogsDir, { recursive: true });
    writeFileSync(
      join(
        aggregateLogsDir,
        `proxy-${new Date().toISOString().slice(0, 10)}.jsonl`,
      ),
      received
        .filter((r) => r.kind === "request_final")
        .map((r) => JSON.stringify(r.body))
        .join("\n") + "\n",
    );
    const aggregate = await analyzeProxyLogs({
      logsDir: aggregateLogsDir,
      since: "1h",
    });
    assert.equal(
      aggregate.cache.requestsWithUsage,
      1,
      "one provider call must be counted once in the aggregate, not once per entry",
    );
    // The delegating entry carries no usage of its own, exactly like the
    // OpenAI bridge's parent row; the repo's ownership check enforces that.
    for (const field of [
      "inputTokens",
      "outputTokens",
      "cacheReadTokens",
      "cacheCreationTokens",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(outerFinal, field),
        false,
        `the delegating outer entry must not carry ${field}`,
      );
    }
    const ownership = reconcileProxyUsageOwnership([outerFinal, childFinal]);
    // One provider call, one metric increment: the Codex parent opts out and
    // the loopback child records it, labelled as fallback traffic.
    const tokensAfter = await inputTokenTotals();
    let delta = 0;
    let fallbackDelta = 0;
    for (const [key, value] of tokensAfter) {
      const grew = value - (tokensBefore.get(key) ?? 0);
      delta += grew;
      if (key.includes('"codex-fallback"')) {
        fallbackDelta += grew;
      }
    }
    assert.ok(
      delta > 0,
      "precondition: the fallback call recorded input tokens",
    );
    assert.equal(
      delta,
      Number(childFinal.inputTokens),
      "the fallback call's input tokens must be counted once across all series",
    );
    assert.equal(
      fallbackDelta,
      delta,
      "the loopback leg's tokens must land on the codex-fallback series",
    );
    assert.equal(
      ownership.status,
      "pass",
      "the outer/child pair must reconcile as one owned provider call",
    );
    console.log(
      "PASS flag ON, no_accounts: dispatches to the anthropic-loopback target " +
        "with cache breakpoints, affinity header and origin label all reaching the wire",
    );
  }

  // --- Scenario B2/B3 (fix pass 2 item 2): a 1-hour cache write reported by
  // the Anthropic-shape upstream must reach the final accounting record and
  // the Codex-shape usage envelope; an upstream that reports no breakdown
  // must leave both exactly as they were. ---
  {
    const withBreakdown: Record<string, unknown> = {
      input_tokens: 1,
      output_tokens: 0,
      cache_creation_input_tokens: 300,
      cache_read_input_tokens: 0,
      cache_creation: {
        ephemeral_1h_input_tokens: 200,
        ephemeral_5m_input_tokens: 100,
      },
    };
    const withoutBreakdown: Record<string, unknown> = {
      input_tokens: 1,
      output_tokens: 0,
      cache_creation_input_tokens: 300,
      cache_read_input_tokens: 0,
    };
    try {
      received.length = 0;
      anthropicMessageStartUsage = withBreakdown;
      let response = await sendCodex(codexFixtureBody());
      let text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(response.status, 200);
      assert.match(text, /response\.completed/);
      assert.match(
        text,
        /"cache_write_1h_tokens":200/,
        "the Codex usage envelope must carry the 1-hour cache-write count",
      );
      let final = childFinal();
      assert.equal(final.cacheCreationTokens, 300);
      assert.equal(
        final.cacheCreation1hTokens,
        200,
        "the final record must carry the 1-hour cache-write subset for cost attribution",
      );

      received.length = 0;
      anthropicMessageStartUsage = withoutBreakdown;
      response = await sendCodex(codexFixtureBody());
      text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(response.status, 200);
      assert.match(text, /response\.completed/);
      assert.doesNotMatch(
        text,
        /cache_write_1h_tokens/,
        "control: no breakdown reported means no 1-hour field on the envelope",
      );
      final = childFinal();
      assert.equal(final.cacheCreationTokens, 300);
      assert.equal(
        Object.prototype.hasOwnProperty.call(final, "cacheCreation1hTokens"),
        false,
        "control: no breakdown reported means no 1-hour field on the final record",
      );
    } finally {
      anthropicMessageStartUsage = DEFAULT_MESSAGE_START_USAGE;
    }
    console.log(
      "PASS streaming outbound path: 1h cache-write breakdown reaches the envelope and final record; absent breakdown is unchanged",
    );
  }

  // --- Scenario B4 (fix pass 2 item 3): a request whose only target fails
  // must keep the native origin. The origin is stamped at the commit point,
  // so an abandoned attempt leaves nothing behind. (The successful-dispatch
  // half of this item is Scenario B's and D's origin assertions.) ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: UNFORGEABLE_TRIGGER_MODEL },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const response = await sendCodex(codexFixtureBody());
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.ok(
      anthropicUpstreamCalls > 0,
      "precondition: the failing target must actually have been dispatched to",
    );
    assert.notEqual(
      response.headers.get("x-neurolink-served-by"),
      "codex-outbound-fallback:anthropic",
      "precondition: the failing target must not have served the turn",
    );
    const final = lastFinal();
    const span = spanExporter
      .getFinishedSpans()
      .find(
        (s) =>
          s.name === "proxy.request" &&
          s.attributes["proxy.request_id"] === final.requestId,
      );
    assert.ok(span, "the failed request must still produce a finished span");
    assert.notEqual(
      span!.attributes["proxy.request_origin"],
      "codex-fallback",
      "an attempted-but-abandoned target must not stamp the codex-fallback origin",
    );
    console.log(
      "PASS origin label: an exhausted target list keeps the native origin",
    );
  }

  // --- Scenario B5 (fix pass 2 item 4): the cache-preservation guard fails
  // open. A translated request with no developer-role prefix has no
  // array-shaped `system`, so assertClaudeSystemPrefixShape throws during a
  // real dispatch; the turn must still succeed, the forwarded body must carry
  // no added 1-hour breakpoint, and exactly one payload-free warning is logged.
  // The control right after it (developer-role prefix present) proves the
  // forwarded-body check can see a 1-hour breakpoint when the guard passes. ---
  {
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const CANARY = "guard-fail-open-payload-canary";
    const guardWarnPrefix =
      "[codex-outbound-fallback] cache-preservation guard";
    const originalWarn = logger.warn.bind(logger);
    const guardWarnings: string[] = [];
    logger.warn = (...args: unknown[]): void => {
      const line = args.map((a) => String(a)).join(" ");
      if (line.startsWith(guardWarnPrefix)) {
        guardWarnings.push(line);
      }
      originalWarn(...args);
    };
    const hasOneHourBreakpoint = (body: unknown): boolean =>
      JSON.stringify(body).includes('"ttl":"1h"');
    try {
      received.length = 0;
      anthropicUpstreamCalls = 0;
      lastAnthropicUpstreamBody = undefined;
      let response = await sendCodex(
        codexFixtureBody({
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: CANARY }],
            },
          ],
        }),
      );
      let text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(
        response.status,
        200,
        "a thrown cache guard must never fail the rescued turn",
      );
      assert.match(text, /response\.completed/);
      assert.equal(
        response.headers.get("x-neurolink-served-by"),
        "codex-outbound-fallback:anthropic",
      );
      assert.equal(anthropicUpstreamCalls, 1);
      assert.equal(
        guardWarnings.length,
        1,
        "exactly one guard warning must be logged for the failed-open dispatch",
      );
      assert.ok(
        !guardWarnings[0].includes(CANARY),
        "the guard warning must not carry request payload content",
      );
      assert.ok(
        lastAnthropicUpstreamBody,
        "the request must have been forwarded",
      );
      assert.equal(
        hasOneHourBreakpoint(lastAnthropicUpstreamBody),
        false,
        "a failed-open dispatch must not carry the added 1-hour cache breakpoints",
      );

      // Control: the guard passes for a developer-prefixed request, logs
      // nothing, and the same forwarded-body check does see the breakpoints.
      guardWarnings.length = 0;
      lastAnthropicUpstreamBody = undefined;
      response = await sendCodex(
        codexFixtureBody({
          input: [
            {
              type: "message",
              role: "developer",
              content: [{ type: "input_text", text: "control system prefix" }],
            },
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "control turn" }],
            },
          ],
        }),
      );
      text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(response.status, 200);
      assert.equal(
        guardWarnings.length,
        0,
        "control: a well-shaped request must not log a guard warning",
      );
      assert.equal(
        hasOneHourBreakpoint(lastAnthropicUpstreamBody),
        true,
        "control: a well-shaped request must reach the wire with the 1-hour breakpoints",
      );
    } finally {
      logger.warn = originalWarn;
    }
    console.log(
      "PASS cache guard fails open: turn succeeds, no added breakpoints, one payload-free warning",
    );
  }

  // --- Scenario C (still zero Codex accounts): REQUEST_TOO_LARGE -> 413. ---
  {
    received.length = 0;
    const response = await sendCodex(oversizedCodexBody());
    const body = await response.json();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(response.status, 413);
    assert.equal(
      (body as { error?: { code?: string } }).error?.code,
      "request_too_large",
    );
    console.log(
      "PASS oversized tool history maps to 413 request_too_large before any dispatch",
    );
  }

  // Register the Codex account (no refreshToken, deliberately: a 403 with no
  // refresh token falls straight to the "other non-ok" branch instead of the
  // auth-retry branch, which scenario F below depends on).
  await tokenStore.saveTokens(CODEX_ACCOUNT_KEY, {
    accessToken: "codex-outbound-fixture-token",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600000,
  });

  // --- Scenario D: pool_exhausted (planted cooldown), target=vertex. ---
  {
    received.length = 0;
    vertexCalls = 0;
    await saveAccountCooldown(
      CODEX_ACCOUNT_KEY,
      Date.now() + 5 * 60 * 1000,
      "transient",
    );
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "vertex", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const response = await sendCodex(codexFixtureBody());
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "pool_exhausted+vertex target must dispatch",
    );
    assert.equal(
      response.headers.get("x-neurolink-served-by"),
      "codex-outbound-fallback:vertex",
    );
    assert.equal(
      vertexCalls,
      1,
      "the vertex leg must reach the stubbed vertex upstream once",
    );
    assert.equal(
      codexUpstreamCalls,
      0,
      "a fully-cooling pool must never reach the Codex upstream",
    );
    const final = lastFinal();
    assert.equal(final.responseStatus, 200);
    // The Vertex target has no loopback child, so this entry owns its usage.
    assert.equal(final.usageOwnerRequestId, undefined);
    assert.notEqual(final.accountingScope, "client");
    // It is therefore the only record that prices this turn: it must name the
    // served Claude model on Vertex, not the Codex model and provider.
    assert.equal(final.provider, "vertex");
    assert.equal(final.pricingProvider, "vertex");
    assert.equal(final.model, "claude-sonnet-5");
    assert.equal(final.requestedModel, "gpt-5.6-terra");
    assert.equal(final.account, "vertex/claude-sonnet-5");
    assert.equal(final.accountType, "vertex");
    // DEFAULT_MESSAGE_START_USAGE omits both cache fields. The log must keep
    // that distinct from a provider-observed zero, or offline hit-rate
    // analysis counts this request as a cache miss.
    assert.equal(final.cacheReadTokensObserved, false);
    assert.equal(final.cacheCreationTokensObserved, false);
    assert.equal("cacheReadTokens" in final, false);
    assert.equal("cacheCreationTokens" in final, false);
    // The same attribution reaches the root span, which the OTel cost
    // counters read.
    const parentSpan = spanExporter
      .getFinishedSpans()
      .find(
        (s) =>
          s.name === "proxy.request" &&
          s.attributes["proxy.request_id"] === final.requestId,
      );
    assert.ok(
      parentSpan,
      "pool_exhausted dispatch must produce a finished span",
    );
    assert.equal(
      parentSpan!.attributes["proxy.account.served"],
      "vertex/claude-sonnet-5",
      "the vertex leg must attribute to vertex/<model>, matching the existing Claude->Vertex leg's labeling convention",
    );
    assert.equal(parentSpan!.attributes["proxy.account.served_type"], "vertex");
    // Item 3: setRequestOrigin("codex-fallback") must be called for the
    // vertex target too, not only the anthropic one.
    assert.equal(
      parentSpan!.attributes["proxy.request_origin"],
      "codex-fallback",
      "the vertex-target dispatch must also carry the codex-fallback origin label",
    );
    await clearAccountCooldown(CODEX_ACCOUNT_KEY);
    console.log(
      "PASS flag ON, pool_exhausted: dispatches to the vertex target with vertex/<model> attribution and origin label",
    );
  }

  // --- Scenario D2: internal-dispatch capacity full -> next target serves. ---
  {
    received.length = 0;
    vertexCalls = 0;
    anthropicUpstreamCalls = 0;
    await saveAccountCooldown(
      CODEX_ACCOUNT_KEY,
      Date.now() + 5 * 60 * 1000,
      "transient",
    );
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: "claude-sonnet-5" },
        { provider: "vertex", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const fillers: { parent: string; dispose: () => void }[] = [];
    try {
      for (;;) {
        const parent = `capacity-fixture-${fillers.length}`;
        try {
          fillers.push({
            parent,
            dispose: activity.registerInternalProxyRequest(parent).dispose,
          });
        } catch {
          break;
        }
      }
      assert.ok(
        fillers.length > 0,
        "fixture: the internal-dispatch registry must accept fillers before it is full",
      );
      const response = await sendCodex(codexFixtureBody());
      const text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(
        response.status,
        200,
        "a full internal-dispatch registry must fail only the anthropic target",
      );
      assert.equal(
        response.headers.get("x-neurolink-served-by"),
        "codex-outbound-fallback:vertex",
      );
      assert.match(text, /response\.completed/);
      assert.equal(vertexCalls, 1);
      assert.equal(anthropicUpstreamCalls, 0);
    } finally {
      for (const filler of fillers) {
        filler.dispose();
        activity.releaseProxyRequestAccounting(filler.parent);
      }
      await clearAccountCooldown(CODEX_ACCOUNT_KEY);
    }
    console.log(
      "PASS flag ON, internal-dispatch capacity full: the anthropic target fails over to vertex",
    );
  }

  // --- Scenario D3: a fallback stream ending in response.failed logs 502. ---
  {
    received.length = 0;
    vertexCalls = 0;
    await saveAccountCooldown(
      CODEX_ACCOUNT_KEY,
      Date.now() + 5 * 60 * 1000,
      "transient",
    );
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "vertex", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    anthropicStreamFails = true;
    try {
      const response = await sendCodex(codexFixtureBody());
      const text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(response.status, 200, "the stream was already committed");
      assert.match(text, /response\.failed/);
      const final = lastFinal();
      assert.equal(
        final.responseStatus,
        502,
        "a fallback turn that ended in response.failed must be recorded as a failure",
      );
      assert.equal(final.terminalOutcome, "stream_error");
      assert.equal(final.errorType, "outbound_fallback_stream_failed");
    } finally {
      anthropicStreamFails = false;
      await clearAccountCooldown(CODEX_ACCOUNT_KEY);
    }
    console.log(
      "PASS flag ON, vertex target: a stream ending in response.failed is recorded as 502",
    );
  }

  // --- Scenario E: non_retryable_transport, target=anthropic. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = "throwTransport";
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const response = await sendCodex(codexFixtureBody());
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "non_retryable_transport must dispatch to anthropic",
    );
    assert.equal(
      codexUpstreamCalls,
      1,
      "exactly one failed Codex transport attempt",
    );
    assert.equal(anthropicUpstreamCalls, 1);
    console.log(
      "PASS flag ON, non_retryable_transport: dispatches to the anthropic-loopback target",
    );
  }

  // --- Scenario F: loop_fallthrough, upstream 500 -> eligible, dispatches. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = "error500";
    const response = await sendCodex(codexFixtureBody());
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "loop_fallthrough+500 must be eligible and dispatch",
    );
    assert.equal(codexUpstreamCalls, 1);
    assert.equal(anthropicUpstreamCalls, 1);
    console.log(
      "PASS flag ON, loop_fallthrough (upstream 500): dispatches to the anthropic-loopback target",
    );
  }

  // --- Scenario F2: the loopback timeout bounds the headers, not the stream. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = "error500";
    codexRouteTestHooks.setOutboundFallbackTimeoutMsForTests(200);
    anthropicStreamPauseMs = 600;
    try {
      const response = await sendCodex(codexFixtureBody());
      const text = await response.text();
      await waitForProxyIdle();
      await flushAll();
      assert.equal(response.status, 200);
      assert.equal(anthropicUpstreamCalls, 1);
      assert.match(
        text,
        /response\.completed/,
        "a fallback stream that outlives the headers timeout must still complete",
      );
      assert.doesNotMatch(text, /response\.failed/);
    } finally {
      codexRouteTestHooks.setOutboundFallbackTimeoutMsForTests(null);
      anthropicStreamPauseMs = 0;
    }
    console.log(
      "PASS flag ON, anthropic loopback: the headers timeout does not cut off a longer stream",
    );
  }

  // --- Scenario G: loop_fallthrough, bare upstream 403 -> eligible. ---
  // Spec trigger table: 401/403 exhausted after refresh+rotate is a
  // credential failure on Codex's own pool and falls back.
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = "error403";
    const response = await sendCodex(codexFixtureBody());
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "a 403 with no content-policy code is a Codex credential failure and must fall back",
    );
    assert.equal(codexUpstreamCalls, 1);
    assert.equal(anthropicUpstreamCalls, 1);
    console.log(
      "PASS flag ON, loop_fallthrough (bare upstream 403): dispatches to the anthropic-loopback target",
    );
  }
  // Each 403 parks the no-refresh-token fixture account with an "auth"
  // cooldown; without clearing it the next scenario would see pool_exhausted.
  await clearAccountCooldown(CODEX_ACCOUNT_KEY);

  // --- Scenario G2/G3: a content-policy 403 or a 400 -> NOT eligible (negative controls). ---
  for (const negative of [
    {
      mode: "error403Policy" as const,
      status: 403,
      message: /fixture upstream policy 403/,
      label: "content-policy 403",
    },
    {
      mode: "error400" as const,
      status: 400,
      message: /fixture upstream 400/,
      label: "400",
    },
  ]) {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = negative.mode;
    const response = await sendCodex(codexFixtureBody());
    const text = await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      negative.status,
      `a ${negative.label} must surface unchanged, not be treated as fallback-eligible`,
    );
    const errorBody = JSON.parse(text) as {
      error?: { type?: string; message?: string };
    };
    assert.equal(errorBody.error?.type, "proxy_error");
    // The original upstream error text must survive unchanged, proving the
    // error was surfaced directly and not swallowed into a generic fallback
    // classification.
    assert.match(
      errorBody.error?.message ?? "",
      negative.message,
      `loop_fallthrough+${negative.label} must surface the original upstream error text`,
    );
    assert.equal(codexUpstreamCalls, 1);
    assert.equal(
      anthropicUpstreamCalls,
      0,
      `a ${negative.label} loop_fallthrough must never reach the fallback target`,
    );
    const final = lastFinal();
    assert.equal(final.responseStatus, negative.status);
    console.log(
      `PASS flag ON, loop_fallthrough (upstream ${negative.label}): classifier excludes it, original status is unchanged`,
    );
    await clearAccountCooldown(CODEX_ACCOUNT_KEY);
  }
  codexUpstreamMode = "success";
  // The 403 above hit the "no refresh token" auth-cooldown side effect
  // (saveAccountCooldown(..., "auth")) in the real production code path, so
  // the Codex fixture account must be un-cooled before it can serve scenario
  // H's control request.
  await clearAccountCooldown(CODEX_ACCOUNT_KEY);

  // --- Scenario H: unforgeable internal-request marker. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    await writeConfig({
      fallbackChain: [
        { provider: "codex", model: "gpt-5.6-terra", reasoningEffort: "low" },
      ],
    });
    const requestBody = {
      model: UNFORGEABLE_TRIGGER_MODEL,
      stream: false,
      max_tokens: 16,
      messages: [{ role: "user", content: "unforgeable marker fixture" }],
    };
    // Unmarked control: an ordinary external request with no internal headers
    // at all must reach the configured Codex fallback once its one Anthropic
    // account is forced to fail.
    received.length = 0;
    let response = await sendMessages(requestBody);
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      codexUpstreamCalls,
      1,
      "control: unmarked request must reach the configured Codex fallback",
    );

    // Forged marker: the same request, but carrying the exact header pair
    // `claudeProxyRoutes.ts` reads to decide `isCodexOutboundFallbackLeg`,
    // with a token this process never minted via `registerInternalProxyRequest`.
    // `consumeInternalProxyRequest` must reject it, so the Codex entry in the
    // fallback chain must NOT be filtered out -- behavior must match the
    // unmarked control exactly, proving the header pair alone grants nothing.
    codexUpstreamCalls = 0;
    received.length = 0;
    response = await sendMessages(requestBody, {
      "x-neurolink-internal-origin": "codex-outbound-fallback",
      "x-neurolink-internal-request":
        "forged-token-never-issued-by-this-process",
    });
    await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      codexUpstreamCalls,
      1,
      "a forged internal-origin header with an unminted token must not suppress the configured Codex fallback entry",
    );
    console.log(
      "PASS forged x-neurolink-internal-origin + unminted token cannot achieve internal-leg status",
    );
  }

  // --- Scenario I: commitment -- a native Codex 200 stream that fails
  // mid-turn must never trigger outbound fallback, even though the feature
  // is enabled with a reachable target. The client already has a committed
  // 200 by the time the missing `response.completed` event is discovered,
  // so the only fallback-shaped move left is a second, illegitimate upstream
  // attempt; this proves none occurs. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    codexUpstreamMode = "incompleteStream";
    await writeConfig({
      codexOutboundFallbackEnabled: true,
      codexOutboundFallbackTargets: [
        { provider: "anthropic", model: "claude-sonnet-5" },
      ],
      codexOutboundFallbackModelMappings: [],
    });
    const response = await sendCodex(codexFixtureBody());
    const text = await response.text();
    await waitForProxyIdle();
    await flushAll();
    assert.equal(
      response.status,
      200,
      "the native Codex stream already committed to 200 before it broke",
    );
    assert.doesNotMatch(
      text,
      /response\.completed/,
      "fixture must actually be incomplete for this to be a meaningful proof",
    );
    assert.equal(
      codexUpstreamCalls,
      1,
      "a stream failure after commitment must not retry a second Codex upstream call",
    );
    assert.equal(
      anthropicUpstreamCalls,
      0,
      "a stream failure after commitment must never dispatch the configured fallback target",
    );
    assert.equal(
      response.headers.get("x-neurolink-served-by"),
      "codex",
      "the response was served natively, not by the outbound-fallback path",
    );
    const final = lastFinal();
    assert.equal(final.terminalOutcome, "stream_error");
    console.log(
      "PASS commitment: a post-200 mid-stream failure never retries or falls back",
    );
  }
  codexUpstreamMode = "success";

  // --- Scenario J: re-entry guard -- a Codex request dispatched outbound to
  // an anthropic target whose loopback Anthropic account itself then falls
  // back into Codex (via Claude's own native `fallbackChain`) must not be
  // able to re-trigger the Codex-outbound-fallback dispatcher a second time
  // (a Codex->Anthropic->Codex engine ping-pong). Both features are enabled
  // simultaneously, and the Anthropic target's model is the fixture's
  // forced-failure trigger so its one account is guaranteed to exhaust and
  // reach `fallbackChain`. ---
  {
    received.length = 0;
    anthropicUpstreamCalls = 0;
    codexUpstreamCalls = 0;
    // Zero Codex accounts: both the outer client request (no_accounts) and
    // the inner nested `fallbackChain` Codex leg must see an empty pool, so
    // neither ever reaches the Codex upstream fetch at all. Because of that,
    // the call-count assertions below (anthropicLoopbackFinals, codexUpstreamCalls)
    // would read identically whether or not the re-entry guard is actually
    // filtering "codex" out of the inner leg's fallback plan -- an empty pool
    // makes any codex attempt fail before it reaches an upstream call either
    // way. The line that actually distinguishes "guard filtered codex out of
    // the plan" from "guard did nothing and the plan still tried codex" is
    // `[proxy] fallback → codex/...`, which claudeProxyRoutes.ts's own native
    // fallback loop logs unconditionally BEFORE it discovers there is no
    // account -- so a `logger.always` spy is the only reliable proof here.
    const originalAlways = logger.always.bind(logger);
    const alwaysLines: string[] = [];
    logger.always = (...args: unknown[]): void => {
      alwaysLines.push(args.map((a) => String(a)).join(" "));
      originalAlways(...args);
    };
    let response: Response;
    let body: unknown;
    try {
      await tokenStore.clearTokens(CODEX_ACCOUNT_KEY);
      await writeConfig({
        codexOutboundFallbackEnabled: true,
        codexOutboundFallbackTargets: [
          { provider: "anthropic", model: UNFORGEABLE_TRIGGER_MODEL },
        ],
        codexOutboundFallbackModelMappings: [],
        fallbackChain: [
          {
            provider: "codex",
            model: "gpt-5.6-terra",
            reasoningEffort: "low",
          },
        ],
      });
      response = await sendCodex(codexFixtureBody());
      body = await response.json();
      await waitForProxyIdle();
      await flushAll();
    } finally {
      logger.always = originalAlways;
    }
    assert.equal(
      alwaysLines.some((line) => line.includes("fallback → codex")),
      false,
      "the inner Anthropic-loopback leg's own fallback plan must never contain a " +
        "codex entry -- if it did, claudeProxyRoutes would have logged " +
        "'fallback → codex/...' when it walked the (unfiltered) plan, even though " +
        "the empty account pool makes that attempt fail before any upstream call",
    );
    // No target ever succeeds (the anthropic leg is forced to fail, and its
    // own nested Codex fallback has no accounts either), so this must land
    // byte-identical to the flag-off / no-accounts response in scenario A --
    // not a 502 wrapping the anthropic failure, and not a hang.
    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      error: {
        type: "proxy_error",
        message:
          "No Codex accounts configured. Run `neurolink auth login codex`.",
      },
    });
    // The account's own same-account transient-retry policy means one
    // dispatch attempt can still cost several upstream calls, so the
    // count that actually distinguishes "one dispatch" from "the inner
    // leg re-entered the dispatcher and made a second one" is the number
    // of loopback /v1/messages requests, not the raw upstream call count.
    const anthropicLoopbackFinals = received.filter(
      (r) => r.kind === "request_final" && r.body.path === "/v1/messages",
    ).length;
    assert.equal(
      anthropicLoopbackFinals,
      1,
      "exactly one /v1/messages loopback dispatch -- a broken guard would let the " +
        "inner Codex leg re-enter the dispatcher and produce a second one",
    );
    assert.ok(
      anthropicUpstreamCalls > 0,
      "the single dispatch attempt must have actually reached the anthropic upstream",
    );
    assert.equal(
      codexUpstreamCalls,
      0,
      "neither the outer nor the inner nested Codex leg had any account to reach the upstream with",
    );
    console.log(
      "PASS re-entry guard: an inner fallback-chain Codex leg cannot re-trigger outbound dispatch",
    );
  }

  // --- Scenario K: metric label continuity. `origin` is added to the token
  // metric label set ONLY for the codex-fallback origin; every native series
  // keeps its exact pre-feature {model, account} label set, so no existing
  // Prometheus series restarts and flag-off output stays byte-identical. ---
  {
    const collected = await metricReader.collect();
    const series: Array<Record<string, unknown>> = [];
    for (const scope of collected.resourceMetrics.scopeMetrics) {
      for (const metric of scope.metrics) {
        if (metric.descriptor.name === "proxy_tokens_input") {
          for (const point of metric.dataPoints) {
            series.push({ ...point.attributes });
          }
        }
      }
    }
    assert.ok(
      series.every((labels) => labels.origin !== "native"),
      "the default native origin must be omitted from the label set, never emitted as a value",
    );
    const native = series.filter((labels) => !("origin" in labels));
    const fallback = series.filter((labels) => "origin" in labels);
    // Positive controls: both kinds of series must actually exist in this run,
    // otherwise the two assertions below would pass while measuring nothing.
    assert.ok(
      native.length > 0,
      "the run must have produced at least one native token series",
    );
    assert.ok(
      fallback.length > 0,
      "the run must have produced at least one codex-fallback token series",
    );
    assert.ok(
      native.every(
        (labels) => Object.keys(labels).sort().join(",") === "account,model",
      ),
      "a native token series must keep exactly the pre-feature model+account label set",
    );
    assert.ok(
      fallback.every((labels) => labels.origin === "codex-fallback"),
      "the origin label may only ever carry the codex-fallback value",
    );
    console.log(
      "PASS token metrics: origin label appears only on codex-fallback series; native series are unchanged",
    );
  }

  // --- The fallback response body is pulled one frame at a time. ---
  {
    const envelope = { status: "completed" } as CodexResponseEnvelope;
    let produced = 0;
    const frames = (async function* () {
      for (let i = 0; i < 50; i++) {
        produced++;
        yield `frame ${i}\n`;
      }
      return envelope;
    })();
    const response = codexRouteTestHooks.wrapCodexOutboundResponseStream(
      { frames, cancel: async () => undefined },
      {},
      () => undefined,
    );
    const reader = response.body!.getReader();
    await reader.read();
    await delay(20);
    assert.ok(
      produced <= 3,
      `a client that read one frame must not drain the upstream (produced ${produced} of 50)`,
    );
    await reader.cancel();
    console.log(
      "PASS fallback stream: frames are pulled at the client's pace, not drained up front",
    );
  }

  // --- A read that settles after a client disconnect records `cancelled`. ---
  {
    const envelope = { status: "completed" } as CodexResponseEnvelope;
    let releaseUpstream: () => void = () => undefined;
    const upstreamEnded = new Promise<void>((resolve) => {
      releaseUpstream = resolve;
    });
    const frames = (async function* () {
      yield "frame 0\n";
      await upstreamEnded;
      return envelope;
    })();
    const outcomes: string[] = [];
    const response = codexRouteTestHooks.wrapCodexOutboundResponseStream(
      {
        frames,
        // Cancelling ends the pending upstream read first, and only then
        // finishes its own cleanup, as a real reader cancel does.
        cancel: async () => {
          releaseUpstream();
          await delay(10);
        },
      },
      {},
      (result) => {
        outcomes.push(result.kind);
      },
    );
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    await delay(20);
    assert.deepEqual(
      outcomes,
      ["cancelled"],
      "a client disconnect must settle as cancelled (499), never as a stream error (502)",
    );
    console.log(
      "PASS fallback stream: a client disconnect settles as cancelled, not as a stream error",
    );
  }

  console.log(
    "PASS test/continuous-test-suite-proxy-codex-outbound-fallback.ts: all scenarios",
  );
} finally {
  logs.initRequestLogger(false);
  await otel.shutdownProxyOtelLogs();
  await tracerProvider.shutdown();
  await meterProvider.shutdown();
  trace.disable();
  metrics.disable();
  context.disable();
  propagation.disable();
  globalThis.fetch = originalFetch;
  ProviderHealthChecker.checkFallbackProviderAvailability =
    originalAvailability;
  setVertexAccessTokenProviderForTests(undefined);
  await tokenStore.clearTokens(CODEX_ACCOUNT_KEY);
  await tokenStore.clearTokens(ANTHROPIC_ACCOUNT_KEY);
  await clearAccountCooldown(CODEX_ACCOUNT_KEY);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dir, { recursive: true, force: true });
}
