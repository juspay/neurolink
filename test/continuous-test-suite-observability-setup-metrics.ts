#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability setup, configuration and metrics
 *
 * Follow-up proof for PR #2002 (BZ-6924), findings K01, K02, K03 (process-exit
 * flush), K04, K09, K10 (code part), K22 and K34.
 *
 * Every check starts the built package (`dist/index.js`) in a child process,
 * because tracing and metrics are process-wide and terminal: one process can
 * start them once. The children talk to local stand-ins only: a fake
 * OpenAI-compatible server, a stdio MCP fixture, and one in-process receiver
 * that decodes the OTLP/HTTP JSON the package posts (traces and metrics to
 * `OTEL_EXPORTER_OTLP_ENDPOINT`, and Langfuse's `/api/public/otel/v1/traces`).
 * No keys and no live calls are needed.
 *
 * Output is one `PROOF <finding> PASS|FAIL <description>` line per check; the
 * process exits non-zero when any check fails.
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-observability-setup-metrics.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
} from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseDotenv } from "dotenv";
import { runCommand, tempDir } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };
type JsonBody = { [key: string]: Json };

const ROOT = process.cwd();
const DIST = pathToFileURL(join(ROOT, "dist/index.js")).href;
const DIST_AI_METRICS = pathToFileURL(
  join(ROOT, "dist/telemetry/aiMetrics.js"),
).href;
const DIST_PROXY_TRACER = pathToFileURL(
  join(ROOT, "dist/proxy/proxyTracer.js"),
).href;
const DIST_CLIENT = pathToFileURL(join(ROOT, "dist/client/index.js")).href;
const MCP_FIXTURE = join(
  ROOT,
  "test/fixtures/mcp-observability-metrics-server.mjs",
);

// ---------------------------------------------------------------------------
// Check runner
// ---------------------------------------------------------------------------

let failures = 0;

async function check(
  id: string,
  description: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
    console.log(`PROOF ${id} PASS ${description}`);
  } catch (error) {
    failures++;
    console.log(`PROOF ${id} FAIL ${description}`);
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`# reason: ${reason.replace(/\s+/g, " ").slice(0, 600)}`);
  }
}

function expect(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function once<T>(run: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= run());
}

// ---------------------------------------------------------------------------
// Local stand-ins
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<JsonBody> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

const openai = await (async () => {
  const server = createServer(async (req, res) => {
    await readBody(req);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-1",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "hello" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 30,
          total_tokens: 150,
        },
      }),
    );
  });
  const port = await listen(server);
  return { baseURL: `http://127.0.0.1:${port}/v1`, close: () => close(server) };
})();

type Hit = {
  path: string;
  authorization?: string;
  headers: IncomingHttpHeaders;
  payload: JsonBody;
};

type Receiver = {
  url: string;
  hits: Hit[];
  close: () => Promise<void>;
};

async function startReceiver(): Promise<Receiver> {
  const hits: Hit[] = [];
  const server = createServer(async (req, res) => {
    const payload = await readBody(req);
    hits.push({
      path: req.url ?? "",
      authorization: req.headers.authorization,
      headers: req.headers,
      payload,
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    close: () => close(server),
  };
}

type OtlpAttribute = { key: string; value: JsonBody };

function decodeValue(value: JsonBody): Json | undefined {
  if (value.arrayValue) {
    const values = (value.arrayValue as { values?: JsonBody[] }).values;
    return (values ?? []).map(decodeValue);
  }
  if (value.intValue !== undefined) {
    return Number(value.intValue);
  }
  return value.stringValue ?? value.doubleValue ?? value.boolValue;
}

function decodeAttributes(
  attributes: OtlpAttribute[] | undefined,
): Record<string, Json> {
  return Object.fromEntries(
    (attributes ?? []).map((entry) => [entry.key, decodeValue(entry.value)]),
  );
}

type DecodedSpan = { name: string; attributes: Record<string, Json> };

function spansOf(hits: Hit[], path: (value: string) => boolean): DecodedSpan[] {
  type RawSpan = { name: string; attributes?: OtlpAttribute[] };
  return hits
    .filter((hit) => path(hit.path))
    .flatMap(
      (hit) =>
        (hit.payload.resourceSpans ?? []) as {
          scopeSpans: { spans: RawSpan[] }[];
        }[],
    )
    .flatMap((resource) => resource.scopeSpans)
    .flatMap((scope) => scope.spans)
    .map((span) => ({
      name: span.name,
      attributes: decodeAttributes(span.attributes),
    }));
}

function resourceOf(hits: Hit[], path: string): Record<string, Json> {
  const hit = hits.find((entry) => entry.path === path);
  expect(hit !== undefined, `no export reached ${path}`);
  const payload = hit.payload;
  const resource = (
    (payload.resourceSpans ?? payload.resourceMetrics ?? []) as {
      resource?: { attributes?: OtlpAttribute[] };
    }[]
  )[0]?.resource;
  return decodeAttributes(resource?.attributes);
}

type MetricPoint = {
  attributes: Record<string, Json>;
  value?: number;
  count?: number;
  sum?: number;
};
type Metric = {
  name: string;
  description: string;
  unit: string;
  kind: "sum" | "histogram" | "gauge";
  monotonic: boolean;
  points: MetricPoint[];
};

/** Cumulative metrics: the newest export of each series wins. */
function metricsOf(hits: Hit[]): Map<string, Metric> {
  type RawPoint = {
    attributes?: OtlpAttribute[];
    asInt?: string | number;
    asDouble?: number;
    count?: string | number;
    sum?: number;
  };
  type RawMetric = {
    name: string;
    description?: string;
    unit?: string;
    sum?: { dataPoints: RawPoint[]; isMonotonic?: boolean };
    histogram?: { dataPoints: RawPoint[] };
    gauge?: { dataPoints: RawPoint[] };
  };
  const found = new Map<string, Metric>();
  const series = new Map<string, Map<string, MetricPoint>>();
  for (const hit of hits.filter((entry) =>
    entry.path.endsWith("/v1/metrics"),
  )) {
    const resources = (hit.payload.resourceMetrics ?? []) as {
      scopeMetrics: { metrics: RawMetric[] }[];
    }[];
    for (const raw of resources
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)) {
      const kind = raw.sum ? "sum" : raw.histogram ? "histogram" : "gauge";
      const points = (raw.sum ?? raw.histogram ?? raw.gauge)?.dataPoints ?? [];
      const bySeries = series.get(raw.name) ?? new Map<string, MetricPoint>();
      for (const point of points) {
        const attributes = decodeAttributes(point.attributes);
        bySeries.set(JSON.stringify(Object.entries(attributes).sort()), {
          attributes,
          value:
            point.asDouble ??
            (point.asInt !== undefined ? Number(point.asInt) : undefined),
          count: point.count !== undefined ? Number(point.count) : undefined,
          sum: point.sum,
        });
      }
      series.set(raw.name, bySeries);
      found.set(raw.name, {
        name: raw.name,
        description: raw.description ?? "",
        unit: raw.unit ?? "",
        kind,
        monotonic: raw.sum?.isMonotonic === true,
        points: [...bySeries.values()],
      });
    }
  }
  return found;
}

function metricNamed(metrics: Map<string, Metric>, name: string): Metric {
  const metric = metrics.get(name);
  expect(
    metric !== undefined,
    `metric ${name} was not exported; got: ${[...metrics.keys()].join(", ") || "(none)"}`,
  );
  return metric;
}

function pointWith(metric: Metric, labels: Record<string, Json>): MetricPoint {
  const point = metric.points.find(
    (candidate) =>
      JSON.stringify(Object.entries(candidate.attributes).sort()) ===
      JSON.stringify(Object.entries(labels).sort()),
  );
  expect(
    point !== undefined,
    `${metric.name} has no series with exactly ${JSON.stringify(labels)}; got ${JSON.stringify(metric.points.map((entry) => entry.attributes))}`,
  );
  return point;
}

// ---------------------------------------------------------------------------
// Child scenarios
// ---------------------------------------------------------------------------

const SCENARIO = join(tempDir("neurolink-obs-setup-metrics-"), "scenario.mjs");
const HOOK = join(tempDir("neurolink-obs-setup-hook-"), "hook.mjs");

writeFileSync(
  HOOK,
  `
import { registerHooks } from "node:module";
globalThis.__resolved = [];
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    globalThis.__resolved.push(result.url);
    return result;
  },
});
`,
);

writeFileSync(
  SCENARIO,
  `
const env = process.env;
const scenario = env.OBS_SCENARIO;
const result = {};
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const chat = (extra = {}) => ({ input: { text: "hi" }, provider: "openai", model: "gpt-4o-mini", credentials, disableTools: true, disableInternalFallback: true, ...extra });
const heavyLoads = () => [...new Set(globalThis.__resolved.filter((url) => /@opentelemetry\\/(sdk-trace-node|sdk-metrics|exporter-)/.test(url)))];

// The host side is set up before the package loads, as an application would.
let hostMeter;
if (scenario === "host-meter") {
  const api = await import(${JSON.stringify(import.meta.resolve("@opentelemetry/api"))});
  const sdk = await import(${JSON.stringify(import.meta.resolve("@opentelemetry/sdk-metrics"))});
  const exporter = new sdk.InMemoryMetricExporter(sdk.AggregationTemporality.CUMULATIVE);
  const reader = new sdk.PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 3600000 });
  api.metrics.setGlobalMeterProvider(new sdk.MeterProvider({ readers: [reader] }));
  api.metrics.getMeter("control").createCounter("control_total").add(1);
  hostMeter = { exporter, reader };
}
if (env.OBS_HOST_TRACER === "1") {
  const { NodeTracerProvider } = await import(${JSON.stringify(import.meta.resolve("@opentelemetry/sdk-trace-node"))});
  new NodeTracerProvider().register();
}

if (scenario === "k34-client") {
  await import(env.OBS_TARGET);
  console.log("RESULT " + JSON.stringify({ heavy: heavyLoads() }));
  process.exit(0);
}

const dist = await import(${JSON.stringify(DIST)});
const finish = async (flush = true) => {
  if (flush) {
    await dist.flushOpenTelemetry().catch((error) => { result.flushError = String(error); });
  }
  result.status = dist.getLangfuseHealthStatus();
  await dist.shutdownOpenTelemetry();
  console.log("RESULT " + JSON.stringify(result));
  process.exit(0);
};
const make = (observability) => new dist.NeuroLink(observability ? { observability } : undefined);

if (scenario === "k34-root") {
  console.log("RESULT " + JSON.stringify({ heavy: heavyLoads() }));
  process.exit(0);
} else if (scenario === "generate" || scenario === "host-otlp") {
  const nl = make(env.OBS_CONFIG ? JSON.parse(env.OBS_CONFIG) : undefined);
  result.content = (await nl.generate(chat())).content;
  await finish();
} else if (scenario === "host-meter") {
  const nl = make();
  result.content = (await nl.generate(chat())).content;
  await hostMeter.reader.forceFlush();
  result.names = hostMeter.exporter.getMetrics().flatMap((batch) => batch.scopeMetrics).flatMap((scope) => scope.metrics).map((metric) => metric.descriptor.name);
  await finish(false);
} else if (scenario === "tts") {
  const nl = make();
  const out = await nl.generate(chat({ tts: { enabled: true, useAiResponse: false, provider: "google-ai" } }));
  result.tts = out.ttsMetadata;
  await finish();
} else if (scenario === "mcp") {
  const manager = new dist.ExternalServerManager({});
  const id = "obs-metrics-fixture";
  const added = await manager.addServer(id, { id, name: id, description: "fixture", transport: "stdio", status: "initializing", tools: [], command: process.execPath, args: [env.OBS_MCP_FIXTURE] });
  result.added = added.success;
  await manager.executeTool(id, "echo", {});
  await manager.executeTool(id, "fail", {});
  try { await manager.executeTool(id, "no_such_tool", {}); } catch { result.threw = true; }
  await manager.shutdown();
  await finish();
} else if (scenario === "unfed") {
  const aiMetrics = await import(${JSON.stringify(DIST_AI_METRICS)});
  aiMetrics.recordAIError("openai", new TypeError("provider exploded"));
  aiMetrics.recordConnection("websocket");
  aiMetrics.recordResponseTime("/api/generate", "POST", 250);
  await finish();
} else if (scenario === "direct-exit") {
  const provider = await dist.AIProviderFactory.createProvider("openai", "gpt-4o-mini", false, undefined, undefined, credentials);
  await provider.generate({ input: { text: "hi" }, disableTools: true });
  if (env.OBS_FLUSH === "1") {
    await dist.flushOpenTelemetry();
  }
  console.log("RESULT " + JSON.stringify({ status: dist.getLangfuseHealthStatus() }));
} else if (scenario === "proxy") {
  const { ProxyTracer } = await import(${JSON.stringify(DIST_PROXY_TRACER)});
  const tracer = ProxyTracer.startRequest({ requestId: "r-1", method: "POST", path: "/v1/messages", model: "claude-sonnet-4-5", stream: false, toolCount: 0 });
  tracer.setUsage({ inputTokens: 1000, outputTokens: 200, cacheCreationTokens: 0, cacheReadTokens: 0 });
  tracer.end(200, 1234);
  await finish();
} else if (scenario === "two-instances") {
  const base = { baseUrl: env.OBS_INGEST_URL };
  const first = make({ langfuse: { ...base, publicKey: "pk-first", secretKey: "sk-first" } });
  const second = env.OBS_SAME === "1"
    ? make({ langfuse: { ...base, publicKey: "pk-first", secretKey: "sk-first" } })
    : make({ langfuse: { ...base, publicKey: "pk-second", secretKey: "sk-second", mask: ({ data }) => data } });
  await first.generate(chat());
  await second.generate(chat());
  await finish();
}
`,
);

type Run = {
  exitCode: number | null;
  output: string;
  result: JsonBody;
};

async function runScenario(
  scenario: string,
  env: Record<string, string>,
  nodeArgs: string[] = [],
): Promise<Run> {
  const run = await runCommand(process.execPath, [...nodeArgs, SCENARIO], {
    cwd: ROOT,
    timeoutMs: 60_000,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DOTENV_CONFIG_PATH: "/dev/null",
      NEUROLINK_SKIP_MCP: "true",
      // The logger prints nothing below error unless debug mode is on; the
      // level then keeps debug lines out, so a warn line is what shows.
      NEUROLINK_DEBUG: "true",
      NEUROLINK_LOG_LEVEL: "warn",
      OBS_SCENARIO: scenario,
      OBS_OPENAI_URL: openai.baseURL,
      OBS_MCP_FIXTURE: MCP_FIXTURE,
      ...env,
    },
  });
  const output = `${run.stdout}\n${run.stderr}`;
  const line = run.stdout
    .split("\n")
    .find((entry) => entry.startsWith("RESULT "));
  let result: JsonBody = {};
  if (line !== undefined) {
    result = JSON.parse(line.slice("RESULT ".length));
  }
  expect(
    run.exitCode === 0 && line !== undefined,
    `scenario ${scenario} did not finish cleanly (exit ${run.exitCode}): ${output.slice(-500)}`,
  );
  return { exitCode: run.exitCode, output, result };
}

type Observed = { run: Run; hits: Hit[] };

/** Starts a receiver, runs one scenario against it and returns what arrived. */
async function observe(
  scenario: string,
  env: (receiver: Receiver) => Record<string, string>,
  nodeArgs: string[] = [],
): Promise<Observed> {
  const receiver = await startReceiver();
  try {
    const run = await runScenario(scenario, env(receiver), nodeArgs);
    return { run, hits: receiver.hits };
  } finally {
    await receiver.close();
  }
}

const KEYS = {
  LANGFUSE_PUBLIC_KEY: "pk-env",
  LANGFUSE_SECRET_KEY: "sk-env",
};
const otlp = (receiver: Receiver): Record<string, string> => ({
  OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
});
const langfuse = (receiver: Receiver): Record<string, string> => ({
  ...KEYS,
  LANGFUSE_BASE_URL: receiver.url,
});
const LANGFUSE_PATH = "/api/public/otel/v1/traces";
const isLangfuse = (path: string): boolean => path === LANGFUSE_PATH;
const isOtlpTraces = (path: string): boolean => path === "/v1/traces";

function status(run: Run): { hasProcessor: boolean } {
  return run.result.status as { hasProcessor: boolean };
}

// ---------------------------------------------------------------------------
// K01: the OTLP metrics TelemetryService used to provide
// ---------------------------------------------------------------------------

const generated = once(() => observe("generate", (receiver) => otlp(receiver)));

const LABELS = { provider: "openai", model: "gpt-4o-mini" };

await check(
  "K01",
  "generate() exports ai_requests_total as a monotonic counter labelled provider and model",
  async () => {
    const { hits } = await generated();
    const metric = metricNamed(metricsOf(hits), "ai_requests_total");
    expect(
      metric.kind === "sum" && metric.monotonic,
      "ai_requests_total is not a monotonic counter",
    );
    expect(
      metric.description === "Total number of AI requests",
      `description was ${metric.description}`,
    );
    expect(pointWith(metric, LABELS).value === 1, "expected one request");
  },
);

await check(
  "K01",
  "generate() exports ai_request_duration_ms as a histogram with one recording",
  async () => {
    const { hits } = await generated();
    const metric = metricNamed(metricsOf(hits), "ai_request_duration_ms");
    expect(metric.kind === "histogram", "not a histogram");
    expect(
      metric.description === "AI request duration in milliseconds",
      `description was ${metric.description}`,
    );
    const point = pointWith(metric, LABELS);
    expect(point.count === 1, `count was ${point.count}`);
    expect((point.sum ?? -1) >= 0, "duration sum missing");
  },
);

await check(
  "K01",
  "generate() exports ai_tokens_used_total with the total tokens of the call",
  async () => {
    const { hits } = await generated();
    const metric = metricNamed(metricsOf(hits), "ai_tokens_used_total");
    expect(
      metric.description === "Total number of AI tokens used",
      `description was ${metric.description}`,
    );
    const point = pointWith(metric, LABELS);
    expect(point.value === 150, `tokens were ${point.value}`);
  },
);

await check(
  "K01",
  "generate() exports ai_cost_usd_total for a priced model",
  async () => {
    const { hits } = await generated();
    const metric = metricNamed(metricsOf(hits), "ai_cost_usd_total");
    expect(
      metric.description === "Total accumulated AI cost in USD",
      `description was ${metric.description}`,
    );
    const point = pointWith(metric, LABELS);
    expect(
      (point.value ?? 0) > 0 && (point.value ?? 1) < 0.01,
      `cost was ${point.value}`,
    );
  },
);

await check(
  "K01",
  "the restored metrics carry no unit, as TelemetryService declared none",
  async () => {
    const { hits } = await generated();
    const metrics = metricsOf(hits);
    for (const name of [
      "ai_requests_total",
      "ai_request_duration_ms",
      "ai_tokens_used_total",
      "ai_cost_usd_total",
    ]) {
      expect(metricNamed(metrics, name).unit === "", `${name} declares a unit`);
    }
  },
);

const mcp = once(() => observe("mcp", (receiver) => otlp(receiver)));

await check(
  "K01",
  "an external MCP tool call exports mcp_tool_calls_total with tool, success and duration_bucket",
  async () => {
    const { run, hits } = await mcp();
    expect(run.result.added === true, "the MCP fixture did not connect");
    const metric = metricNamed(metricsOf(hits), "mcp_tool_calls_total");
    expect(
      metric.kind === "sum" && metric.monotonic,
      "mcp_tool_calls_total is not a monotonic counter",
    );
    expect(
      metric.description === "Total number of MCP tool calls",
      `description was ${metric.description}`,
    );
    const buckets = ["fast", "medium", "slow", "very_slow"];
    for (const [tool, success] of [
      ["echo", "true"],
      ["fail", "false"],
    ] as const) {
      const point = metric.points.find(
        (candidate) =>
          candidate.attributes.tool === tool &&
          candidate.attributes.success === success,
      );
      expect(point !== undefined, `no series for ${tool} success=${success}`);
      expect(point.value === 1, `${tool} was counted ${point.value} times`);
      expect(
        Object.keys(point.attributes).sort().join() ===
          "duration_bucket,success,tool" &&
          buckets.includes(String(point.attributes.duration_bucket)),
        `unexpected labels ${JSON.stringify(point.attributes)}`,
      );
    }
  },
);

await check(
  "K01",
  "an MCP call that throws is counted with success=false",
  async () => {
    const { run, hits } = await mcp();
    expect(run.result.threw === true, "the unknown tool did not throw");
    const metric = metricNamed(metricsOf(hits), "mcp_tool_calls_total");
    const point = metric.points.find(
      (candidate) =>
        candidate.attributes.tool === "no_such_tool" &&
        candidate.attributes.success === "false",
    );
    expect(point !== undefined, "the failed call was not counted");
  },
);

const tts = once(() => observe("tts", (receiver) => otlp(receiver)));

await check(
  "K01",
  "a failed TTS synthesis exports the tts failure counter and latency histogram",
  async () => {
    const { run, hits } = await tts();
    const meta = run.result.tts as { success?: boolean } | undefined;
    expect(meta?.success === false, "the synthesis did not fail");
    const metrics = metricsOf(hits);
    const labels = {
      provider: "google-ai",
      error_code: "TTS_PROVIDER_NOT_SUPPORTED",
      retriable: "false",
    };
    const counter = metricNamed(metrics, "custom_tts_failures");
    expect(counter.kind === "sum", "tts failures are not a counter");
    expect(
      counter.description === "Custom metric: tts_failures",
      `description was ${counter.description}`,
    );
    expect(pointWith(counter, labels).value === 1, "expected one failure");
    const histogram = metricNamed(
      metrics,
      "custom_tts_failure_latency_ms_histogram",
    );
    expect(histogram.kind === "histogram", "latency is not a histogram");
    expect(
      histogram.description === "Custom histogram: tts_failure_latency_ms",
      `description was ${histogram.description}`,
    );
    expect(pointWith(histogram, labels).count === 1, "expected one recording");
  },
);

const proxied = once(() => observe("proxy", otlp));

await check(
  "K01",
  "a proxied request exports the ai metrics for its billing provider, model, tokens and cost",
  async () => {
    const { hits } = await proxied();
    const metrics = metricsOf(hits);
    const labels = { provider: "anthropic", model: "claude-sonnet-4-5" };
    expect(
      pointWith(metricNamed(metrics, "ai_requests_total"), labels).value === 1,
      "request count",
    );
    expect(
      pointWith(metricNamed(metrics, "ai_tokens_used_total"), labels).value ===
        1200,
      "token total",
    );
    const duration = pointWith(
      metricNamed(metrics, "ai_request_duration_ms"),
      labels,
    );
    expect(duration.sum === 1234, `duration was ${duration.sum}`);
    expect(
      (pointWith(metricNamed(metrics, "ai_cost_usd_total"), labels).value ??
        0) > 0,
      "cost missing",
    );
  },
);

const unfed = once(() => observe("unfed", (receiver) => otlp(receiver)));

await check(
  "K01",
  "ai_provider_errors_total, connections_total and response_time_ms exist with their old labels",
  async () => {
    const { hits } = await unfed();
    const metrics = metricsOf(hits);
    const errors = metricNamed(metrics, "ai_provider_errors_total");
    expect(
      errors.description === "Total number of AI provider errors",
      `description was ${errors.description}`,
    );
    expect(
      pointWith(errors, {
        provider: "openai",
        error: "TypeError",
        message: "unspecified",
      }).value === 1,
      "error counter value",
    );
    const connections = metricNamed(metrics, "connections_total");
    expect(
      connections.description === "Total number of connections",
      `description was ${connections.description}`,
    );
    expect(
      pointWith(connections, { connection_type: "websocket" }).value === 1,
      "connection counter value",
    );
    const response = metricNamed(metrics, "response_time_ms");
    expect(response.kind === "histogram", "response time is not a histogram");
    expect(
      response.description === "Response time in milliseconds",
      `description was ${response.description}`,
    );
    expect(
      pointWith(response, {
        endpoint: "/api/generate",
        method: "POST",
        status_bucket: "good",
      }).count === 1,
      "response time recording",
    );
  },
);

const hostMeter = (env: Record<string, string>) =>
  observe("host-meter", () => env);

await check(
  "K01",
  "with no endpoint, flag or host tracer provider, a host meter provider alone records the ai metrics",
  async () => {
    const { run } = await hostMeter({});
    const names = run.result.names as string[];
    expect(names.includes("control_total"), "the host meter recorded nothing");
    expect(
      names.includes("ai_requests_total"),
      "ai_requests_total was not recorded on the registered meter provider",
    );
  },
);

await check(
  "K01",
  "NEUROLINK_TELEMETRY_ENABLED=true records the ai metrics on the host meter provider",
  async () => {
    const { run } = await hostMeter({ NEUROLINK_TELEMETRY_ENABLED: "true" });
    const names = run.result.names as string[];
    for (const name of [
      "ai_requests_total",
      "ai_request_duration_ms",
      "ai_tokens_used_total",
    ]) {
      expect(names.includes(name), `${name} missing: ${names.join(", ")}`);
    }
  },
);

await check(
  "K01",
  "a host tracer provider also records the ai metrics, as before",
  async () => {
    const { run } = await hostMeter({ OBS_HOST_TRACER: "1" });
    const names = run.result.names as string[];
    expect(
      names.includes("ai_requests_total"),
      `ai_requests_total missing: ${names.join(", ")}`,
    );
  },
);

// ---------------------------------------------------------------------------
// K22: service name and resource attributes
// ---------------------------------------------------------------------------

await check(
  "K22",
  "the default OTLP service.name is ai-service, with service.version and no deployment.environment",
  async () => {
    const { hits } = await generated();
    for (const path of ["/v1/traces", "/v1/metrics"]) {
      const resource = resourceOf(hits, path);
      expect(
        resource["service.name"] === "ai-service" &&
          resource["service.version"] === "v1.0.0" &&
          !("deployment.environment" in resource),
        `${path} resource was ${JSON.stringify(resource)}`,
      );
    }
  },
);

await check(
  "K22",
  "OTEL_SERVICE_NAME, LANGFUSE_RELEASE and LANGFUSE_TRACING_ENVIRONMENT shape the resource",
  async () => {
    const { hits } = await observe("generate", (receiver) => ({
      ...otlp(receiver),
      OTEL_SERVICE_NAME: "svc-x",
      LANGFUSE_RELEASE: "rel-1",
      LANGFUSE_TRACING_ENVIRONMENT: "env-1",
    }));
    const resource = resourceOf(hits, "/v1/traces");
    expect(
      resource["service.name"] === "svc-x" &&
        resource["service.version"] === "rel-1" &&
        resource["deployment.environment"] === "env-1",
      `resource was ${JSON.stringify(resource)}`,
    );
  },
);

// ---------------------------------------------------------------------------
// K02 and K09: the Langfuse switches
// ---------------------------------------------------------------------------

for (const value of ["false", "0", "off"]) {
  await check(
    "K02",
    `LANGFUSE_ENABLED=${value} keeps Langfuse off although both keys are set`,
    async () => {
      const { run, hits } = await observe("generate", (receiver) => ({
        ...langfuse(receiver),
        LANGFUSE_ENABLED: value,
      }));
      expect(!status(run).hasProcessor, "a Langfuse exporter was created");
      expect(
        !hits.some((hit) => isLangfuse(hit.path)),
        "spans reached Langfuse",
      );
    },
  );
}

await check(
  "K02",
  "control: both keys alone still turn Langfuse on and export",
  async () => {
    const { run, hits } = await observe("generate", langfuse);
    expect(status(run).hasProcessor, "no Langfuse exporter was created");
    expect(spansOf(hits, isLangfuse).length > 0, "no spans reached Langfuse");
  },
);

await check(
  "K02",
  "LANGFUSE_ENVIRONMENT and PUBLIC_APP_VERSION fill the OTLP resource's environment and release, and label no Langfuse trace",
  async () => {
    const { hits } = await observe("generate", (receiver) => ({
      ...langfuse(receiver),
      ...otlp(receiver),
      LANGFUSE_ENVIRONMENT: "legacy-env",
      PUBLIC_APP_VERSION: "9.9.9",
    }));
    const spans = spansOf(hits, isLangfuse);
    expect(spans.length > 0, "no spans reached Langfuse");
    expect(
      spans.every(
        (span) =>
          span.attributes["langfuse.environment"] === undefined &&
          span.attributes["langfuse.release"] === undefined,
      ),
      `environment/release seen: ${JSON.stringify(spans.map((span) => [span.attributes["langfuse.environment"], span.attributes["langfuse.release"]]))}`,
    );
    const resource = resourceOf(hits, "/v1/traces");
    expect(
      resource["deployment.environment"] === "legacy-env" &&
        resource["service.version"] === "9.9.9",
      `resource was ${JSON.stringify(resource)}`,
    );
  },
);

await check(
  "K02",
  "PUBLIC_APP_ENVIRONMENT fills the OTLP resource's environment when nothing else names it, and labels no Langfuse trace",
  async () => {
    const { hits } = await observe("generate", (receiver) => ({
      ...langfuse(receiver),
      ...otlp(receiver),
      PUBLIC_APP_ENVIRONMENT: "app-env",
    }));
    expect(
      resourceOf(hits, "/v1/traces")["deployment.environment"] === "app-env",
      "environment was not taken from PUBLIC_APP_ENVIRONMENT",
    );
    expect(
      spansOf(hits, isLangfuse).every(
        (span) => span.attributes["langfuse.environment"] === undefined,
      ),
      "a Langfuse trace carries PUBLIC_APP_ENVIRONMENT",
    );
  },
);

await check(
  "K02",
  "control: LANGFUSE_TRACING_ENVIRONMENT and LANGFUSE_RELEASE take precedence over the fallbacks",
  async () => {
    const { hits } = await observe("generate", (receiver) => ({
      ...langfuse(receiver),
      LANGFUSE_TRACING_ENVIRONMENT: "wins-env",
      LANGFUSE_ENVIRONMENT: "loses-env",
      PUBLIC_APP_ENVIRONMENT: "loses-too",
      LANGFUSE_RELEASE: "wins-rel",
      PUBLIC_APP_VERSION: "loses-rel",
    }));
    expect(
      spansOf(hits, isLangfuse).some(
        (span) =>
          span.attributes["langfuse.environment"] === "wins-env" &&
          span.attributes["langfuse.release"] === "wins-rel",
      ),
      "the preferred variables did not win",
    );
  },
);

await check(
  "K02",
  ".env.example cannot arm Langfuse export when copied as is",
  async () => {
    const parsed = parseDotenv(readFileSync(join(ROOT, ".env.example")));
    const { run, hits } = await observe("generate", (receiver) => ({
      ...Object.fromEntries(
        Object.entries(parsed).filter(([key]) => key.startsWith("LANGFUSE_")),
      ),
      LANGFUSE_BASE_URL: receiver.url,
    }));
    expect(!status(run).hasProcessor, "the example env created an exporter");
    expect(
      !hits.some((hit) => isLangfuse(hit.path)),
      "the example env exported spans",
    );
  },
);

await check(
  "K09",
  "observability.langfuse with enabled:false does not export",
  async () => {
    const { run, hits } = await observe("generate", (receiver) => ({
      OBS_CONFIG: JSON.stringify({
        langfuse: {
          enabled: false,
          publicKey: "pk-cfg",
          secretKey: "sk-cfg",
          baseUrl: receiver.url,
        },
      }),
    }));
    expect(!status(run).hasProcessor, "an exporter was created");
    expect(!hits.some((hit) => isLangfuse(hit.path)), "spans reached Langfuse");
  },
);

await check(
  "K09",
  "control: the same object without enabled still exports",
  async () => {
    const { run, hits } = await observe("generate", (receiver) => ({
      OBS_CONFIG: JSON.stringify({
        langfuse: {
          publicKey: "pk-cfg",
          secretKey: "sk-cfg",
          baseUrl: receiver.url,
        },
      }),
    }));
    expect(status(run).hasProcessor, "no exporter was created");
    expect(spansOf(hits, isLangfuse).length > 0, "no spans reached Langfuse");
  },
);

// ---------------------------------------------------------------------------
// K04: a later instance with a different config
// ---------------------------------------------------------------------------

await check(
  "K04",
  "a later instance with a different config is reported at warn level, naming what differs and which wins",
  async () => {
    const { run } = await observe("two-instances", (receiver) => ({
      OBS_INGEST_URL: receiver.url,
    }));
    const line = run.output
      .split("\n")
      .find((entry) => /already started/i.test(entry));
    expect(line !== undefined, "no warning about the ignored config");
    expect(/WARN/i.test(line), "the message is not a warning");
    expect(
      line.includes("publicKey") && line.includes("mask"),
      "the message does not name what differs",
    );
    expect(/first/i.test(line), "the message does not say which config wins");
    expect(
      !/pk-second|sk-second|pk-first|sk-first/.test(run.output),
      "a key value was logged",
    );
  },
);

await check(
  "K04",
  "control: an identical later config produces no warning",
  async () => {
    const { run } = await observe("two-instances", (receiver) => ({
      OBS_INGEST_URL: receiver.url,
      OBS_SAME: "1",
    }));
    expect(
      !/already started/i.test(run.output),
      "a warning was logged for an identical config",
    );
  },
);

// ---------------------------------------------------------------------------
// K10 (code part): the endpoint is ignored beside a host provider
// ---------------------------------------------------------------------------

await check(
  "K10",
  "OTEL_EXPORTER_OTLP_ENDPOINT beside a host TracerProvider is reported as ignored at warn level",
  async () => {
    const { run } = await observe("host-otlp", (receiver) => ({
      ...otlp(receiver),
      OBS_HOST_TRACER: "1",
    }));
    const line = run.output
      .split("\n")
      .find((entry) => entry.includes("OTEL_EXPORTER_OTLP_ENDPOINT"));
    expect(line !== undefined, "no warning names the endpoint variable");
    expect(
      /WARN/i.test(line) && /ignor/i.test(line),
      "not a warn about ignoring",
    );
  },
);

await check(
  "K10",
  "control: the warning is not logged when NeuroLink owns the provider",
  async () => {
    const { run } = await observe("host-otlp", otlp);
    expect(
      !run.output.includes("OTEL_EXPORTER_OTLP_ENDPOINT"),
      "a warning was logged although no host provider exists",
    );
  },
);

// ---------------------------------------------------------------------------
// K03 (direct-provider part): the last spans leave a short script
// ---------------------------------------------------------------------------

const directExit = once(() =>
  observe("direct-exit", (receiver) => ({
    ...langfuse(receiver),
    ...otlp(receiver),
  })),
);

const directFlushed = once(() =>
  observe("direct-exit", (receiver) => ({
    ...langfuse(receiver),
    ...otlp(receiver),
    OBS_FLUSH: "1",
  })),
);

await check(
  "K03",
  "control: the same call followed by an explicit flush exports to both collectors",
  async () => {
    const { hits } = await directFlushed();
    expect(
      spansOf(hits, isOtlpTraces).some((span) => /generate/.test(span.name)),
      "no OTLP span reached the collector",
    );
    expect(
      spansOf(hits, isLangfuse).some((span) => /generate/.test(span.name)),
      "no span reached Langfuse",
    );
  },
);

await check(
  "K03",
  "process-exit flush: a direct provider call that just returns exports its OTLP spans",
  async () => {
    const { hits } = await directExit();
    expect(
      spansOf(hits, isOtlpTraces).some((span) => /generate/.test(span.name)),
      "no OTLP span reached the collector",
    );
  },
);

await check(
  "K03",
  "process-exit flush: the same call delivers its spans to Langfuse",
  async () => {
    const { hits } = await directExit();
    expect(
      spansOf(hits, isLangfuse).some((span) => /generate/.test(span.name)),
      "no span reached Langfuse",
    );
  },
);

await check(
  "K03",
  "process-exit flush: the metrics of that call are exported too",
  async () => {
    const { hits } = await directExit();
    metricNamed(metricsOf(hits), "ai_requests_total");
  },
);

// ---------------------------------------------------------------------------
// K34: the lightweight client entry keeps the API-only module graph
// ---------------------------------------------------------------------------

await check(
  "K34",
  "importing the client entry does not load the OpenTelemetry Node SDK or exporters",
  async () => {
    const { run } = await observe(
      "k34-client",
      () => ({ OBS_TARGET: DIST_CLIENT }),
      ["--import", HOOK],
    );
    const heavy = run.result.heavy as string[];
    expect(heavy.length === 0, `loaded: ${heavy.join(", ")}`);
  },
);

await check(
  "K34",
  "control: the hook sees the SDK when the package entry is imported",
  async () => {
    const { run } = await observe("k34-root", () => ({}), ["--import", HOOK]);
    const heavy = run.result.heavy as string[];
    expect(
      heavy.some((url) => url.includes("sdk-trace-node")),
      "the hook recorded no SDK load for the package entry",
    );
  },
);

await openai.close();

console.log(
  failures === 0 ? "# all checks passed" : `# ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
