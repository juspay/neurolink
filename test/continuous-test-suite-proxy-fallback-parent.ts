#!/usr/bin/env tsx
/** Determinism exception: exact provider policy/empty-output events and bounded
 * capture overflow require controlled streams and an isolated OTLP receiver. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
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
import { tokenStore } from "../src/lib/auth/tokenStore.js";
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
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses")) {
    upstreamCalls++;
    return new Response(wire, {
      headers: { "content-type": "text/event-stream" },
    });
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
} finally {
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
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(dir, { recursive: true, force: true });
}
