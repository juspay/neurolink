/** Deterministic audit fixtures for every shipped generation door and auxiliary
 * validation path. One isolated source graph, temp HOME, fake provider only.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { appendFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
const repo = process.cwd();
await import(repo + "/test/helpers/proxyTestIsolation.ts");
for (const n of Object.keys(process.env)) {
  if (n.startsWith("OTEL_")) {
    delete process.env[n];
  }
}
process.env.NEUROLINK_PROXY_LOG_SINK = "disk";
const { metrics } = await import("@opentelemetry/api");
const { MeterProvider, MetricReader } =
  await import("@opentelemetry/sdk-metrics");
class FixtureMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}
const metricReader = new FixtureMetricReader();
const meterProvider = new MeterProvider({ readers: [metricReader] });
metrics.setGlobalMeterProvider(meterProvider);
async function metricTotals(): Promise<Record<string, number>> {
  const collected = await metricReader.collect();
  const totals: Record<string, number> = {};
  for (const scope of collected.resourceMetrics.scopeMetrics) {
    for (const metric of scope.metrics) {
      totals[metric.descriptor.name] = metric.dataPoints.reduce(
        (sum, point) =>
          sum +
          (typeof point.value === "number" ? point.value : point.value.count),
        0,
      );
    }
  }
  return totals;
}
const { createProxyStartApp } = await import(
  repo + "/src/cli/commands/proxy.ts"
);
const { ModelRouter } = await import(repo + "/src/lib/proxy/modelRouter.ts");
const { tokenStore } = await import(repo + "/src/lib/auth/tokenStore.ts");
const logger = await import(repo + "/src/lib/proxy/requestLogger.ts");
const lifecycle = await import(repo + "/src/lib/proxy/proxyLifecycle.ts");
const { __bodyCaptureWorkerTestHooks } = await import(
  repo + "/src/lib/proxy/bodyCaptureWorker.ts"
);
await __bodyCaptureWorkerTestHooks.reset(
  new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
);
const activity = await import(repo + "/src/lib/proxy/proxyActivity.ts");
const usageStats = await import(repo + "/src/lib/proxy/usageStats.ts");
const originalFetch = globalThis.fetch;
let upstreamCalls = 0;
let sdkCalls = 0;
let failNativeTransport = false;
let lastSdkTools: unknown;
let publicLoopbackCalls = 0;
let loopbackHeaders = new Headers();
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin === "http://127.0.0.1:61240") {
    publicLoopbackCalls++;
    throw new Error(
      "Public listener switched to a different worker generation",
    );
  }
  if (
    url.hostname === "api.anthropic.com" &&
    url.pathname.endsWith("/messages")
  ) {
    upstreamCalls++;
    if (failNativeTransport) {
      throw new TypeError("fetch failed", {
        cause: Object.assign(new Error("fixture reset"), {
          code: "ECONNRESET",
        }),
      });
    }
    if (JSON.parse(String(init?.body)).stream) {
      const frame = (type: string, data: Record<string, unknown> = {}) =>
        `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
      return new Response(
        frame("message_start", {
          message: {
            id: "fixture",
            model: "claude-sonnet-5",
            role: "assistant",
            type: "message",
            content: [],
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        }) +
          frame("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: "fixture" },
          }) +
          frame("message_delta", {
            delta: { stop_reason: "end_turn" },
            usage: { output_tokens: 3 },
          }) +
          frame("message_stop"),
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "fixture",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5",
        content: [{ type: "text", text: "fixture output" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 3 },
      }),
      { headers: { "content-type": "application/json" } },
    );
  }
  return new Response("{}", { status: 404 });
};
await tokenStore.saveTokens("anthropic:audit@example.test", {
  accessToken: "isolated-fixture",
  tokenType: "Bearer",
  expiresAt: Date.now() + 3600000,
});
const router = new ModelRouter({
  modelMappings: [
    { from: "bridge-alias", to: "claude-sonnet-5", provider: "anthropic" },
    { from: "translated-alias", to: "actual-model", provider: "openai" },
    { from: "bridge-sdk-alias", to: "claude-sdk-alias", provider: "anthropic" },
    { from: "claude-sdk-alias", to: "sdk-unattributed", provider: "openai" },
    { from: "large-translated-alias", to: "large-model", provider: "openai" },
    {
      from: "partial-usage-alias",
      to: "partial-usage-model",
      provider: "openai",
    },
  ],
  fallbackChain: [],
  autoFallback: false,
});
const {
  app,
  readiness,
}: { app: import("hono").Hono; readiness: { drainingForUpdate: boolean } } =
  await createProxyStartApp({
    neurolink: {
      getToolRegistry: () => ({}),
      stream: async (options: { model?: string; tools?: unknown }) => {
        sdkCalls++;
        lastSdkTools = options.tools;
        return {
          stream: (async function* () {
            yield {
              content:
                options.model === "large-model"
                  ? "x".repeat(1100000)
                  : "fixture output",
            };
          })(),
          model:
            options.model === "sdk-unattributed"
              ? undefined
              : options.model === "partial-usage-model"
                ? "gpt-4o"
                : "actual-model",
          provider: "openai",
          usage: {
            inputTokens: 10,
            outputTokens:
              options.model === "partial-usage-model" ? undefined : 3,
            reasoningTokens: 2,
            cachedInputTokens: 4,
          },
          finishReason: "stop",
        };
      },
    },
    modelRouter: router,
    strategy: "fill-first",
    passthrough: false,
    port: 61240,
    host: "127.0.0.1",
    proxyConfig: null,
    primaryAccountKey: undefined,
    accountAllowlist: new Set(["anthropic:audit@example.test"]),
  });
// Observe the real same-worker dispatch. An attempted public loopback above
// represents a supervisor generation switch and is forbidden by this test.
const originalApplicationFetch = app.fetch;
app.fetch = (request, ...args) => {
  if (request.headers.has("x-neurolink-internal-request")) {
    loopbackHeaders = new Headers(request.headers);
    const previous = readiness.drainingForUpdate;
    readiness.drainingForUpdate = true;
    return Promise.resolve(originalApplicationFetch(request, ...args)).finally(
      () => {
        readiness.drainingForUpdate = previous;
      },
    );
  }
  return originalApplicationFetch(request, ...args);
};
let parentErrorRequestId: string | undefined;
let parentErrorCapability:
  | ReturnType<typeof activity.registerInternalProxyRequest>
  | undefined;
let parentErrorReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
app.get("/v1/accounting-parent-error", () => {
  assert.ok(
    parentErrorRequestId,
    "parent error fixture needs its admitted identity",
  );
  parentErrorCapability =
    activity.registerInternalProxyRequest(parentErrorRequestId);
  // A handler-owned reader makes response tracking throw before it can install
  // its cleanup callback. This exercises the parent's actual error path.
  const response = new Response("fixture locked response");
  parentErrorReader = response.body!.getReader();
  return response;
});
const cases: Array<[string, string, Record<string, unknown> | string | null]> =
  [
    ["claude-invalid-json", "/v1/messages", "{"],
    ["openai-invalid-json", "/v1/chat/completions", "{"],
    ["codex-invalid-json", "/backend-api/codex/responses", "{"],
    ["gemini-invalid-json", "/v1beta/models/gemini-test:generateContent", "{"],
    ["claude-empty", "/v1/messages", {}],
    ["openai-empty", "/v1/chat/completions", {}],
    ["codex-empty", "/backend-api/codex/responses", {}],
    ["gemini-empty", "/v1beta/models/gemini-test:generateContent", {}],
    [
      "claude-translation-json",
      "/v1/messages",
      {
        model: "translated-alias",
        max_tokens: 32,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-translation-json",
      "/v1/chat/completions",
      {
        model: "translated-alias",
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "gemini-translation-json",
      "/v1beta/models/gemini-test:generateContent",
      { contents: [{ role: "user", parts: [{ text: "fixture" }] }] },
    ],
    [
      "openai-anthropic-bridge",
      "/v1/chat/completions",
      {
        model: "bridge-alias",
        stream: false,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-anthropic-bridge-cancel",
      "/v1/chat/completions",
      {
        model: "bridge-alias",
        stream: true,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-anthropic-bridge-sdk-unattributed",
      "/v1/chat/completions",
      {
        model: "bridge-sdk-alias",
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "claude-translation-stream",
      "/v1/messages",
      {
        model: "translated-alias",
        stream: true,
        max_tokens: 32,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-translation-stream",
      "/v1/chat/completions",
      {
        model: "translated-alias",
        stream: true,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "gemini-translation-stream",
      "/v1beta/models/gemini-test:streamGenerateContent",
      { contents: [{ role: "user", parts: [{ text: "fixture" }] }] },
    ],
    [
      "openai-translation-large",
      "/v1/chat/completions",
      {
        model: "large-translated-alias",
        stream: true,
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-translation-selected-tools",
      "/v1/chat/completions",
      {
        model: "translated-alias",
        tool_choice: { type: "function", function: { name: "forced_tool" } },
        tools: [
          "allowed_tool",
          "forced_tool",
          "history_tool",
          "dropped_tool",
        ].map((name) => ({
          type: "function",
          function: {
            name,
            description: name,
            parameters: { type: "object", properties: {} },
          },
        })),
        messages: [
          { role: "user", content: "earlier" },
          {
            role: "assistant",
            tool_calls: [
              {
                id: "history-call",
                type: "function",
                function: { name: "history_tool", arguments: "{}" },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: "history-call",
            content: "history result",
          },
          { role: "user", content: "fixture" },
        ],
      },
    ],
    [
      "openai-translation-partial-usage",
      "/v1/chat/completions",
      {
        model: "partial-usage-alias",
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    ...["budget", "context"].flatMap<
      [string, string, Record<string, unknown> | null]
    >((reason) => [
      [
        `${reason}-claude-stream-denied`,
        "/v1/messages",
        {
          model: "translated-alias",
          stream: true,
          max_tokens: 32,
          messages: [{ role: "user", content: "fixture" }],
        },
      ],
      [
        `${reason}-openai-stream-denied`,
        "/v1/chat/completions",
        {
          model: "translated-alias",
          stream: true,
          messages: [{ role: "user", content: "fixture" }],
        },
      ],
      [
        `${reason}-gemini-stream-denied`,
        "/v1beta/models/gemini-test:streamGenerateContent",
        { contents: [{ role: "user", parts: [{ text: "fixture" }] }] },
      ],
    ]),
    [
      "openai-anthropic-bridge-transport-error",
      "/v1/chat/completions",
      {
        model: "bridge-alias",
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    [
      "openai-anthropic-bridge-admission-error",
      "/v1/chat/completions",
      {
        model: "bridge-alias",
        messages: [{ role: "user", content: "fixture" }],
      },
    ],
    ["accounting-parent-handler-error", "/v1/accounting-parent-error", null],
    ["generic-models", "/v1/models", null],
    ["codex-models", "/backend-api/codex/models", null],
    ["gemini-models", "/v1beta/models", null],
    ["unknown-route", "/v1/unknown", null],
    ["count-tokens-empty", "/v1/messages/count_tokens", {}],
  ];
const results = [];
for (const [name, path, body] of cases) {
  const dir = process.env.HOME + "/" + name;
  mkdirSync(dir);
  logger.initRequestLogger(true, dir);
  const before = upstreamCalls;
  const sdkBefore = sdkCalls;
  failNativeTransport = name.endsWith("-transport-error");
  if (name.startsWith("budget-")) {
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      maxInFlightTokens: 1,
    });
  }
  if (name.endsWith("-partial-usage")) {
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      sessionWindowTokens: 1000000,
    });
  }
  if (name.endsWith("-selected-tools")) {
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      toolAllowlist: ["allowed_tool"],
    });
  }
  if (name.startsWith("context-")) {
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      maxInputTokens: 1,
    });
  }
  if (name === "accounting-parent-handler-error") {
    lifecycle.__proxyLifecycleTestHooks.setAppendFileForTests(
      async (...args: Parameters<typeof appendFile>) => {
        for (const line of String(args[1]).trim().split("\n")) {
          const entry = JSON.parse(line);
          if (entry.event === "request_accepted") {
            parentErrorRequestId = entry.requestId;
          }
        }
        await appendFile(...args);
      },
    );
  }
  if (name.endsWith("-admission-error")) {
    lifecycle.__proxyLifecycleTestHooks.setAppendFileForTests(
      async (...args: Parameters<typeof appendFile>) => {
        const entries = String(args[1])
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        if (
          entries.some(
            (entry) =>
              entry.event === "request_accepted" &&
              activity.getProxyRequestAccounting(entry.requestId)
                ?.accountingScope === "internal",
          )
        ) {
          throw Object.assign(
            new Error("fixture child admission write denied"),
            { code: "EACCES" },
          );
        }
        await appendFile(...args);
      },
    );
  }
  const beforeStats = usageStats.getStats();
  const beforeMetrics = await metricTotals();
  const response = await app.request("http://localhost" + path, {
    method: body === null ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "x-neurolink-session-id": "fixture-session",
      session_id: "fixture-codex-session",
      "session-id": "fixture-client-session",
    },
    ...(body === null
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  let responseText = "";
  if (name === "openai-anthropic-bridge-cancel") {
    await delay(30);
    assert.ok(response.body);
    await response.body.cancel();
  } else {
    responseText = await response.text();
  }
  lifecycle.__proxyLifecycleTestHooks.setAppendFileForTests(appendFile);
  parentErrorCapability?.dispose();
  await parentErrorReader?.cancel();
  delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
  delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
  const deadline = Date.now() + 2000;
  while (
    activity.getProxyActivitySnapshot().activeRequests &&
    Date.now() < deadline
  ) {
    await delay(5);
  }
  await logger.flushRequestLogs();
  await lifecycle.flushProxyLifecycleEvents();
  const read = (prefix: string) =>
    readdirSync(dir)
      .filter((n) =>
        prefix === "request_final"
          ? /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)
          : n.startsWith(prefix),
      )
      .flatMap((n) =>
        readFileSync(dir + "/" + n, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((x) => JSON.parse(x)),
      );
  const finals = read("request_final"),
    life = read("proxy-lifecycle-");
  assert.equal(
    activity.getProxyActivitySnapshot().activeRequests,
    0,
    `${name}: leaked admission`,
  );
  assert.ok(
    life
      .filter(
        (x) =>
          x.event === "request_terminal" &&
          !name.endsWith("-admission-error") &&
          name !== "accounting-parent-handler-error",
      )
      .every((x) => x.telemetryStatus === "complete"),
    `${name}: missing terminal accounting`,
  );
  if (
    name === "openai-anthropic-bridge" ||
    name === "openai-anthropic-bridge-cancel"
  ) {
    assert.equal(upstreamCalls - before, 1);
    assert.equal(
      publicLoopbackCalls,
      0,
      "bridge must stay in its admitted worker generation",
    );
    assert.equal(finals.length, 2);
    const child = finals.find((x) => x.accountingScope === "internal");
    const parent = finals.find((x) => x.accountingScope === "client");
    assert.ok(child);
    assert.ok(parent);
    assert.equal(child.parentRequestId, parent.requestId);
    assert.equal(parent.usageOwnerRequestId, child.requestId);
    const afterStats = usageStats.getStats();
    const afterMetrics = await metricTotals();
    for (const [metric, delta] of Object.entries({
      proxy_requests_total: 1,
      proxy_request_duration_ms: 1,
      proxy_errors_total: name.endsWith("cancel") ? 1 : 0,
      proxy_tokens_input: 10,
      proxy_tokens_output: 3,
    })) {
      assert.equal(
        (afterMetrics[metric] ?? 0) - (beforeMetrics[metric] ?? 0),
        delta,
        `${name}: ${metric} has one owner`,
      );
    }
    assert.equal(
      afterStats.totalRequests - beforeStats.totalRequests,
      1,
      `${name}: exactly one global request`,
    );
    assert.equal(
      afterStats.totalSuccess - beforeStats.totalSuccess,
      name.endsWith("cancel") ? 0 : 1,
    );
    assert.equal(
      afterStats.totalErrors - beforeStats.totalErrors,
      name.endsWith("cancel") ? 1 : 0,
    );
    if (name.endsWith("cancel")) {
      assert.equal(child.responseStatus, 200);
      assert.equal(parent.responseStatus, 499);
    }
    assert.equal(
      finals.reduce((n, x) => n + (x.inputTokens ?? 0), 0),
      10,
    );
    assert.equal(
      finals.reduce((n, x) => n + (x.outputTokens ?? 0), 0),
      3,
    );
    assert.equal(
      loopbackHeaders.get("x-neurolink-session-id"),
      "fixture-session",
    );
    assert.equal(loopbackHeaders.get("session_id"), "fixture-codex-session");
    assert.equal(loopbackHeaders.get("session-id"), "fixture-client-session");
  }
  if (name.endsWith("-admission-error")) {
    const child = finals.find((entry) => entry.accountingScope === "internal");
    const parent = finals.find((entry) => entry.accountingScope === "client");
    assert.equal(response.status, 503);
    assert.equal(
      upstreamCalls - before,
      0,
      "failed admission dispatched upstream",
    );
    assert.equal(
      finals.length,
      2,
      "failed bridge admission lost final ownership",
    );
    assert.ok(child, "failed child lost internal accounting scope");
    assert.ok(parent, "failed bridge lost client accounting scope");
    assert.equal(child.parentRequestId, parent.requestId);
    assert.equal(child.usageOwnerRequestId, child.requestId);
    assert.equal(parent.usageOwnerRequestId, child.requestId);
    assert.equal(parent.errorCode, "PROXY_TELEMETRY_UNAVAILABLE");
    const afterStats = usageStats.getStats();
    assert.equal(afterStats.totalRequests - beforeStats.totalRequests, 1);
    assert.equal(afterStats.totalErrors - beforeStats.totalErrors, 1);
  }
  if (name === "accounting-parent-handler-error") {
    assert.equal(response.status, 502);
    assert.equal(finals.length, 1);
    assert.equal(finals[0].requestId, parentErrorRequestId);
    assert.equal(finals[0].accountingScope, "client");
    assert.equal(
      finals[0].usageOwnerRequestId,
      parentErrorCapability?.requestId,
    );
    assert.equal(finals[0].errorType, "unhandled_proxy_error");
    const afterStats = usageStats.getStats();
    assert.equal(afterStats.totalRequests - beforeStats.totalRequests, 1);
    assert.equal(afterStats.totalErrors - beforeStats.totalErrors, 1);
  }
  // Error finals must keep their ownership until publication, then release the
  // same correlation state that normal and cancelled bridge responses release.
  for (const final of finals) {
    assert.equal(
      activity.getProxyRequestAccounting(final.requestId),
      undefined,
      `${name}: completed request retained accounting`,
    );
    assert.equal(
      activity.getProxyBridgeResult(final.requestId),
      undefined,
      `${name}: completed request retained bridge result`,
    );
  }
  if (name === "openai-anthropic-bridge-sdk-unattributed") {
    const child = finals.find((x) => x.accountingScope === "internal");
    const parent = finals.find((x) => x.accountingScope === "client");
    assert.equal(response.status, 200);
    assert.equal(sdkCalls - sdkBefore, 1);
    assert.equal(upstreamCalls - before, 0);
    assert.ok(child);
    assert.ok(parent);
    assert.equal(child.servingModelStatus, "unavailable");
    assert.equal(child.accountIdentityStatus, "unavailable");
    assert.equal(child.accountKey, "openai:sdk-unattributed");
    assert.equal(parent.servingModelStatus, "unavailable");
    assert.equal(parent.accountIdentityStatus, "unavailable");
  }
  if (name.endsWith("-transport-error")) {
    const parent = finals.find((x) => x.accountingScope === "client");
    const child = finals.find((x) => x.accountingScope === "internal");
    const after = usageStats.getStats();
    assert.equal(response.status, 502);
    assert.equal(upstreamCalls - before, 1);
    assert.equal(finals.length, 2);
    assert.ok(parent);
    assert.ok(child);
    assert.equal(child.errorCode, "ECONNRESET");
    assert.equal(parent.errorCode, "ECONNRESET");
    assert.equal(parent.account, "audit@example.test");
    assert.equal(after.totalRequests - beforeStats.totalRequests, 1);
    assert.equal(after.totalErrors - beforeStats.totalErrors, 1);
    const afterMetrics = await metricTotals();
    for (const metric of [
      "proxy_requests_total",
      "proxy_request_duration_ms",
      "proxy_errors_total",
    ]) {
      assert.equal(
        (afterMetrics[metric] ?? 0) - (beforeMetrics[metric] ?? 0),
        1,
        `${metric}: bridge error has one client owner`,
      );
    }
  }
  if (name.endsWith("-partial-usage")) {
    assert.equal(finals[0].model, "gpt-4o");
    assert.equal(finals[0].inputTokens, 10);
    assert.equal(finals[0].outputTokens, undefined);
    assert.equal(finals[0].tokenBudget.settlement, "estimate_retained");
    const afterMetrics = await metricTotals();
    assert.equal(
      (afterMetrics.proxy_requests_total ?? 0) -
        (beforeMetrics.proxy_requests_total ?? 0),
      1,
    );
    assert.equal(
      (afterMetrics.proxy_request_duration_ms ?? 0) -
        (beforeMetrics.proxy_request_duration_ms ?? 0),
      1,
    );
    for (const metric of [
      "proxy_tokens_input",
      "proxy_tokens_output",
      "proxy_cost_usd_total",
    ]) {
      assert.equal(
        (afterMetrics[metric] ?? 0) - (beforeMetrics[metric] ?? 0),
        0,
        `partial usage must not invent ${metric}`,
      );
    }
  }
  if (name.endsWith("-stream-denied")) {
    const budget = name.startsWith("budget-");
    assert.equal(
      response.status,
      budget ? 429 : 400,
      `${name}: reject before SSE headers`,
    );
    assert.match(
      response.headers.get("content-type") ?? "",
      /application\/json/,
    );
    const error = JSON.parse(responseText).error;
    const code = budget
      ? "PROXY_TOKEN_BUDGET_EXCEEDED"
      : "proxy_input_budget_exceeded";
    assert.equal(error.retryable, false);
    assert.equal(name.includes("gemini") ? error.reason : error.code, code);
    assert.equal(sdkCalls - sdkBefore, 0, `${name}: no SDK spend`);
    assert.equal(upstreamCalls - before, 0, `${name}: no native spend`);
    assert.equal(finals[0].errorCode, code);
    assert.equal(finals[0].retryable, false);
  }
  if (
    name.includes("translation") ||
    name.includes("bridge") ||
    name.endsWith("-stream-denied")
  ) {
    const captures = read("proxy-debug-");
    const parent = finals.find((x) => x.accountingScope !== "internal");
    assert.ok(parent);
    const responses = captures.filter(
      (x) => x.requestId === parent.requestId && x.phase === "client_response",
    );
    assert.equal(
      responses.length,
      1,
      `${name}: one client capture per outcome`,
    );
    const capture = responses[0];
    if (name.endsWith("-large")) {
      assert.ok(
        responseText.includes("x".repeat(1100000)),
        "client receives full output",
      );
      assert.equal(capture.sourceTruncated, true);
      assert.equal(capture.bodyTruncated, true);
      assert.equal(capture.observedBodyBytes, Buffer.byteLength(responseText));
      assert.ok(capture.inputRetainedBytes <= 1024 * 1024);
    } else if (!name.endsWith("-cancel")) {
      const artifact = JSON.parse(
        gunzipSync(readFileSync(capture.bodyPath)).toString(),
      );
      if (response.headers.get("content-type")?.includes("application/json")) {
        assert.deepEqual(JSON.parse(artifact.body), JSON.parse(responseText));
      } else {
        assert.ok(artifact.body.includes("fixture output"));
        assert.equal(
          capture.observedBodyBytes,
          Buffer.byteLength(responseText),
        );
      }
    }
    if (name.includes("translation")) {
      const sdkRequests = captures.filter(
        (x) => x.requestId === parent.requestId && x.phase === "sdk_request",
      );
      const sdkResponses = captures.filter(
        (x) => x.requestId === parent.requestId && x.phase === "sdk_response",
      );
      assert.equal(sdkRequests.length, 1);
      assert.equal(sdkResponses.length, 1);
      if (name.endsWith("-selected-tools")) {
        const artifact = JSON.parse(
          gunzipSync(readFileSync(sdkRequests[0].bodyPath)).toString(),
        );
        const captured = JSON.parse(artifact.body);
        const selected = Object.keys(lastSdkTools as object).sort();
        assert.deepEqual(selected, [
          "allowed_tool",
          "forced_tool",
          "history_tool",
        ]);
        assert.deepEqual(Object.keys(captured.tools).sort(), selected);
        assert.equal(captured.tools.dropped_tool, undefined);
      }
      assert.equal(sdkRequests[0].metadata.wireCapture, false);
      assert.equal(sdkResponses[0].metadata.wireCapture, false);
    }
  }
  if (
    response.status >= 400 &&
    !name.endsWith("-transport-error") &&
    !name.endsWith("-admission-error")
  ) {
    assert.equal(finals.length, 1, `${name}: rejection requires final`);
  }
  results.push({
    name,
    path,
    status: response.status,
    upstreamCalls: upstreamCalls - before,
    activeAfter: activity.getProxyActivitySnapshot().activeRequests,
    finals: finals.map((x) =>
      Object.fromEntries(
        [
          "requestId",
          "parentRequestId",
          "traceId",
          "model",
          "requestedModel",
          "provider",
          "accountType",
          "inputTokens",
          "outputTokens",
          "terminalOutcome",
          "responseStatus",
          "clientApp",
          "sessionHash",
        ].map((k) => [k, x[k]]),
      ),
    ),
    admissions: life
      .filter((x) => x.event === "request_accepted")
      .map((x) => ({ requestId: x.requestId, sessionHash: x.sessionHash })),
    terminals: life
      .filter((x) => x.event === "request_terminal")
      .map((x) => ({
        requestId: x.requestId,
        outcome: x.terminalOutcome,
        telemetryStatus: x.telemetryStatus,
      })),
    ...(name === "openai-anthropic-bridge"
      ? {
          loopbackHeaderNames: Array.from(loopbackHeaders.keys()),
          sumFinalInputTokens: finals.reduce(
            (s, x) => s + (x.inputTokens ?? 0),
            0,
          ),
          sumFinalOutputTokens: finals.reduce(
            (s, x) => s + (x.outputTokens ?? 0),
            0,
          ),
        }
      : {}),
  });
  logger.initRequestLogger(false);
  lifecycle.resetProxyLifecycleLoggerForTests();
}
globalThis.fetch = originalFetch;
await tokenStore.clearTokens("anthropic:audit@example.test");
console.log(JSON.stringify(results, null, 2));

await meterProvider.shutdown();
metrics.disable();
