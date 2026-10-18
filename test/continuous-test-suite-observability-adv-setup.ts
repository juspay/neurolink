#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability start-up, flush, metrics gate and status
 * (defects an adversarial verifier reproduced)
 *
 * Follow-up proof for PR #2002 (BZ-6924):
 *
 *   S02  flushOpenTelemetry(), shutdown and the exit flush are bounded by the
 *        flush budget; shutdown and the exit flush never throw because a
 *        collector is unreachable, and flushOpenTelemetry() rejects with
 *        `Flush failed` again when a provider's flush failed (bc-setup BS03)
 *   S03  the ./rag, ./workflow, ./evaluation, ./processors and ./autoresearch
 *        entries start tracing by themselves; the client entry still loads
 *        neither the start-up module nor the OpenTelemetry Node SDK
 *   S04  the ai_* metrics record on a host MeterProvider whatever the
 *        TracerProvider is
 *   S05  getTelemetryStatus() and the CLI do not report an OTLP endpoint that
 *        is ignored beside a host TracerProvider as active
 *   S07  `langfuse: true` without keys does not latch a setup with no exporter
 *   V05  no key, secret, Basic header or URL password reaches a log line at
 *        debug level when a later config is ignored
 *   K01a every way of keeping the ai_* metrics out (Langfuse alone, the
 *        Langfuse switches, NEUROLINK_TELEMETRY_ENABLED=false, an ignored
 *        endpoint, a shut-down provider) still records and exports none
 *   K01b the metrics gate is guarded from both sides: no MeterProvider records
 *        and throws nothing, a host MeterProvider or NeuroLink's own receives
 *        them
 *   K01c the metric surface (names, types, units, descriptions, label names
 *        and values) a dashboard or alert reads
 *   BS01..BS10  existing users keep what they had before the follow-up: the
 *        default OTLP service name, the rejecting flush, a keyless options
 *        object starting the pipeline, the status flags, bundled entries
 *        starting tracing, the Langfuse environment and release labels and
 *        the unconfigured decision span; the exit flush has an opt-out.
 *        BS09 is kept as the K35 correction (the status commands start
 *        telemetry), see proof/bc-setup/REPORT.md
 *
 * Every check starts the built package (`dist/`) in a child process, because
 * tracing and metrics are process-wide and terminal: one process can start
 * them once. The suite itself imports neither `src/` nor `dist/`. The children
 * talk to local stand-ins only: a fake OpenAI-compatible server and receivers
 * that answer, never answer, fail with HTTP 500 or answer late. No keys and no
 * live calls are needed.
 *
 * Output is one `PROOF <id> PASS|FAIL <description>` line per check; the
 * process exits non-zero when any check fails.
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-observability-adv-setup.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createServer as createTcpServer, type Socket } from "node:net";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
const distUrl = (relative: string): string =>
  pathToFileURL(join(ROOT, "dist", relative)).href;
const DIST = distUrl("index.js");
const DIST_AI_METRICS = distUrl("telemetry/aiMetrics.js");
const CLI = join(ROOT, "dist/cli/index.js");
const SUBPATH_ENTRIES: Record<string, string> = {
  "./rag": distUrl("rag/index.js"),
  "./workflow": distUrl("workflow/index.js"),
  "./evaluation": distUrl("evaluation/index.js"),
  "./processors": distUrl("processors/index.js"),
  "./autoresearch": distUrl("autoresearch/index.js"),
};
const FLUSH_BUDGET_MS = 500;
// Unbounded, the OTLP exporter waits out its 10 s request timeout; bounded, a
// flush ends near the 500 ms budget. The margin absorbs a loaded machine.
const BOUND_MS = 3_000;

// ---------------------------------------------------------------------------
// Check runner
// ---------------------------------------------------------------------------

let failures = 0;
// OBS_ONLY=BS01,BS03 runs just those ids, to see one check go red against a
// mutated build without waiting for the rest; unset, every check runs.
const ONLY = process.env.OBS_ONLY?.split(",").filter(Boolean);

async function check(
  id: string,
  description: string,
  run: () => Promise<void>,
): Promise<void> {
  if (ONLY !== undefined && !ONLY.includes(id)) {
    return;
  }
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
    const body = await readBody(req);
    if (body.stream === true) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunk = (delta: JsonBody, finish: string | null): string =>
        `data: ${JSON.stringify({
          id: "chatcmpl-s1",
          object: "chat.completion.chunk",
          created: 1,
          model: "gpt-4o-mini",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`;
      res.write(chunk({ role: "assistant", content: "hel" }, null));
      res.write(chunk({ content: "lo" }, null));
      res.write(chunk({}, "stop"));
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-s1",
          object: "chat.completion.chunk",
          created: 1,
          model: "gpt-4o-mini",
          choices: [],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 30,
            total_tokens: 150,
          },
        })}\n\n`,
      );
      res.end("data: [DONE]\n\n");
      return;
    }
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
        usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
      }),
    );
  });
  const port = await listen(server);
  return { baseURL: `http://127.0.0.1:${port}/v1`, close: () => close(server) };
})();

type Hit = { path: string; payload: JsonBody };

type Receiver = {
  url: string;
  host: string;
  hits: Hit[];
  close: () => Promise<void>;
};

/**
 * `blackhole` reads each request and never answers it; `{ status }` answers
 * every request with that status and, when given, a `Retry-After`. With
 * `silentAfter: n` only the first trace request gets that answer, the next n
 * are read and never answered, and the ones after are answered 200 (metric
 * requests are always answered 200).
 */
type ReceiverMode =
  | "ok"
  | "blackhole"
  | "500"
  | { delayMs: number }
  | { status: number; retryAfter?: string; silentAfter?: number };

async function startReceiver(mode: ReceiverMode = "ok"): Promise<Receiver> {
  const hits: Hit[] = [];
  let traceRequests = 0;
  const answer = (res: ServerResponse): void => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  };
  const server = createServer(async (req, res) => {
    const payload = await readBody(req);
    hits.push({ path: req.url ?? "", payload });
    if (mode === "blackhole") {
      return;
    }
    if (mode === "500") {
      res.writeHead(500, { "content-type": "application/json" });
      res.end('{"error":"collector down"}');
      return;
    }
    if (typeof mode === "object" && "status" in mode) {
      if (mode.silentAfter !== undefined) {
        if ((req.url ?? "").endsWith("/v1/metrics")) {
          answer(res);
          return;
        }
        traceRequests++;
        if (traceRequests > 1 + mode.silentAfter) {
          answer(res);
          return;
        }
        if (traceRequests > 1) {
          return;
        }
      }
      res.writeHead(mode.status, {
        "content-type": "application/json",
        ...(mode.retryAfter !== undefined && {
          "retry-after": mode.retryAfter,
        }),
      });
      res.end('{"error":"collector down"}');
      return;
    }
    if (typeof mode === "object") {
      setTimeout(() => answer(res), mode.delayMs);
      return;
    }
    answer(res);
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    host: `127.0.0.1:${port}`,
    hits,
    close: () => close(server),
  };
}

/** A port that refuses connections: bound once, then released. */
async function closedPort(): Promise<string> {
  const server = createTcpServer((socket: Socket) => socket.destroy());
  const port = await new Promise<number>((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}

type OtlpAttribute = { key: string; value: JsonBody };

function spanNames(hits: Hit[], path: string): string[] {
  type RawSpan = { name: string; attributes?: OtlpAttribute[] };
  return hits
    .filter((hit) => hit.path === path)
    .flatMap(
      (hit) =>
        (hit.payload.resourceSpans ?? []) as {
          scopeSpans: { spans: RawSpan[] }[];
        }[],
    )
    .flatMap((resource) => resource.scopeSpans)
    .flatMap((scope) => scope.spans)
    .map((span) => span.name);
}

const LANGFUSE_PATH = "/api/public/otel/v1/traces";

// ---------------------------------------------------------------------------
// Child scenarios
// ---------------------------------------------------------------------------

const SCENARIO = join(tempDir("neurolink-obs-adv-setup-"), "scenario.mjs");
const HOOK = join(tempDir("neurolink-obs-adv-setup-hook-"), "hook.mjs");
const HOST_PRELOAD = join(
  tempDir("neurolink-obs-adv-setup-host-"),
  "host-provider.mjs",
);
const API = import.meta.resolve("@opentelemetry/api");
const SDK_TRACE_NODE = import.meta.resolve("@opentelemetry/sdk-trace-node");
const SDK_TRACE_BASE = import.meta.resolve("@opentelemetry/sdk-trace-base");
const SDK_METRICS = import.meta.resolve("@opentelemetry/sdk-metrics");

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

// What an application does with \`node --import\` before NeuroLink loads.
writeFileSync(
  HOST_PRELOAD,
  `
const { NodeTracerProvider } = await import(${JSON.stringify(SDK_TRACE_NODE)});
new NodeTracerProvider().register();
`,
);

writeFileSync(
  SCENARIO,
  `
import { writeSync } from "node:fs";
const env = process.env;
const scenario = env.OBS_SCENARIO;
const result = {};
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const chat = () => ({ input: { text: "hi" }, provider: "openai", model: "gpt-4o-mini", credentials, disableTools: true, disableInternalFallback: true });
const print = () => console.log("RESULT " + JSON.stringify(result));
const errorText = (error) => String(error?.message ?? error).slice(0, 200);

if (scenario === "entry") {
  await import(env.OBS_TARGET);
  const urls = [...new Set(globalThis.__resolved)];
  result.startup = urls.some((url) => /services\\/server\\/ai\\/observability\\/instrumentation\\.js$/.test(url));
  result.heavy = urls.filter((url) => /@opentelemetry\\/(sdk-trace-node|sdk-metrics|exporter-)/.test(url));
  print();
  process.exit(0);
}

if (scenario === "rag") {
  const rag = await import(env.OBS_TARGET);
  const chunker = await rag.createChunker("character", { maxSize: 20, overlap: 0 });
  result.chunks = (await chunker.chunk("alpha beta gamma delta epsilon zeta eta theta")).length;
  const api = await import(${JSON.stringify(API)});
  const global = api.trace.getTracerProvider();
  const delegate = typeof global.getDelegate === "function" ? global.getDelegate() : global;
  result.provider = delegate?.constructor?.name;
  print();
  // No flush and no exit: the exit flush has to deliver the span.
} else {
  // The k01 probe sees the API's placeholder MeterProvider before the host or the package can replace it,
  // and counts what NeuroLink's metric module writes to the shared no-op meter: a write there is a recording
  // with nobody listening. The SDK writes its own self-metrics to the same meter, so only calls with
  // aiMetrics on the stack count.
  const probe = scenario === "k01" ? await import(${JSON.stringify(API)}) : undefined;
  const initialProvider = probe?.metrics.getMeterProvider();
  let noopCalls = 0;
  if (probe) {
    const noop = probe.createNoopMeter();
    for (const [instrument, method] of [[noop.createCounter("probe"), "add"], [noop.createHistogram("probe"), "record"]]) {
      const original = instrument[method];
      instrument[method] = function counted(...args) {
        if (/aiMetrics/.test(new Error().stack ?? "")) { noopCalls++; }
        return original.apply(this, args);
      };
    }
  }
  let hostMeter;
  if (env.OBS_HOST_METER === "1") {
    const api = await import(${JSON.stringify(API)});
    const sdk = await import(${JSON.stringify(SDK_METRICS)});
    const exporter = new sdk.InMemoryMetricExporter(sdk.AggregationTemporality.CUMULATIVE);
    const reader = new sdk.PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 3600000 });
    api.metrics.setGlobalMeterProvider(new sdk.MeterProvider({ readers: [reader] }));
    hostMeter = { exporter, reader };
  }
  if (env.OBS_HOST_TRACER === "1") {
    const { NodeTracerProvider } = await import(${JSON.stringify(SDK_TRACE_NODE)});
    new NodeTracerProvider().register();
  }
  const dist = await import(${JSON.stringify(DIST)});
  const make = (observability) => new dist.NeuroLink(observability ? { observability } : undefined);

  if (scenario === "flush") {
    const nl = make(JSON.parse(env.OBS_CONFIG));
    result.content = (await nl.generate(chat())).content;
    if (env.OBS_EXIT === "natural") {
      result.doneAt = Date.now();
      process.on("exit", () => writeSync(1, "EXITED_AT " + Date.now() + "\\n"));
      print();
    } else {
      let started = Date.now();
      try { await dist.flushOpenTelemetry(); result.flush = "ok"; } catch (error) { result.flush = "threw: " + errorText(error); }
      result.flushMs = Date.now() - started;
      result.exporters = nl.getTelemetryStatus().exporters;
      started = Date.now();
      try { await nl.shutdown(); await dist.shutdownOpenTelemetry(); result.shutdown = "ok"; } catch (error) { result.shutdown = "threw: " + errorText(error); }
      result.shutdownMs = Date.now() - started;
      print();
      process.exit(0);
    }
  } else if (scenario === "host-meter") {
    const nl = make(env.OBS_CONFIG ? JSON.parse(env.OBS_CONFIG) : undefined);
    result.content = (await nl.generate(chat())).content;
    await hostMeter.reader.forceFlush();
    const metrics = hostMeter.exporter.getMetrics().flatMap((batch) => batch.scopeMetrics).flatMap((scope) => scope.metrics);
    const requests = metrics.filter((metric) => metric.descriptor.name === "ai_requests_total").at(-1);
    result.aiRequests = requests ? requests.dataPoints.reduce((sum, point) => sum + point.value, 0) : 0;
    print();
    process.exit(0);
  } else if (scenario === "k01") {
    const nl = make(env.OBS_CONFIG ? JSON.parse(env.OBS_CONFIG) : undefined);
    const attempt = async (label, run) => {
      try { return await run(); } catch (error) { (result.thrown ??= []).push(label + ": " + errorText(error)); }
    };
    for (const call of JSON.parse(env.OBS_CALLS)) {
      if (call === "generate") {
        result.content = (await attempt("generate", () => nl.generate(chat())))?.content;
      } else if (call === "stream") {
        await attempt("stream", async () => {
          const out = await nl.stream(chat());
          let text = "";
          for await (const piece of out.stream) { text += typeof piece === "string" ? piece : (piece?.content ?? ""); }
          result.streamed = text;
        });
      } else if (call === "shutdown") {
        await attempt("shutdown", async () => {
          await nl.shutdown();
          await dist.shutdownOpenTelemetry();
        });
        result.registeredAfterShutdown = probe.metrics.getMeterProvider() !== initialProvider;
      } else if (call === "errors") {
        const aiMetrics = await import(${JSON.stringify(DIST_AI_METRICS)});
        aiMetrics.recordAIError("openai", new TypeError("provider exploded"));
        aiMetrics.recordAIError("openai", Object.assign(new Error("rate limited"), { status: 429 }));
      }
    }
    result.providerRegistered = probe.metrics.getMeterProvider() !== initialProvider;
    result.noopCalls = noopCalls;
    if (hostMeter) {
      await hostMeter.reader.forceFlush();
      result.metrics = hostMeter.exporter.getMetrics().flatMap((batch) => batch.scopeMetrics).flatMap((scope) => scope.metrics.map((metric) => ({
        scope: scope.scope.name,
        name: metric.descriptor.name,
        description: metric.descriptor.description,
        unit: metric.descriptor.unit,
        type: metric.descriptor.type,
        points: metric.dataPoints.map((point) => ({
          attributes: point.attributes,
          value: typeof point.value === "number" ? point.value : undefined,
          count: typeof point.value === "object" ? point.value.count : undefined,
        })),
      })));
    }
    await dist.flushOpenTelemetry().catch(() => undefined);
    print();
    process.exit(0);
  } else if (scenario === "status") {
    for (let i = 0; i < 2; i++) {
      const nl = make();
      await nl.generate(chat());
      result.status = nl.getTelemetryStatus();
    }
    await dist.flushOpenTelemetry().catch(() => undefined);
    print();
    process.exit(0);
  } else if (scenario === "latch") {
    const first = make(env.OBS_FIRST ? JSON.parse(env.OBS_FIRST) : undefined);
    await first.generate(chat());
    await first.generate(chat());
    result.afterFirst = dist.getLangfuseHealthStatus();
    if (env.OBS_THEN === "host") {
      const api = await import(${JSON.stringify(API)});
      const { BasicTracerProvider } = await import(${JSON.stringify(SDK_TRACE_BASE)});
      result.hostRegistered = api.trace.setGlobalTracerProvider(new BasicTracerProvider());
    } else {
      const second = make({ langfuse: { publicKey: "pk-later", secretKey: "sk-later", baseUrl: env.OBS_INGEST_URL } });
      await second.generate(chat());
      await dist.flushOpenTelemetry().catch(() => undefined);
      result.afterSecond = dist.getLangfuseHealthStatus();
    }
    print();
    process.exit(0);
  } else if (scenario === "ignored-config") {
    const first = make({ langfuse: { publicKey: env.OBS_PK_FIRST, secretKey: env.OBS_SK_FIRST, baseUrl: env.OBS_INGEST_URL } });
    await first.generate(chat());
    const second = make({ langfuse: { publicKey: env.OBS_PK_SECOND, secretKey: env.OBS_SK_SECOND, baseUrl: env.OBS_INGEST_URL_USERINFO } });
    await second.generate(chat());
    const third = make({ langfuse: { publicKey: env.OBS_PK_SECOND, secretKey: env.OBS_SK_SECOND, baseUrl: env.OBS_INGEST_URL_USERINFO, environment: "other" } });
    await third.generate(chat());
    await dist.flushOpenTelemetry().catch(() => undefined);
    await dist.shutdownOpenTelemetry().catch(() => undefined);
    print();
    process.exit(0);
  }
}
`,
);

type Run = {
  output: string;
  result: JsonBody;
  /** Milliseconds between the scenario's own work ending and the process exiting. */
  lingerMs?: number;
};

const BASE_ENV = (): Record<string, string> => ({
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  DOTENV_CONFIG_PATH: "/dev/null",
  NEUROLINK_SKIP_MCP: "true",
  // The logger prints nothing below error unless debug mode is on; the level
  // then decides which lines show.
  NEUROLINK_DEBUG: "true",
  NEUROLINK_LOG_LEVEL: "warn",
  OBS_OPENAI_URL: openai.baseURL,
});

async function runScenario(
  scenario: string,
  env: Record<string, string>,
  nodeArgs: string[] = [],
): Promise<Run> {
  const run = await runCommand(process.execPath, [...nodeArgs, SCENARIO], {
    cwd: ROOT,
    timeoutMs: 120_000,
    env: { ...BASE_ENV(), OBS_SCENARIO: scenario, ...env },
  });
  const output = `${run.stdout}\n${run.stderr}`;
  const line = run.stdout
    .split("\n")
    .find((entry) => entry.startsWith("RESULT "));
  expect(
    run.exitCode === 0 && line !== undefined,
    `scenario ${scenario} did not finish cleanly (exit ${run.exitCode}): ${output.slice(-400)}`,
  );
  const result: JsonBody = JSON.parse(line.slice("RESULT ".length));
  const exitedAt = /EXITED_AT (\d+)/.exec(run.stdout)?.[1];
  return {
    output,
    result,
    lingerMs:
      exitedAt !== undefined && typeof result.doneAt === "number"
        ? Number(exitedAt) - result.doneAt
        : undefined,
  };
}

type Observed = { run: Run; langfuse: Receiver; otlp?: Receiver };

/**
 * Runs the flush scenario with Langfuse on its own receiver and the OTLP
 * collector at `otlp` (a receiver mode, or a URL that refuses connections).
 */
async function observeFlush(
  otlp: ReceiverMode | "closed",
  options: {
    exit?: "explicit" | "natural";
    langfuseMode?: ReceiverMode;
    budgetMs?: number;
    env?: Record<string, string>;
  } = {},
): Promise<Observed> {
  const langfuse = await startReceiver(options.langfuseMode ?? "ok");
  const collector = otlp === "closed" ? undefined : await startReceiver(otlp);
  const endpoint = collector?.url ?? (await closedPort());
  try {
    const run = await runScenario("flush", {
      OBS_CONFIG: JSON.stringify({
        langfuse: {
          publicKey: "pk-flush",
          secretKey: "sk-flush",
          baseUrl: langfuse.url,
          flushBudgetMs: options.budgetMs ?? FLUSH_BUDGET_MS,
        },
      }),
      OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      OBS_EXIT: options.exit ?? "explicit",
      ...options.env,
    });
    return { run, langfuse, otlp: collector };
  } finally {
    await langfuse.close();
    await collector?.close();
  }
}

const flushWarning = (output: string): string | undefined =>
  output
    .split("\n")
    .find((line) => /\[OpenTelemetry\] Flush did not complete/.test(line));

// ---------------------------------------------------------------------------
// S02: the flush budget bounds every flush, and a dead collector never throws
// ---------------------------------------------------------------------------

const blackholed = once(() => observeFlush("blackhole"));

await check(
  "S02",
  "precondition: the blackholed collector was sent the export the flush waits for",
  async () => {
    const { otlp } = await blackholed();
    expect((otlp?.hits.length ?? 0) > 0, "the collector received no request");
  },
);

await check(
  "S02",
  `flushOpenTelemetry() with flushBudgetMs ${FLUSH_BUDGET_MS} and a blackholed collector returns within ${BOUND_MS} ms`,
  async () => {
    const { run } = await blackholed();
    const flushMs = run.result.flushMs as number;
    expect(flushMs < BOUND_MS, `the flush took ${flushMs} ms`);
  },
);

const rejectedFlush = (flush: unknown): boolean =>
  typeof flush === "string" &&
  flush.startsWith("threw: ") &&
  /Flush failed/.test(flush);

await check(
  "S02",
  "flushOpenTelemetry() rejects with `Flush failed` when the collector never answers, as before the follow-up",
  async () => {
    const { run } = await blackholed();
    expect(
      rejectedFlush(run.result.flush),
      `flush outcome: ${run.result.flush}`,
    );
  },
);

await check(
  "S02",
  "a flush cut short by the budget logs a warning as well as rejecting",
  async () => {
    const { run } = await blackholed();
    const line = flushWarning(run.output);
    expect(line !== undefined, "no message says the flush did not complete");
    expect(/WARN/i.test(line), "the flush message is not a warning");
  },
);

await check(
  "S02",
  `releasing the instance and shutdownOpenTelemetry() return within ${BOUND_MS} ms with the collector blackholed`,
  async () => {
    const { run } = await blackholed();
    const shutdownMs = run.result.shutdownMs as number;
    expect(run.result.shutdown === "ok", `shutdown: ${run.result.shutdown}`);
    expect(shutdownMs < BOUND_MS, `shutdown took ${shutdownMs} ms`);
  },
);

await check(
  "S02",
  "control: with the collector blackholed the flush still delivers the spans to Langfuse",
  async () => {
    const { langfuse, run } = await blackholed();
    expect(
      spanNames(langfuse.hits, LANGFUSE_PATH).some((name) =>
        /generate/.test(name),
      ),
      "no generate span reached Langfuse",
    );
    const exporters = run.result.exporters as { deliveredSpans?: number }[];
    expect(
      exporters.some((exporter) => (exporter.deliveredSpans ?? 0) > 0),
      "the exporter status counts no delivered span",
    );
  },
);

await check(
  "S02",
  "flushOpenTelemetry() rejects with `Flush failed` when the collector's port refuses connections, and stays within the bound",
  async () => {
    const { run } = await observeFlush("closed");
    const flushMs = run.result.flushMs as number;
    expect(
      rejectedFlush(run.result.flush),
      `flush outcome: ${run.result.flush}`,
    );
    expect(flushMs < BOUND_MS, `the flush took ${flushMs} ms`);
  },
);

await check(
  "S02",
  "flushOpenTelemetry() rejects with `Flush failed` when the collector answers HTTP 500",
  async () => {
    const { run, otlp } = await observeFlush("500");
    expect((otlp?.hits.length ?? 0) > 0, "the collector received no request");
    expect(
      rejectedFlush(run.result.flush),
      `flush outcome: ${run.result.flush}`,
    );
  },
);

await check(
  "S02",
  "with OTEL_EXPORTER_OTLP_TIMEOUT longer than the budget, flushOpenTelemetry() still settles within the bound",
  async () => {
    const { run } = await observeFlush("blackhole", {
      env: { OTEL_EXPORTER_OTLP_TIMEOUT: "10000" },
    });
    const flushMs = run.result.flushMs as number;
    expect(
      rejectedFlush(run.result.flush),
      `flush outcome: ${run.result.flush}`,
    );
    expect(flushMs < BOUND_MS, `the flush took ${flushMs} ms`);
  },
);

await check(
  "S02",
  "control: the flush waits for a Langfuse delivery that answers within the budget while the collector is blackholed",
  async () => {
    const { run, langfuse } = await observeFlush("blackhole", {
      langfuseMode: { delayMs: 600 },
      budgetMs: 2_000,
    });
    expect(langfuse.hits.length > 0, "Langfuse received no request");
    const exporters = run.result.exporters as { deliveredSpans?: number }[];
    expect(
      exporters.some((exporter) => (exporter.deliveredSpans ?? 0) > 0),
      "the flush returned before the delayed Langfuse delivery completed",
    );
  },
);

const naturalBlackhole = once(() =>
  observeFlush("blackhole", { exit: "natural" }),
);
const naturalOk = once(() => observeFlush("ok", { exit: "natural" }));

await check(
  "S02",
  "control: a script that ends on its own exports through the exit flush (healthy collector)",
  async () => {
    const { otlp, run } = await naturalOk();
    expect(
      spanNames(otlp?.hits ?? [], "/v1/traces").some((name) =>
        /generate/.test(name),
      ),
      "no OTLP span reached the collector",
    );
    expect(run.lingerMs !== undefined, "the exit time was not recorded");
  },
);

await check(
  "S02",
  `a script that ends on its own exits within ${BOUND_MS} ms of its last call when the collector is blackholed`,
  async () => {
    const { run, otlp } = await naturalBlackhole();
    expect((otlp?.hits.length ?? 0) > 0, "the collector received no request");
    expect(run.lingerMs !== undefined, "the exit time was not recorded");
    expect(
      run.lingerMs < BOUND_MS,
      `the process stayed ${run.lingerMs} ms after its last call`,
    );
  },
);

await check(
  "S02",
  "control: that exit flush still delivers the spans to Langfuse",
  async () => {
    const { langfuse } = await naturalBlackhole();
    expect(
      spanNames(langfuse.hits, LANGFUSE_PATH).some((name) =>
        /generate/.test(name),
      ),
      "no generate span reached Langfuse",
    );
  },
);

// ---------------------------------------------------------------------------
// S03: the Node-only subpath entries start tracing
// ---------------------------------------------------------------------------

type EntryGraph = { startup: boolean; heavy: string[] };

async function entryGraph(target: string): Promise<EntryGraph> {
  const { result } = await runScenario("entry", { OBS_TARGET: target }, [
    "--import",
    HOOK,
  ]);
  return {
    startup: result.startup === true,
    heavy: (result.heavy as string[] | undefined) ?? [],
  };
}

await check(
  "S03",
  "control: the hook sees the start-up module and the SDK when the package entry is imported",
  async () => {
    const graph = await entryGraph(DIST);
    expect(graph.startup, "the start-up module was not recorded");
    expect(
      graph.heavy.some((url) => url.includes("sdk-trace-node")),
      "no SDK load was recorded",
    );
  },
);

for (const [entry, target] of Object.entries(SUBPATH_ENTRIES)) {
  await check(
    "S03",
    `importing the ${entry} entry loads the start-up module that registers the starter`,
    async () => {
      const graph = await entryGraph(target);
      expect(graph.startup, `${entry} does not load the start-up module`);
    },
  );
}

await check(
  "S03",
  "the client entry still loads neither the start-up module nor the OpenTelemetry Node SDK",
  async () => {
    const graph = await entryGraph(distUrl("client/index.js"));
    expect(!graph.startup, "the client entry loads the start-up module");
    expect(graph.heavy.length === 0, `loaded: ${graph.heavy.join(", ")}`);
  },
);

const ragOnly = once(async () => {
  const receiver = await startReceiver();
  try {
    const run = await runScenario("rag", {
      OBS_TARGET: SUBPATH_ENTRIES["./rag"],
      LANGFUSE_PUBLIC_KEY: "pk-rag",
      LANGFUSE_SECRET_KEY: "sk-rag",
      LANGFUSE_BASE_URL: receiver.url,
    });
    return { run, hits: receiver.hits };
  } finally {
    await receiver.close();
  }
});

await check(
  "S03",
  "with Langfuse keys set, createChunker().chunk() through ./rag alone registers NeuroLink's provider",
  async () => {
    const { run } = await ragOnly();
    expect(run.result.chunks !== 0, "the chunker returned nothing");
    expect(
      run.result.provider === "NodeTracerProvider",
      `the global provider is ${run.result.provider}`,
    );
  },
);

await check(
  "S03",
  "and the neurolink.rag.chunk span reaches Langfuse through the exit flush",
  async () => {
    const { hits } = await ragOnly();
    const names = spanNames(hits, LANGFUSE_PATH);
    expect(
      names.includes("neurolink.rag.chunk"),
      `spans: ${names.join(", ") || "(none)"}`,
    );
  },
);

// ---------------------------------------------------------------------------
// S04: the metrics gate reads the MeterProvider, not the TracerProvider
// ---------------------------------------------------------------------------

async function hostMeterRequests(env: Record<string, string>): Promise<number> {
  const { result } = await runScenario("host-meter", {
    OBS_HOST_METER: "1",
    ...env,
  });
  expect(result.content === "hello", "generate() did not answer");
  return result.aiRequests as number;
}

await check(
  "S04",
  "a host MeterProvider alone (no endpoint, no flag, no Langfuse) receives ai_requests_total",
  async () => {
    const requests = await hostMeterRequests({});
    expect(requests >= 1, `ai_requests_total = ${requests}`);
  },
);

await check(
  "S04",
  "control: the same host MeterProvider with Langfuse keys set receives it too",
  async () => {
    const receiver = await startReceiver();
    try {
      const requests = await hostMeterRequests({
        LANGFUSE_PUBLIC_KEY: "pk-meter",
        LANGFUSE_SECRET_KEY: "sk-meter",
        LANGFUSE_BASE_URL: receiver.url,
      });
      expect(requests >= 1, `ai_requests_total = ${requests}`);
    } finally {
      await receiver.close();
    }
  },
);

// ---------------------------------------------------------------------------
// S05: an endpoint ignored beside a host provider is not reported as active
// ---------------------------------------------------------------------------

type OtelStatus = {
  enabled?: boolean;
  endpoint?: string;
  usingExternalProvider?: boolean;
};

async function statusBeside(host: boolean): Promise<{
  status: OtelStatus | undefined;
  requests: number;
}> {
  const receiver = await startReceiver();
  try {
    const { result } = await runScenario("status", {
      OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      ...(host ? { OBS_HOST_TRACER: "1" } : {}),
    });
    const status = result.status as { openTelemetry?: OtelStatus };
    return { status: status.openTelemetry, requests: receiver.hits.length };
  } finally {
    await receiver.close();
  }
}

await check(
  "S05",
  "beside a host TracerProvider, getTelemetryStatus().openTelemetry reports the endpoint as not used",
  async () => {
    const { status, requests } = await statusBeside(true);
    expect(
      requests === 0,
      `the ignored endpoint received ${requests} requests`,
    );
    expect(status !== undefined, "openTelemetry is missing from the status");
    expect(
      status.usingExternalProvider === true,
      "openTelemetry.usingExternalProvider is not true",
    );
  },
);

await check(
  "S05",
  "control: on NeuroLink's own provider the endpoint is reported enabled and receives the export",
  async () => {
    const { status, requests } = await statusBeside(false);
    expect(requests > 0, "the endpoint received no request");
    expect(status?.enabled === true, "openTelemetry.enabled is not true");
    expect(
      status?.usingExternalProvider !== true,
      "usingExternalProvider is set without a host provider",
    );
  },
);

await check(
  "S05",
  "`neurolink telemetry status` beside a host provider preloaded with --import does not print the endpoint as Active",
  async () => {
    const run = await runCommand(
      process.execPath,
      ["--import", HOST_PRELOAD, CLI, "telemetry", "status"],
      {
        cwd: ROOT,
        timeoutMs: 60_000,
        env: {
          ...BASE_ENV(),
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:9",
        },
      },
    );
    expect(run.exitCode === 0, `the CLI exited ${run.exitCode}`);
    const lines = run.stdout.split("\n");
    const heading = lines.findIndex((line) => /^OpenTelemetry:/.test(line));
    expect(heading >= 0, "the CLI printed no OpenTelemetry block");
    const statusLine = lines
      .slice(heading + 1)
      .find((line) => /Status:/.test(line));
    expect(statusLine !== undefined, "the OpenTelemetry block has no status");
    expect(!/Active/.test(statusLine), "the ignored endpoint is shown Active");
    expect(/ignored/i.test(statusLine), "the status does not say ignored");
  },
);

// ---------------------------------------------------------------------------
// S07: `langfuse: true` without keys does not latch
// ---------------------------------------------------------------------------

async function latch(
  first: JsonBody | undefined,
  then: "second" | "host" = "second",
): Promise<{ run: Run; requests: number }> {
  const receiver = await startReceiver();
  try {
    const run = await runScenario("latch", {
      OBS_INGEST_URL: receiver.url,
      OBS_THEN: then,
      ...(first ? { OBS_FIRST: JSON.stringify(first) } : {}),
    });
    return {
      run,
      requests: receiver.hits.filter((hit) => hit.path === LANGFUSE_PATH)
        .length,
    };
  } finally {
    await receiver.close();
  }
}

const keylessFirst = once(() => latch({ langfuse: true }));

await check(
  "S07",
  "after `langfuse: true` without keys, a later instance with keys exports to Langfuse",
  async () => {
    const { requests } = await keylessFirst();
    expect(requests > 0, "Langfuse received no request");
  },
);

await check(
  "S07",
  "`langfuse: true` without keys leaves telemetry not started",
  async () => {
    const { run } = await keylessFirst();
    const afterFirst = run.result.afterFirst as { initialized?: boolean };
    expect(afterFirst.initialized === false, "telemetry reports initialized");
  },
);

await check(
  "S07",
  "the missing-keys warning is still logged, once, across two calls and the spans they create",
  async () => {
    const { run } = await keylessFirst();
    const warnings = run.output
      .split("\n")
      .filter((line) => /publicKey and secretKey are not both set/.test(line));
    expect(warnings.length === 1, `${warnings.length} warnings`);
  },
);

await check(
  "S07",
  "after `langfuse: true` without keys, a host TracerProvider can still be registered",
  async () => {
    const { run } = await latch({ langfuse: true }, "host");
    expect(run.result.hostRegistered === true, "the host provider was refused");
  },
);

await check(
  "S07",
  "control: a first instance with no config does not stop the later one either",
  async () => {
    const { requests } = await latch(undefined);
    expect(requests > 0, "Langfuse received no request");
  },
);

// ---------------------------------------------------------------------------
// V05: an ignored config leaks nothing at debug level
// ---------------------------------------------------------------------------

await check(
  "V05",
  "at debug level, no key, secret, Basic header or URL password of an ignored config appears in any output line",
  async () => {
    const receiver = await startReceiver();
    const secrets = {
      firstSecret: "sk-v05-first-3c91d7e2a0",
      secondPublic: "pk-v05-second-58be41f6",
      secondSecret: "sk-v05-second-a7d2c90e4b",
      urlPassword: "pw-v05-6e1f0b93d2",
    };
    const firstPublic = "pk-v05-first";
    try {
      const run = await runScenario("ignored-config", {
        NEUROLINK_LOG_LEVEL: "debug",
        OBS_INGEST_URL: receiver.url,
        OBS_INGEST_URL_USERINFO: `http://user:${secrets.urlPassword}@${receiver.host}`,
        OBS_PK_FIRST: firstPublic,
        OBS_SK_FIRST: secrets.firstSecret,
        OBS_PK_SECOND: secrets.secondPublic,
        OBS_SK_SECOND: secrets.secondSecret,
      });
      const lines = run.output.split("\n");
      expect(
        lines.some((line) => /DEBUG/i.test(line)),
        "precondition: no debug line was printed",
      );
      expect(
        lines.some((line) => /already started/i.test(line)),
        "precondition: the ignored-config path did not run",
      );
      const basic = (publicKey: string, secretKey: string): string =>
        Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
      const needles: Record<string, string> = {
        ...secrets,
        firstBasic: basic(firstPublic, secrets.firstSecret),
        secondBasic: basic(secrets.secondPublic, secrets.secondSecret),
      };
      const leaked = Object.entries(needles)
        .filter(([, value]) => lines.some((line) => line.includes(value)))
        .map(([name]) => name);
      expect(leaked.length === 0, `leaked: ${leaked.join(", ")}`);
    } finally {
      await receiver.close();
    }
  },
);

// ---------------------------------------------------------------------------
// K01: what the accepted "a host MeterProvider alone records" change leaves
// unguarded. NeuroLink's ai_* metrics are written to whatever MeterProvider is
// registered globally; the only ways to keep them out are to register none and
// to leave NeuroLink's own OTLP export off. The probe reports whether any
// MeterProvider got registered, how many recordings reached the API's shared
// no-op meter (a recording with nobody listening) and, with a host provider,
// what it received.
// ---------------------------------------------------------------------------

type HostMetric = {
  scope: string;
  name: string;
  description: string;
  unit: string;
  type: string;
  points: {
    attributes: Record<string, Json>;
    value?: number;
    count?: number;
  }[];
};

type Probe = {
  content?: string;
  streamed?: string;
  thrown?: string[];
  providerRegistered: boolean;
  registeredAfterShutdown?: boolean;
  noopCalls: number;
  metrics?: HostMetric[];
};

async function probeMetrics(
  calls: string[],
  env: Record<string, string> = {},
): Promise<Probe> {
  const { result } = await runScenario("k01", {
    OBS_CALLS: JSON.stringify(calls),
    ...env,
  });
  return {
    content: typeof result.content === "string" ? result.content : undefined,
    streamed: typeof result.streamed === "string" ? result.streamed : undefined,
    thrown: Array.isArray(result.thrown)
      ? result.thrown.map((entry) => String(entry))
      : undefined,
    providerRegistered: result.providerRegistered === true,
    registeredAfterShutdown:
      typeof result.registeredAfterShutdown === "boolean"
        ? result.registeredAfterShutdown
        : undefined,
    noopCalls: typeof result.noopCalls === "number" ? result.noopCalls : -1,
    metrics: Array.isArray(result.metrics)
      ? (result.metrics as HostMetric[])
      : undefined,
  };
}

type RawOtlpMetric = {
  name: string;
  sum?: { dataPoints: { asInt?: string | number; asDouble?: number }[] };
};

/** The metrics a receiver was sent at `/v1/metrics`, in arrival order. */
function otlpMetricExports(hits: Hit[]): RawOtlpMetric[] {
  return hits
    .filter((hit) => hit.path === "/v1/metrics")
    .flatMap(
      (hit) =>
        (hit.payload.resourceMetrics ?? []) as {
          scopeMetrics: { metrics: RawOtlpMetric[] }[];
        }[],
    )
    .flatMap((resource) => resource.scopeMetrics)
    .flatMap((scope) => scope.metrics);
}

/** Cumulative: the largest total any export of the metric reported. */
function otlpTotal(hits: Hit[], name: string): number {
  return Math.max(
    0,
    ...otlpMetricExports(hits)
      .filter((metric) => metric.name === name)
      .map((metric) =>
        (metric.sum?.dataPoints ?? []).reduce(
          (total, point) =>
            total + Number(point.asDouble ?? point.asInt ?? Number.NaN),
          0,
        ),
      ),
  );
}

const AI_METRIC_FAMILY =
  /^(ai_|mcp_tool_calls_total$|connections_total$|response_time_ms$|custom_)/;

function aiMetricNames(probe: Probe): string[] {
  return (probe.metrics ?? [])
    .map((metric) => metric.name)
    .filter((name) => AI_METRIC_FAMILY.test(name));
}

const LANGFUSE_KEYS = {
  LANGFUSE_PUBLIC_KEY: "pk-k01",
  LANGFUSE_SECRET_KEY: "sk-k01",
};

/** The recording code was reached while no MeterProvider could receive anything. */
const NOTHING_LISTENING =
  "ai_* values were written to the no-op meter although nothing asked for them";

await check(
  "K01b",
  "with no MeterProvider registered and nothing configured, generate() and stream() record nothing and throw nothing",
  async () => {
    const probe = await probeMetrics(["generate", "stream"]);
    expect(probe.content === "hello", "generate() did not answer");
    expect(probe.streamed === "hello", "stream() did not answer");
    expect(
      (probe.thrown ?? []).length === 0,
      `a call threw: ${(probe.thrown ?? []).join("; ")}`,
    );
    expect(!probe.providerRegistered, "NeuroLink registered a MeterProvider");
    expect(probe.noopCalls === 0, NOTHING_LISTENING);
  },
);

await check(
  "K01b",
  "control for the check above: with NEUROLINK_TELEMETRY_ENABLED=true and no MeterProvider the probe does see NeuroLink's recordings reach the no-op meter",
  async () => {
    const probe = await probeMetrics(["generate"], {
      NEUROLINK_TELEMETRY_ENABLED: "true",
    });
    expect(probe.content === "hello", "generate() did not answer");
    expect(!probe.providerRegistered, "NeuroLink registered a MeterProvider");
    expect(
      probe.noopCalls > 0,
      "the probe saw no recording, so a count of zero proves nothing",
    );
  },
);

await check(
  "K01b",
  "positive control: a host MeterProvider and no NeuroLink observability config receive the ai_* request, duration and token metrics",
  async () => {
    const probe = await probeMetrics(["generate"], { OBS_HOST_METER: "1" });
    expect(probe.content === "hello", "generate() did not answer");
    const names = aiMetricNames(probe);
    for (const name of [
      "ai_requests_total",
      "ai_request_duration_ms",
      "ai_tokens_used_total",
    ]) {
      expect(names.includes(name), `${name} missing; got ${names.join(", ")}`);
    }
  },
);

await check(
  "K01b",
  "positive control: with OTEL_EXPORTER_OTLP_ENDPOINT and no host provider, NeuroLink's own MeterProvider exports the ai_* metrics",
  async () => {
    const receiver = await startReceiver();
    try {
      const probe = await probeMetrics(["generate"], {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      });
      expect(probe.content === "hello", "generate() did not answer");
      expect(probe.providerRegistered, "no MeterProvider was registered");
      expect(
        otlpTotal(receiver.hits, "ai_requests_total") === 1,
        `ai_requests_total exported ${otlpTotal(receiver.hits, "ai_requests_total")} requests`,
      );
      expect(
        otlpTotal(receiver.hits, "ai_tokens_used_total") === 150,
        "ai_tokens_used_total did not export the 150 tokens",
      );
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K01a",
  "Langfuse alone (both keys, no OTLP endpoint) registers no MeterProvider and exports no metric",
  async () => {
    const receiver = await startReceiver();
    try {
      const probe = await probeMetrics(["generate"], {
        ...LANGFUSE_KEYS,
        LANGFUSE_BASE_URL: receiver.url,
      });
      expect(probe.content === "hello", "generate() did not answer");
      expect(
        receiver.hits.some((hit) => hit.path === LANGFUSE_PATH),
        "precondition: no span reached Langfuse, so tracing did not start",
      );
      expect(!probe.providerRegistered, "NeuroLink registered a MeterProvider");
      expect(
        otlpMetricExports(receiver.hits).length === 0,
        "metrics reached the receiver",
      );
      expect(probe.noopCalls === 0, NOTHING_LISTENING);
    } finally {
      await receiver.close();
    }
  },
);

for (const [label, config, env] of [
  [
    "observability.langfuse: false",
    '{"langfuse":false}',
    {} as Record<string, string>,
  ],
  ["LANGFUSE_ENABLED=false", undefined, { LANGFUSE_ENABLED: "false" }],
] as const) {
  await check(
    "K01a",
    `${label} with both Langfuse keys set starts nothing: no MeterProvider, no export of any kind`,
    async () => {
      const receiver = await startReceiver();
      try {
        const probe = await probeMetrics(["generate"], {
          ...LANGFUSE_KEYS,
          LANGFUSE_BASE_URL: receiver.url,
          ...env,
          ...(config ? { OBS_CONFIG: config } : {}),
        });
        expect(probe.content === "hello", "generate() did not answer");
        expect(
          receiver.hits.length === 0,
          `${receiver.hits.length} requests reached the receiver`,
        );
        expect(
          !probe.providerRegistered,
          "NeuroLink registered a MeterProvider",
        );
        expect(probe.noopCalls === 0, NOTHING_LISTENING);
      } finally {
        await receiver.close();
      }
    },
  );
}

await check(
  "K01a",
  "NEUROLINK_TELEMETRY_ENABLED=false changes nothing: no MeterProvider and no metric",
  async () => {
    const probe = await probeMetrics(["generate"], {
      NEUROLINK_TELEMETRY_ENABLED: "false",
    });
    expect(probe.content === "hello", "generate() did not answer");
    expect(!probe.providerRegistered, "NeuroLink registered a MeterProvider");
    expect(probe.noopCalls === 0, NOTHING_LISTENING);
  },
);

await check(
  "K01a",
  "an OTLP endpoint beside a host TracerProvider is ignored: nothing is sent to it and no MeterProvider is registered",
  async () => {
    const receiver = await startReceiver();
    try {
      const probe = await probeMetrics(["generate"], {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
        OBS_HOST_TRACER: "1",
      });
      expect(probe.content === "hello", "generate() did not answer");
      expect(
        receiver.hits.length === 0,
        `${receiver.hits.length} requests reached the ignored endpoint`,
      );
      expect(!probe.providerRegistered, "NeuroLink registered a MeterProvider");
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K01a",
  "after shutdownOpenTelemetry() NeuroLink's MeterProvider is gone and a later call exports no further ai_* metric",
  async () => {
    const receiver = await startReceiver();
    try {
      const probe = await probeMetrics(["generate", "shutdown", "generate"], {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      });
      expect(probe.content === "hello", "generate() did not answer");
      expect(
        otlpTotal(receiver.hits, "ai_requests_total") === 1,
        "precondition: the first request was not exported",
      );
      expect(
        probe.registeredAfterShutdown === false,
        "NeuroLink's MeterProvider is still registered after shutdown",
      );
    } finally {
      await receiver.close();
    }
  },
);

function metricNamed(probe: Probe, name: string): HostMetric {
  const metric = (probe.metrics ?? []).find((entry) => entry.name === name);
  expect(
    metric !== undefined,
    `${name} was not recorded; got ${aiMetricNames(probe).join(", ") || "(none)"}`,
  );
  return metric;
}

function labelNames(metric: HostMetric): string[] {
  return [
    ...new Set(
      metric.points.map((point) => Object.keys(point.attributes).sort().join()),
    ),
  ];
}

await check(
  "K01c",
  "generate() records ai_requests_total, ai_request_duration_ms, ai_tokens_used_total and ai_cost_usd_total, each with the kind, unit, description and the labels provider and model it always had",
  async () => {
    const probe = await probeMetrics(["generate"], { OBS_HOST_METER: "1" });
    expect(probe.content === "hello", "generate() did not answer");
    const expected = [
      ["ai_requests_total", "COUNTER", "Total number of AI requests"],
      [
        "ai_request_duration_ms",
        "HISTOGRAM",
        "AI request duration in milliseconds",
      ],
      ["ai_tokens_used_total", "COUNTER", "Total number of AI tokens used"],
      ["ai_cost_usd_total", "COUNTER", "Total accumulated AI cost in USD"],
    ] as const;
    expect(
      aiMetricNames(probe).sort().join() ===
        expected
          .map(([name]) => name)
          .sort()
          .join(),
      `the metrics were ${aiMetricNames(probe).sort().join(", ")}`,
    );
    for (const [name, type, description] of expected) {
      const metric = metricNamed(probe, name);
      expect(metric.scope === "neurolink-ai", `${name} scope`);
      expect(String(metric.type) === type, `${name} kind`);
      expect(metric.unit === "", `${name} unit`);
      expect(metric.description === description, `${name} description`);
      expect(
        labelNames(metric).join("|") === "model,provider",
        `${name} label names were ${labelNames(metric).join("|")}`,
      );
      expect(metric.points.length === 1, `${name} series count`);
      expect(
        metric.points[0].attributes.provider === "openai" &&
          metric.points[0].attributes.model === "gpt-4o-mini",
        `${name} label values`,
      );
    }
    expect(
      metricNamed(probe, "ai_requests_total").points[0].value === 1,
      "requests",
    );
    expect(
      metricNamed(probe, "ai_request_duration_ms").points[0].count === 1,
      "duration recordings",
    );
    expect(
      metricNamed(probe, "ai_tokens_used_total").points[0].value === 150,
      "tokens",
    );
    expect(
      (metricNamed(probe, "ai_cost_usd_total").points[0].value ?? 0) > 0,
      "cost",
    );
  },
);

await check(
  "K01c",
  "ai_provider_errors_total keeps the labels provider, error and message, and message is the HTTP status an error carries or `unspecified`, never its text",
  async () => {
    const probe = await probeMetrics(["errors"], { OBS_HOST_METER: "1" });
    const metric = metricNamed(probe, "ai_provider_errors_total");
    expect(
      metric.description === "Total number of AI provider errors",
      "description",
    );
    expect(
      labelNames(metric).join("|") === "error,message,provider",
      `label names were ${labelNames(metric).join("|")}`,
    );
    const seen = metric.points.map(
      (point) =>
        `${point.attributes.provider}/${point.attributes.error}/${point.attributes.message}=${point.value}`,
    );
    expect(
      seen.sort().join() ===
        ["openai/Error/HTTP 429=1", "openai/TypeError/unspecified=1"].join(),
      `series were ${seen.join(", ")}`,
    );
  },
);

// ---- bc-setup (BS01..BS10) ----
//
// What an existing deployment saw before the follow-up, kept. Every check here
// started as a difference between the released build (fc892bbb5) and the
// follow-up; the audit probes that found them are under
// proof/bc/setup/probes. Same stand-ins as above: the built package in a child
// process, a fake OpenAI-compatible server, and receivers on loopback. No keys.

type OtlpValue = { stringValue?: string };
type OtlpKeyValue = { key: string; value?: OtlpValue };
type OtlpSpan = { name: string; attributes?: OtlpKeyValue[] };
type OtlpResource = { attributes?: OtlpKeyValue[] };

const attributesOf = (
  list: OtlpKeyValue[] | undefined,
): Record<string, string> =>
  Object.fromEntries(
    (list ?? []).flatMap((entry) =>
      entry.value?.stringValue === undefined
        ? []
        : [[entry.key, entry.value.stringValue]],
    ),
  );

/** The distinct resources an OTLP/JSON receiver was sent at `path`. */
function resourcesAt(
  hits: Hit[],
  path: string,
  kind: "resourceSpans" | "resourceMetrics",
): Record<string, string>[] {
  const seen = new Map<string, Record<string, string>>();
  for (const hit of hits.filter((entry) => entry.path === path)) {
    for (const group of (hit.payload[kind] ?? []) as {
      resource?: OtlpResource;
    }[]) {
      const attributes = attributesOf(group.resource?.attributes);
      seen.set(JSON.stringify(attributes), attributes);
    }
  }
  return [...seen.values()];
}

/** Every span an OTLP/JSON receiver was sent at `path`, with its string attributes. */
function spansAt(
  hits: Hit[],
  path: string,
): { name: string; attributes: Record<string, string> }[] {
  return hits
    .filter((hit) => hit.path === path)
    .flatMap(
      (hit) =>
        (hit.payload.resourceSpans ?? []) as {
          scopeSpans: { spans: OtlpSpan[] }[];
        }[],
    )
    .flatMap((group) => group.scopeSpans)
    .flatMap((scope) => scope.spans)
    .map((span) => ({
      name: span.name,
      attributes: attributesOf(span.attributes),
    }));
}

const BS_SCENARIO = join(tempDir("neurolink-obs-bc-setup-"), "scenario.mjs");
const BS_BUNDLER = join(
  tempDir("neurolink-obs-bc-setup-bundle-"),
  "bundle.mjs",
);
const EXPORTER_REGISTRY = distUrl("observability/exporterRegistry.js");
const BASE_EXPORTER = distUrl("observability/exporters/baseExporter.js");
const TRACERS = distUrl("telemetry/tracers.js");
const ESBUILD = import.meta.resolve("esbuild");
const OTLP_TRACES = "/v1/traces";
const OTLP_METRICS = "/v1/metrics";
const EXIT_FLUSH_OFF = "NEUROLINK_TELEMETRY_EXIT_FLUSH";
// Default flush budget, plus the time a loaded machine needs to tear down.
const DEFAULT_BUDGET_MS = 3_000;
const EXIT_CEILING_MS = DEFAULT_BUDGET_MS + 1_500;
// The released build left in about 0.1 s; anything near the budget is a wait.
const NO_WAIT_MS = 1_500;

writeFileSync(
  BS_SCENARIO,
  `
import { writeSync } from "node:fs";
const env = process.env;
const scenario = env.OBS_SCENARIO;
const result = {};
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const chat = () => ({ input: { text: "hi" }, provider: "openai", model: "gpt-4o-mini", credentials, disableTools: true, disableInternalFallback: true });
const print = () => writeSync(1, "RESULT " + JSON.stringify(result) + "\\n");
const providerName = async () => {
  const api = await import(${JSON.stringify(API)});
  const global = api.trace.getTracerProvider();
  const delegate = typeof global.getDelegate === "function" ? global.getDelegate() : global;
  return delegate?.constructor?.name;
};

if (scenario === "entry-span") {
  await import(env.OBS_TARGET);
  const { tracers } = await import(${JSON.stringify(TRACERS)});
  tracers.sdk.startSpan("probe.bs07").end();
  result.provider = await providerName();
  print();
  process.exit(0);
}

const dist = await import(${JSON.stringify(DIST)});

if (scenario === "variant") {
  const { getExporterRegistry } = await import(${JSON.stringify(EXPORTER_REGISTRY)});
  const { BaseExporter } = await import(${JSON.stringify(BASE_EXPORTER)});
  const seen = [];
  class Capture extends BaseExporter {
    constructor() { super("capture", {}); }
    async initialize() { this.initialized = true; }
    async exportSpan(span) { seen.push(span.name); return { success: true, exportedCount: 1, durationMs: 0 }; }
    async exportBatch(spans) { for (const span of spans) seen.push(span.name); return { success: true, exportedCount: spans.length, durationMs: 0 }; }
    async flush() {}
    async shutdown() {}
    async healthCheck() { return { healthy: true, name: "capture", enabled: true, lastExportTime: 0, pendingSpans: 0, errors: [] }; }
  }
  const capture = new Capture();
  await capture.initialize();
  getExporterRegistry().register(capture);
  const observability = JSON.parse(env.OBS_CONFIG);
  const nl = new dist.NeuroLink(observability ? { observability } : undefined);
  await nl.generate(chat());
  try { await dist.flushOpenTelemetry(); } catch {}
  result.initialized = dist.isOpenTelemetryInitialized();
  result.provider = await providerName();
  result.seen = [...new Set(seen)].sort();
  print();
  process.exit(0);
} else if (scenario === "decide") {
  let hookCalls = 0;
  const events = [];
  const nl = new dist.NeuroLink({
    decisionHooks: {
      extendQuestions: () => { hookCalls++; return undefined; },
      onAnswers: () => { hookCalls++; },
    },
  });
  for (const name of ["decision:before", "decision:after"]) {
    nl.getEventEmitter().on(name, () => events.push(name));
  }
  result.answer = await nl.tryDecide({
    site: "routing",
    state: "ticket text",
    questions: { urgent: { type: "boolean", instructions: "Urgent?" } },
  });
  await dist.flushOpenTelemetry().catch(() => undefined);
  result.hookCalls = hookCalls;
  result.events = events;
  print();
  process.exit(0);
} else if (scenario === "reflush") {
  const config = env.OBS_CONFIG ? JSON.parse(env.OBS_CONFIG) : undefined;
  const nl = new dist.NeuroLink(config ? { observability: config } : undefined);
  await nl.generate(chat());
  let started = Date.now();
  try { await dist.flushOpenTelemetry(); result.first = "ok"; } catch { result.first = "rejected"; }
  result.firstMs = Date.now() - started;
  await nl.generate(chat());
  started = Date.now();
  try { await dist.flushOpenTelemetry(); result.second = "ok"; } catch { result.second = "rejected"; }
  result.secondMs = Date.now() - started;
  print();
  process.exit(0);
} else if (scenario === "exit-code") {
  const nl = new dist.NeuroLink();
  await nl.generate(chat());
  process.exitCode = 3;
  print();
}
`,
);

writeFileSync(
  BS_BUNDLER,
  `
import { spawnSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from ${JSON.stringify(ESBUILD)};
const { OBS_ROOT, OBS_WORK, OBS_ENTRIES } = process.env;
mkdirSync(OBS_WORK, { recursive: true });
symlinkSync(join(OBS_ROOT, "node_modules"), join(OBS_WORK, "node_modules"), "dir");
const results = {};
for (const name of OBS_ENTRIES.split(",")) {
  const entry = join(OBS_WORK, "entry-" + name.replace(/\\W/g, "_") + ".mjs");
  const outfile = entry.replace(/\\.mjs$/, ".bundle.mjs");
  const index = name === "." ? "index.js" : name + "/index.js";
  writeFileSync(entry, [
    'export * from "' + join(OBS_ROOT, "dist", index) + '";',
    'import { tracers } from "' + join(OBS_ROOT, "dist/telemetry/tracers.js") + '";',
    'import { trace } from "@opentelemetry/api";',
    'tracers.sdk.startSpan("probe.bundled").end();',
    'const delegate = trace.getTracerProvider().getDelegate?.();',
    'process.stdout.write("PROVIDER:" + (delegate ? delegate.constructor.name : "none") + "\\\\n");',
    'process.exit(0);',
  ].join("\\n"));
  await build({ absWorkingDir: OBS_WORK, entryPoints: [entry], outfile, bundle: true, platform: "node", format: "esm", packages: "external", logLevel: "silent" });
  const run = spawnSync(process.execPath, [outfile], { cwd: OBS_WORK, encoding: "utf8", timeout: 60000, env: process.env });
  results[name] = (/PROVIDER:(\\S+)/.exec(run.stdout) ?? [])[1] ?? "no provider line: " + run.stderr.slice(0, 200);
}
process.stdout.write("RESULT " + JSON.stringify(results) + "\\n");
`,
);

type ChildRun = { output: string; result: JsonBody; exitCode: number | null };

async function runBs(
  scenario: string,
  env: Record<string, string>,
  nodeArgs: string[] = [],
  file = BS_SCENARIO,
): Promise<ChildRun> {
  const run = await runCommand(process.execPath, [...nodeArgs, file], {
    cwd: ROOT,
    timeoutMs: 120_000,
    env: { ...BASE_ENV(), OBS_SCENARIO: scenario, ...env },
  });
  const output = `${run.stdout}\n${run.stderr}`;
  const line = run.stdout
    .split("\n")
    .find((entry) => entry.startsWith("RESULT "));
  expect(
    line !== undefined,
    `scenario ${scenario} printed no result (exit ${run.exitCode}): ${output.slice(-400)}`,
  );
  return {
    output,
    result: JSON.parse(line.slice("RESULT ".length)),
    exitCode: run.exitCode,
  };
}

/** The env-only user: Langfuse keys and an OTLP collector, no `observability` option. */
async function envOnly(
  options: {
    otlp?: ReceiverMode | "closed";
    exit?: "explicit" | "natural";
    budgetMs?: number;
    /** `observability.langfuse.environment`, in code. */
    environment?: string;
    langfuseMode?: ReceiverMode;
    env?: Record<string, string>;
  } = {},
): Promise<Observed> {
  const langfuse = await startReceiver(options.langfuseMode ?? "ok");
  const collector =
    options.otlp === "closed" ? undefined : await startReceiver(options.otlp);
  const endpoint = collector?.url ?? (await closedPort());
  try {
    const run = await runScenario("flush", {
      OBS_CONFIG: JSON.stringify(
        options.budgetMs === undefined && options.environment === undefined
          ? null
          : {
              langfuse: {
                ...(options.budgetMs !== undefined && {
                  flushBudgetMs: options.budgetMs,
                }),
                ...(options.environment !== undefined && {
                  environment: options.environment,
                }),
              },
            },
      ),
      LANGFUSE_PUBLIC_KEY: "pk-bs",
      LANGFUSE_SECRET_KEY: "sk-bs",
      LANGFUSE_BASE_URL: langfuse.url,
      OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      OBS_EXIT: options.exit ?? "explicit",
      ...options.env,
    });
    return { run, langfuse, otlp: collector };
  } finally {
    await langfuse.close();
    await collector?.close();
  }
}

// ---------------------------------------------------------------------------
// BS01: the OTLP service name default is `ai-service`
// ---------------------------------------------------------------------------

const defaultNamed = once(() => envOnly());
const namedByEnv = once(() =>
  envOnly({ env: { OTEL_SERVICE_NAME: "svc-bs01" } }),
);
const envConfigured = once(() =>
  envOnly({ env: { LANGFUSE_TRACING_ENVIRONMENT: "env-bs01" } }),
);
const optionConfigured = once(() => envOnly({ environment: "opt-bs01" }));

await check(
  "BS01",
  "the OTLP trace resource is named `ai-service` when OTEL_SERVICE_NAME is not set",
  async () => {
    const { otlp } = await defaultNamed();
    const resources = resourcesAt(
      otlp?.hits ?? [],
      OTLP_TRACES,
      "resourceSpans",
    );
    expect(resources.length > 0, "the collector received no trace");
    expect(
      resources.every((resource) => resource["service.name"] === "ai-service"),
      `service.name was ${resources.map((resource) => resource["service.name"]).join(", ")}`,
    );
  },
);

await check(
  "BS01",
  "the OTLP metric resource is named `ai-service` when OTEL_SERVICE_NAME is not set",
  async () => {
    const { otlp } = await defaultNamed();
    const resources = resourcesAt(
      otlp?.hits ?? [],
      OTLP_METRICS,
      "resourceMetrics",
    );
    expect(resources.length > 0, "the collector received no metrics");
    expect(
      resources.every((resource) => resource["service.name"] === "ai-service"),
      `service.name was ${resources.map((resource) => resource["service.name"]).join(", ")}`,
    );
  },
);

const otlpResourcesOf = (
  otlp: Receiver | undefined,
): Record<string, string>[] => [
  ...resourcesAt(otlp?.hits ?? [], OTLP_TRACES, "resourceSpans"),
  ...resourcesAt(otlp?.hits ?? [], OTLP_METRICS, "resourceMetrics"),
];

await check(
  "BS01",
  "both OTLP resources carry service.name `ai-service` and a service.version, and deployment.environment only when an environment is configured",
  async () => {
    const { otlp } = await defaultNamed();
    const resources = otlpResourcesOf(otlp);
    expect(resources.length >= 2, "traces and metrics were not both received");
    for (const resource of resources) {
      expect(
        resource["service.name"] === "ai-service" &&
          resource["service.version"] !== undefined &&
          resource["deployment.environment"] === undefined,
        `resource: ${JSON.stringify(resource)}`,
      );
    }
  },
);

await check(
  "BS01",
  "control: LANGFUSE_TRACING_ENVIRONMENT puts deployment.environment on both OTLP resources",
  async () => {
    const { otlp } = await envConfigured();
    const resources = otlpResourcesOf(otlp);
    expect(resources.length >= 2, "traces and metrics were not both received");
    expect(
      resources.every(
        (resource) =>
          resource["service.name"] === "ai-service" &&
          resource["deployment.environment"] === "env-bs01",
      ),
      `resources: ${JSON.stringify(resources)}`,
    );
  },
);

await check(
  "BS01",
  "control: the `environment` option puts deployment.environment on both OTLP resources",
  async () => {
    const { otlp } = await optionConfigured();
    const resources = otlpResourcesOf(otlp);
    expect(resources.length >= 2, "traces and metrics were not both received");
    expect(
      resources.every(
        (resource) => resource["deployment.environment"] === "opt-bs01",
      ),
      `resources: ${JSON.stringify(resources)}`,
    );
  },
);

await check(
  "BS01",
  "OTEL_SERVICE_NAME still names the OTLP traces and metrics",
  async () => {
    const { otlp } = await namedByEnv();
    const names = [
      ...resourcesAt(otlp?.hits ?? [], OTLP_TRACES, "resourceSpans"),
      ...resourcesAt(otlp?.hits ?? [], OTLP_METRICS, "resourceMetrics"),
    ].map((resource) => resource["service.name"]);
    expect(names.length >= 2, "traces and metrics were not both received");
    expect(
      names.every((name) => name === "svc-bs01"),
      `service.name was ${names.join(", ")}`,
    );
  },
);

await check(
  "BS01",
  "control: the Langfuse resource keeps its own service name, `neurolink`, so the two sinks differ",
  async () => {
    const { langfuse } = await defaultNamed();
    const resources = resourcesAt(
      langfuse.hits,
      LANGFUSE_PATH,
      "resourceSpans",
    );
    expect(resources.length > 0, "Langfuse received no span");
    expect(
      resources.every((resource) => resource["service.name"] === "neurolink"),
      `service.name was ${resources.map((resource) => resource["service.name"]).join(", ")}`,
    );
  },
);

// ---------------------------------------------------------------------------
// BS02: the exit flush is bounded and can be switched off
// ---------------------------------------------------------------------------

const exitDefault = once(() =>
  envOnly({ otlp: "blackhole", exit: "natural", budgetMs: DEFAULT_BUDGET_MS }),
);
const exitOptOut = once(() =>
  envOnly({
    otlp: "blackhole",
    exit: "natural",
    budgetMs: DEFAULT_BUDGET_MS,
    env: { [EXIT_FLUSH_OFF]: "false" },
  }),
);

await check(
  "BS02",
  `with the default 3 s budget and a blackholed collector, a script that ends on its own exits within ${EXIT_CEILING_MS} ms of its last call`,
  async () => {
    const { run, otlp } = await exitDefault();
    expect(
      (otlp?.hits.length ?? 0) > 0,
      "the exit flush never reached the collector",
    );
    expect(run.lingerMs !== undefined, "the exit time was not recorded");
    expect(
      run.lingerMs < EXIT_CEILING_MS,
      `the process stayed ${run.lingerMs} ms after its last call`,
    );
  },
);

await check(
  "BS02",
  `${EXIT_FLUSH_OFF}=false restores the released build's exit: within ${NO_WAIT_MS} ms with the collector blackholed`,
  async () => {
    const { run } = await exitOptOut();
    expect(run.lingerMs !== undefined, "the exit time was not recorded");
    expect(
      run.lingerMs < NO_WAIT_MS,
      `the process stayed ${run.lingerMs} ms after its last call`,
    );
  },
);

await check(
  "BS02",
  `control: ${EXIT_FLUSH_OFF}=0, off and no switch the flush off too; true and an unset variable leave it on`,
  async () => {
    for (const value of ["0", "off", "no"]) {
      const { run } = await envOnly({
        otlp: "blackhole",
        exit: "natural",
        env: { [EXIT_FLUSH_OFF]: value },
      });
      expect(
        run.lingerMs !== undefined && run.lingerMs < NO_WAIT_MS,
        `${value}: the process stayed ${run.lingerMs} ms`,
      );
    }
    const { otlp } = await envOnly({
      otlp: "ok",
      exit: "natural",
      env: { [EXIT_FLUSH_OFF]: "true" },
    });
    expect(
      spanNames(otlp?.hits ?? [], OTLP_TRACES).some((name) =>
        /generate/.test(name),
      ),
      "with the switch at true the exit flush delivered nothing",
    );
  },
);

await check(
  "BS02",
  "the exit flush leaves the exit code a script set",
  async () => {
    const receiver = await startReceiver("ok");
    try {
      const { exitCode } = await runBs("exit-code", {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      });
      expect(exitCode === 3, `exit code ${exitCode}`);
    } finally {
      await receiver.close();
    }
  },
);

// ---------------------------------------------------------------------------
// BS03: flushOpenTelemetry() rejects when a flush failed, inside the bound
// ---------------------------------------------------------------------------

const flushedBlackhole = once(() =>
  envOnly({ otlp: "blackhole", budgetMs: FLUSH_BUDGET_MS }),
);

await check(
  "BS03",
  "precondition: the flush of an env-only process reached the blackholed collector",
  async () => {
    const { otlp } = await flushedBlackhole();
    expect((otlp?.hits.length ?? 0) > 0, "the collector received no request");
  },
);

await check(
  "BS03",
  `with an unanswering OTLP collector, flushOpenTelemetry() rejects with \`Flush failed\` within ${BOUND_MS} ms`,
  async () => {
    const { run } = await flushedBlackhole();
    expect(
      rejectedFlush(run.result.flush),
      `flush outcome: ${run.result.flush}`,
    );
    expect(
      (run.result.flushMs as number) < BOUND_MS,
      `the flush took ${run.result.flushMs} ms`,
    );
  },
);

await check(
  "BS03",
  "control: with a healthy collector flushOpenTelemetry() resolves",
  async () => {
    const { run, otlp } = await envOnly({ otlp: "ok" });
    expect(
      spanNames(otlp?.hits ?? [], OTLP_TRACES).length > 0,
      "the collector received no span",
    );
    expect(run.result.flush === "ok", `flush outcome: ${run.result.flush}`);
  },
);

await check(
  "BS03",
  "a rejected flush at the end of a script is caught: no unhandled rejection, exit code 0",
  async () => {
    const { run } = await envOnly({ otlp: "500", exit: "natural" });
    expect(
      !/unhandled|UnhandledPromiseRejection/i.test(run.output),
      "the output reports an unhandled rejection",
    );
  },
);

await check(
  "BS03",
  "instance shutdown still resolves while the flush it makes is rejected",
  async () => {
    const { run } = await flushedBlackhole();
    expect(run.result.shutdown === "ok", `shutdown: ${run.result.shutdown}`);
  },
);

// ---------------------------------------------------------------------------
// BS04: a keyless or one-key `langfuse` options object starts the pipeline
// ---------------------------------------------------------------------------

async function variant(
  config: JsonBody | null,
  env: Record<string, string> = {},
): Promise<ChildRun> {
  return runBs("variant", { OBS_CONFIG: JSON.stringify(config), ...env });
}

await check(
  "BS04",
  "`langfuse: { environment }` without keys starts tracing: the provider is registered and a registry exporter receives spans",
  async () => {
    const { result } = await variant({ langfuse: { environment: "prod" } });
    expect(
      result.initialized === true,
      "isOpenTelemetryInitialized() is false",
    );
    expect(
      result.provider === "NodeTracerProvider",
      `the global provider is ${result.provider}`,
    );
    expect(
      (result.seen as string[]).some((name) => /generate/.test(name)),
      `the custom exporter saw: ${(result.seen as string[]).join(", ") || "(nothing)"}`,
    );
  },
);

await check(
  "BS04",
  "`langfuse: { publicKey }` with the secret missing starts tracing too",
  async () => {
    const { result } = await variant({ langfuse: { publicKey: "pk-bs04" } });
    expect(
      result.initialized === true,
      "isOpenTelemetryInitialized() is false",
    );
    expect(
      (result.seen as string[]).some((name) => /generate/.test(name)),
      "the custom exporter saw no generate span",
    );
  },
);

await check(
  "BS04",
  "control: LANGFUSE_ENABLED=false still keeps a keyless options object off",
  async () => {
    const { result } = await variant(
      { langfuse: { environment: "prod" } },
      { LANGFUSE_ENABLED: "false" },
    );
    expect(result.initialized === false, "tracing started");
    expect(
      (result.seen as string[]).length === 0,
      "a span reached the exporter",
    );
  },
);

await check(
  "BS04",
  "control: `enabled: false` in the options object keeps it off",
  async () => {
    const { result } = await variant({ langfuse: { enabled: false } });
    expect(result.initialized === false, "tracing started");
  },
);

await check(
  "BS04",
  "control: `langfuse: true` without keys still leaves tracing not started",
  async () => {
    const { result } = await variant({ langfuse: true });
    expect(result.initialized === false, "tracing started");
  },
);

// ---------------------------------------------------------------------------
// BS05: getTelemetryStatus().openTelemetry.enabled beside a host provider
// ---------------------------------------------------------------------------

type FullStatus = {
  enabled?: boolean;
  openTelemetry?: OtelStatus;
  exporters?: unknown[];
};

async function statusFor(host: boolean): Promise<FullStatus> {
  const receiver = await startReceiver();
  try {
    const { result } = await runScenario("status", {
      OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      ...(host ? { OBS_HOST_TRACER: "1" } : {}),
    });
    return result.status as FullStatus;
  } finally {
    await receiver.close();
  }
}

const besideHost = once(() => statusFor(true));

await check(
  "BS05",
  "beside a host TracerProvider, openTelemetry.enabled is what isOpenTelemetryInitialized() says (true)",
  async () => {
    const status = await besideHost();
    expect(status.enabled === true, "the top-level enabled is not true");
    expect(
      status.openTelemetry?.enabled === true,
      `openTelemetry.enabled is ${status.openTelemetry?.enabled}`,
    );
  },
);

await check(
  "BS05",
  "and usingExternalProvider and exporters are reported as additions",
  async () => {
    const status = await besideHost();
    expect(
      status.openTelemetry?.usingExternalProvider === true,
      "usingExternalProvider is missing",
    );
    expect(Array.isArray(status.exporters), "exporters is missing");
  },
);

// ---------------------------------------------------------------------------
// BS06: bundled consumers of the five subpath entries start tracing
// ---------------------------------------------------------------------------

const BUNDLED_ENTRIES = [
  "rag",
  "workflow",
  "evaluation",
  "processors",
  "autoresearch",
];
const INSTRUMENTATION_DIST =
  "./dist/services/server/ai/observability/instrumentation.js";
const PREVIOUS_SIDE_EFFECTS = [
  "**/*.css",
  "./dist/voice/index.js",
  "./dist/music/index.js",
  "./dist/avatar/index.js",
];

const bundled = once(async () => {
  const receiver = await startReceiver();
  try {
    const { result } = await runBs(
      "bundle",
      {
        OBS_ROOT: ROOT,
        OBS_WORK: join(tempDir("neurolink-obs-bc-setup-work-"), "work"),
        OBS_ENTRIES: [...BUNDLED_ENTRIES, "client", "."].join(","),
        LANGFUSE_PUBLIC_KEY: "pk-bs06",
        LANGFUSE_SECRET_KEY: "sk-bs06",
        LANGFUSE_BASE_URL: receiver.url,
      },
      [],
      BS_BUNDLER,
    );
    return result as Record<string, string>;
  } finally {
    await receiver.close();
  }
});

for (const entry of BUNDLED_ENTRIES) {
  await check(
    "BS06",
    `a bundler build of the ./${entry} entry registers NeuroLink's tracer provider`,
    async () => {
      const providers = await bundled();
      expect(
        providers[entry] === "NodeTracerProvider",
        `the provider is ${providers[entry]}`,
      );
    },
  );
}

await check(
  "BS06",
  "control: a bundle of the main entry starts tracing, and one of ./client still does not (the client entry loads no OpenTelemetry Node SDK)",
  async () => {
    const providers = await bundled();
    expect(providers["."] === "NodeTracerProvider", `main: ${providers["."]}`);
    expect(
      providers.client === "NoopTracerProvider",
      `client: ${providers.client}`,
    );
  },
);

await check(
  "BS06",
  "package.json lists the built start-up module in sideEffects and nothing else new",
  async () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { sideEffects?: unknown };
    expect(
      Array.isArray(manifest.sideEffects),
      "sideEffects is not a list of paths",
    );
    expect(
      JSON.stringify([...manifest.sideEffects].sort()) ===
        JSON.stringify([...PREVIOUS_SIDE_EFFECTS, INSTRUMENTATION_DIST].sort()),
      `sideEffects: ${JSON.stringify(manifest.sideEffects)}`,
    );
    expect(
      existsSync(join(ROOT, INSTRUMENTATION_DIST)),
      "the build does not emit the listed file",
    );
  },
);

// ---------------------------------------------------------------------------
// BS07: processors deep paths and the video analyzer start tracing; ./client stays out
// ---------------------------------------------------------------------------

const DEEP_ENTRIES: Record<string, string> = {
  "./processors/base/BaseFileProcessor": distUrl(
    "processors/base/BaseFileProcessor.js",
  ),
  "./processors/registry/ProcessorRegistry": distUrl(
    "processors/registry/ProcessorRegistry.js",
  ),
  "./adapters/video/videoAnalyzer": distUrl("adapters/video/videoAnalyzer.js"),
};

async function providerAfterImport(target: string): Promise<string> {
  const receiver = await startReceiver();
  try {
    const { result } = await runBs("entry-span", {
      OBS_TARGET: target,
      LANGFUSE_PUBLIC_KEY: "pk-bs07",
      LANGFUSE_SECRET_KEY: "sk-bs07",
      LANGFUSE_BASE_URL: receiver.url,
    });
    return String(result.provider);
  } finally {
    await receiver.close();
  }
}

for (const [entry, target] of Object.entries(DEEP_ENTRIES)) {
  await check(
    "BS07",
    `importing ${entry} and making a span registers NeuroLink's tracer provider`,
    async () => {
      const provider = await providerAfterImport(target);
      expect(provider === "NodeTracerProvider", `the provider is ${provider}`);
    },
  );
}

await check(
  "BS07",
  "control: the same span through the ./rag entry registers it, and through ./client it does not",
  async () => {
    expect(
      (await providerAfterImport(SUBPATH_ENTRIES["./rag"])) ===
        "NodeTracerProvider",
      "./rag does not start tracing",
    );
    expect(
      (await providerAfterImport(distUrl("client/index.js"))) ===
        "NoopTracerProvider",
      "./client starts tracing",
    );
  },
);

await check(
  "BS07",
  "the documentation tells a ./client user to import the package entry once at start-up",
  async () => {
    const guide = readFileSync(
      join(ROOT, "docs/features/observability.md"),
      "utf8",
    );
    expect(
      /`@juspay\/neurolink\/client`[^\n]*import "@juspay\/neurolink"/.test(
        guide,
      ) ||
        /import "@juspay\/neurolink"[^\n]*`@juspay\/neurolink\/client`/.test(
          guide,
        ),
      "no line pairs the client entry with a start-up import of the package entry",
    );
  },
);

// ---------------------------------------------------------------------------
// BS08: Langfuse environment and release read the released build's variables
// ---------------------------------------------------------------------------

const legacyNames = once(() =>
  envOnly({
    env: {
      LANGFUSE_ENVIRONMENT: "env-legacy",
      PUBLIC_APP_ENVIRONMENT: "env-app",
      PUBLIC_APP_VERSION: "9.9.9",
    },
  }),
);
const currentNames = once(() =>
  envOnly({
    env: {
      LANGFUSE_TRACING_ENVIRONMENT: "env-tracing",
      LANGFUSE_RELEASE: "rel-1.2.3",
      LANGFUSE_ENVIRONMENT: "env-legacy",
      PUBLIC_APP_VERSION: "9.9.9",
    },
  }),
);

await check(
  "BS08",
  "LANGFUSE_ENVIRONMENT, PUBLIC_APP_ENVIRONMENT and PUBLIC_APP_VERSION put no environment or release on the Langfuse spans",
  async () => {
    const { langfuse } = await legacyNames();
    const spans = spansAt(langfuse.hits, LANGFUSE_PATH);
    expect(spans.length > 0, "no spans reached Langfuse");
    const labelled = spans.filter(
      (span) =>
        "langfuse.environment" in span.attributes ||
        "langfuse.release" in span.attributes,
    );
    expect(
      labelled.length === 0,
      `${labelled.length} spans carry ${JSON.stringify(labelled[0]?.attributes["langfuse.environment"])} / ${JSON.stringify(labelled[0]?.attributes["langfuse.release"])}`,
    );
  },
);

await check(
  "BS08",
  "the same variables still fill the OTLP resource's deployment.environment and service.version",
  async () => {
    const { otlp } = await legacyNames();
    const resources = resourcesAt(
      otlp?.hits ?? [],
      OTLP_TRACES,
      "resourceSpans",
    );
    expect(resources.length > 0, "the collector received no trace");
    expect(
      resources.every(
        (resource) =>
          resource["deployment.environment"] === "env-legacy" &&
          resource["service.version"] === "9.9.9",
      ),
      `resource: ${JSON.stringify(resources[0])}`,
    );
  },
);

await check(
  "BS08",
  "control: LANGFUSE_TRACING_ENVIRONMENT and LANGFUSE_RELEASE label the Langfuse spans",
  async () => {
    const { langfuse } = await currentNames();
    expect(
      spansAt(langfuse.hits, LANGFUSE_PATH).some(
        (span) =>
          span.attributes["langfuse.environment"] === "env-tracing" &&
          span.attributes["langfuse.release"] === "rel-1.2.3",
      ),
      "no Langfuse span carries them",
    );
  },
);

// ---------------------------------------------------------------------------
// BS10: the decide WARNING span for an unconfigured decision site
// ---------------------------------------------------------------------------

const unconfiguredSite = once(async () => {
  const receiver = await startReceiver();
  try {
    const { result } = await runBs("decide", {
      OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
    });
    return { result, hits: receiver.hits };
  } finally {
    await receiver.close();
  }
});

await check(
  "BS10",
  "a site-stamped decision call without a decision provider still returns null",
  async () => {
    const { result } = await unconfiguredSite();
    expect(result.answer === null, `answer: ${JSON.stringify(result.answer)}`);
  },
);

await check(
  "BS10",
  "and exports the `decide` observation at level WARNING, as the released build did",
  async () => {
    const { hits } = await unconfiguredSite();
    const decide = spansAt(hits, OTLP_TRACES).filter(
      (span) => span.name === "decide",
    );
    expect(decide.length === 1, `${decide.length} decide spans`);
    expect(
      decide[0].attributes["langfuse.observation.level"] === "WARNING",
      `level: ${decide[0].attributes["langfuse.observation.level"]}`,
    );
  },
);

await check(
  "BS10",
  "while the host's decision hooks and decision events still do not run for that call",
  async () => {
    const { result } = await unconfiguredSite();
    expect(result.hookCalls === 0, `${result.hookCalls} hook calls`);
    expect(
      (result.events as string[]).length === 0,
      `events: ${(result.events as string[]).join(", ")}`,
    );
  },
);

// ---------------------------------------------------------------------------
// BS12: the exit flush, flush() and shutdown() hold the budget when a collector
// answers HTTP 5xx or 429, with and without a Retry-After
// ---------------------------------------------------------------------------

// The collectors run in this process and the child that exports to them is
// another one, as in a deployment: a collector sharing the exporting process
// would keep that process alive with its own keep-alive sockets.
const BS12_BUDGET_MS = 1_000;
const BS12_MARGIN_MS = 300;
const BS12_CEILING_MS = BS12_BUDGET_MS + BS12_MARGIN_MS;
const FAILING_COLLECTORS: [string, ReceiverMode][] = [
  ["HTTP 500", { status: 500 }],
  ["HTTP 503 with Retry-After: 1", { status: 503, retryAfter: "1" }],
  ["HTTP 503 with Retry-After: 60", { status: 503, retryAfter: "60" }],
  ["HTTP 429 with Retry-After: 5", { status: 429, retryAfter: "5" }],
];
const unhandled = (output: string): boolean =>
  /unhandled|UnhandledPromiseRejection/i.test(output);

for (const [sink, label] of [
  ["langfuse", "Langfuse"],
  ["otlp", "OTLP"],
] as const) {
  for (const [what, mode] of FAILING_COLLECTORS) {
    await check(
      "BS12",
      `a script that ends on its own exits within ${BS12_CEILING_MS} ms of its last call with the ${label} collector answering ${what} and a ${BS12_BUDGET_MS} ms budget`,
      async () => {
        const { run, langfuse, otlp } = await envOnly({
          exit: "natural",
          budgetMs: BS12_BUDGET_MS,
          ...(sink === "otlp" ? { otlp: mode } : { langfuseMode: mode }),
        });
        const failing = sink === "otlp" ? otlp : langfuse;
        expect(
          (failing?.hits.length ?? 0) > 0,
          "the exit flush never reached the failing collector",
        );
        expect(run.lingerMs !== undefined, "the exit time was not recorded");
        expect(
          run.lingerMs < BS12_CEILING_MS,
          `the process stayed ${run.lingerMs} ms after its last call`,
        );
        expect(!unhandled(run.output), "an unhandled rejection was reported");
      },
    );
  }

  await check(
    "BS12",
    `flushOpenTelemetry() and shutdown settle within ${BS12_CEILING_MS} ms with the ${label} collector answering HTTP 503 with Retry-After: 60`,
    async () => {
      const failing: ReceiverMode = { status: 503, retryAfter: "60" };
      const { run } = await envOnly({
        budgetMs: BS12_BUDGET_MS,
        ...(sink === "otlp" ? { otlp: failing } : { langfuseMode: failing }),
      });
      expect(
        (run.result.flushMs as number) < BS12_CEILING_MS,
        `the flush took ${run.result.flushMs} ms`,
      );
      expect(run.result.shutdown === "ok", `shutdown: ${run.result.shutdown}`);
      expect(
        (run.result.shutdownMs as number) < BS12_CEILING_MS,
        `shutdown took ${run.result.shutdownMs} ms`,
      );
      expect(!unhandled(run.output), "an unhandled rejection was reported");
    },
  );
}

for (const [sink, label] of [
  ["langfuse", "Langfuse"],
  ["otlp", "OTLP"],
] as const) {
  await check(
    "BS12",
    `with the default 3 s budget and the ${label} collector answering HTTP 500, a script that ends on its own exits within ${DEFAULT_BUDGET_MS + BS12_MARGIN_MS} ms of its last call`,
    async () => {
      const { run } = await envOnly({
        exit: "natural",
        budgetMs: DEFAULT_BUDGET_MS,
        ...(sink === "otlp"
          ? { otlp: { status: 500 } }
          : { langfuseMode: { status: 500 } }),
      });
      expect(run.lingerMs !== undefined, "the exit time was not recorded");
      expect(
        run.lingerMs < DEFAULT_BUDGET_MS + BS12_MARGIN_MS,
        `the process stayed ${run.lingerMs} ms after its last call`,
      );
    },
  );
}

await check(
  "BS12",
  "control: a delivery that finishes inside the budget is still delivered at exit, to both sinks",
  async () => {
    const { langfuse, otlp, run } = await envOnly({
      exit: "natural",
      budgetMs: 2_000,
      otlp: { delayMs: 300 },
      langfuseMode: { delayMs: 300 },
    });
    expect(run.lingerMs !== undefined, "the exit time was not recorded");
    expect(
      spanNames(langfuse.hits, LANGFUSE_PATH).some((name) =>
        /generate/.test(name),
      ),
      "no generate span reached Langfuse",
    );
    expect(
      spanNames(otlp?.hits ?? [], OTLP_TRACES).some((name) =>
        /generate/.test(name),
      ),
      "no generate span reached the OTLP collector",
    );
  },
);

await check(
  "BS12",
  `the exit code a script set is kept when the collector answers HTTP 503 with Retry-After: 60`,
  async () => {
    const receiver = await startReceiver({ status: 503, retryAfter: "60" });
    try {
      const { exitCode } = await runBs("exit-code", {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
      });
      expect(exitCode === 3, `exit code ${exitCode}`);
    } finally {
      await receiver.close();
    }
  },
);

// ---------------------------------------------------------------------------
// BS13: a collector that fails once and then goes silent does not hold the exit
// flush past the budget either
// ---------------------------------------------------------------------------

// The OTLP exporter retries 429, 502, 503 and 504 itself, sleeps the backoff
// (a Retry-After, else 1 s and growing) and hands the retried request the time
// that was left before the sleep, so a retry into silence outlives the budget
// by the backoff. Budgets of 1 s or less never retry (the backoff does not fit).
const BS13_MARGIN_MS = 300;
const FAILS_THEN_SILENT: [string, ReceiverMode][] = [
  [
    "HTTP 503 with Retry-After: 1",
    { status: 503, retryAfter: "1", silentAfter: 5 },
  ],
  ["HTTP 503 without Retry-After", { status: 503, silentAfter: 5 }],
];

for (const budgetMs of [2_000, DEFAULT_BUDGET_MS]) {
  for (const [what, mode] of FAILS_THEN_SILENT) {
    await check(
      "BS13",
      `a script that ends on its own exits within ${budgetMs + BS13_MARGIN_MS} ms of its last call with the OTLP collector answering ${what} once and then never answering, and a ${budgetMs} ms budget`,
      async () => {
        const { run, otlp } = await envOnly({
          exit: "natural",
          budgetMs,
          otlp: mode,
        });
        expect(
          (otlp?.hits.length ?? 0) >= 2,
          `the collector saw ${otlp?.hits.length ?? 0} requests, so no retry went into the silence`,
        );
        expect(run.lingerMs !== undefined, "the exit time was not recorded");
        expect(
          run.lingerMs < budgetMs + BS13_MARGIN_MS,
          `the process stayed ${run.lingerMs} ms after its last call`,
        );
      },
    );
  }
}

for (const [what, mode] of [
  ["HTTP 500", { status: 500, silentAfter: 5 }],
  [
    "HTTP 503 with Retry-After: 1",
    { status: 503, retryAfter: "1", silentAfter: 5 },
  ],
] as [string, ReceiverMode][]) {
  await check(
    "BS13",
    `the same for the Langfuse collector answering ${what} once and then never answering, with a 1000 ms budget`,
    async () => {
      const { run, langfuse } = await envOnly({
        exit: "natural",
        budgetMs: 1_000,
        langfuseMode: mode,
      });
      expect(
        langfuse.hits.length >= 1,
        "the exit flush never reached Langfuse",
      );
      expect(run.lingerMs !== undefined, "the exit time was not recorded");
      expect(
        run.lingerMs < 1_000 + BS13_MARGIN_MS,
        `the process stayed ${run.lingerMs} ms after its last call`,
      );
    },
  );
}

await check(
  "BS13",
  "flushOpenTelemetry() and shutdown settle within budget + 300 ms with the OTLP collector answering HTTP 503 with Retry-After: 1 once and then never answering",
  async () => {
    const { run } = await envOnly({
      budgetMs: 2_000,
      otlp: { status: 503, retryAfter: "1", silentAfter: 5 },
    });
    expect(
      (run.result.flushMs as number) < 2_000 + BS13_MARGIN_MS,
      `the flush took ${run.result.flushMs} ms`,
    );
    expect(run.result.shutdown === "ok", `shutdown: ${run.result.shutdown}`);
    expect(
      (run.result.shutdownMs as number) < 2_000 + BS13_MARGIN_MS,
      `shutdown took ${run.result.shutdownMs} ms`,
    );
  },
);

await check(
  "BS13",
  "control: after a flush that ran out of its budget on a silent collector, the next flush still delivers to a collector that answers again",
  async () => {
    const receiver = await startReceiver({
      status: 503,
      retryAfter: "1",
      silentAfter: 1,
    });
    try {
      const { result } = await runBs("reflush", {
        OTEL_EXPORTER_OTLP_ENDPOINT: receiver.url,
        OBS_CONFIG: JSON.stringify({ langfuse: { flushBudgetMs: 2_000 } }),
      });
      expect(result.first === "rejected", `first flush: ${result.first}`);
      expect(
        (result.firstMs as number) < 2_000 + BS13_MARGIN_MS,
        `the first flush took ${result.firstMs} ms`,
      );
      expect(result.second === "ok", `second flush: ${result.second}`);
      expect(
        spanNames(receiver.hits, OTLP_TRACES).some((name) =>
          /generate/.test(name),
        ),
        "no span reached the collector after the cut",
      );
    } finally {
      await receiver.close();
    }
  },
);

// ---- bc-reach (BR01..BR07) ----
//
// A caller's `mask` and `redactIO` act where they acted in the released build
// (fc892bbb5): on the content Langfuse is sent (input, output and metadata).
// Custom registry exporters, the OTLP exporter, getSpans() and error, status
// and exception text see raw values, and so does error, status and exception
// text on the Langfuse request: no automatic mask replaces anything in it,
// whatever the caller configured.
// One child process per policy (none, mask, redactIO) drives the built package
// against a fake OpenAI-compatible upstream (a tool round, a stream and a
// failing call whose error echoes the marker and a key), a decoding Langfuse
// receiver, a decoding OTLP receiver and a custom registry exporter.

const REACH_MARKER = "PII-MARKER-4821";
const REACH_MASKED = "<masked>";
const REACH_TOKEN = "sk-REACH0123456789abcdefghij";
const ZOD = import.meta.resolve("zod");
const BR_SCENARIO = join(tempDir("neurolink-obs-bc-reach-"), "reach.mjs");
const LANGFUSE_TRACES = "/api/public/otel/v1/traces";

type ReachPolicy = "none" | "mask" | "redact";
/** `<span name>|<attr | event:<name> | status>|<key>` to the text recorded there. */
type Rows = Record<string, string>;
type ReachRun = {
  langfuse: Rows;
  otlp: Rows;
  custom: Rows;
  sdk: Rows;
  outcomes: Record<string, string>;
};
type WireKv = {
  key: string;
  value?: {
    stringValue?: string;
    intValue?: string | number;
    doubleValue?: number;
    boolValue?: boolean;
  };
};
type WireSpanFull = {
  name: string;
  attributes?: WireKv[];
  events?: { name: string; attributes?: WireKv[] }[];
  status?: { message?: string };
};

function addRow(
  rows: Rows,
  span: string,
  where: string,
  key: string,
  text: string,
): void {
  const id = `${span}|${where}|${key}`;
  rows[id] = rows[id] === undefined ? text : `${rows[id]}\n${text}`;
}

function wireText(value: WireKv["value"]): string {
  if (value === undefined) {
    return "";
  }
  return String(
    value.stringValue ??
      value.intValue ??
      value.doubleValue ??
      value.boolValue ??
      "",
  );
}

function wireRows(hits: Hit[], path: string): Rows {
  const rows: Rows = {};
  const spans = hits
    .filter((hit) => hit.path === path)
    .flatMap(
      (hit) =>
        (hit.payload.resourceSpans ?? []) as {
          scopeSpans: { spans: WireSpanFull[] }[];
        }[],
    )
    .flatMap((group) => group.scopeSpans)
    .flatMap((scope) => scope.spans);
  for (const span of spans) {
    for (const kv of span.attributes ?? []) {
      addRow(rows, span.name, "attr", kv.key, wireText(kv.value));
    }
    for (const event of span.events ?? []) {
      for (const kv of event.attributes ?? []) {
        addRow(
          rows,
          span.name,
          `event:${event.name}`,
          kv.key,
          wireText(kv.value),
        );
      }
    }
    if (span.status?.message) {
      addRow(rows, span.name, "status", "message", span.status.message);
    }
  }
  return rows;
}

function rowsFromTuples(tuples: unknown): Rows {
  const rows: Rows = {};
  if (!Array.isArray(tuples)) {
    return rows;
  }
  for (const tuple of tuples as string[][]) {
    addRow(rows, tuple[0], tuple[1], tuple[2], tuple[3]);
  }
  return rows;
}

writeFileSync(
  BR_SCENARIO,
  `
import { writeSync } from "node:fs";
const env = process.env;
const MARKER = env.OBS_MARKER;
const MASKED = env.OBS_MASKED;
const policy = env.OBS_POLICY;
const { z } = await import(${JSON.stringify(ZOD)});
const { getExporterRegistry } = await import(${JSON.stringify(EXPORTER_REGISTRY)});
const { BaseExporter } = await import(${JSON.stringify(BASE_EXPORTER)});
const api = await import(${JSON.stringify(API)});
const dist = await import(${JSON.stringify(DIST)});

const rowsOf = (spans) => {
  const rows = [];
  for (const span of spans) {
    for (const [key, value] of Object.entries(span.attributes ?? {})) rows.push([span.name, "attr", key, typeof value === "string" ? value : String(JSON.stringify(value))]);
    for (const event of span.events ?? []) for (const [key, value] of Object.entries(event.attributes ?? {})) rows.push([span.name, "event:" + event.name, key, typeof value === "string" ? value : String(JSON.stringify(value))]);
    if (span.statusMessage) rows.push([span.name, "status", "message", span.statusMessage]);
  }
  return rows;
};
const seenByCustom = [];
class Capture extends BaseExporter {
  constructor() { super("capture", {}); }
  async initialize() { this.initialized = true; }
  async exportSpan(span) { seenByCustom.push(JSON.parse(JSON.stringify(span))); return { success: true, exportedCount: 1, durationMs: 0 }; }
  async exportBatch(spans) { for (const span of spans) await this.exportSpan(span); return { success: true, exportedCount: spans.length, durationMs: 0 }; }
  async flush() {}
  async shutdown() {}
  async healthCheck() { return { healthy: true, name: "capture", enabled: true, lastExportTime: 0, pendingSpans: 0, errors: [] }; }
}
const capture = new Capture();
await capture.initialize();
getExporterRegistry().register(capture);

const mask = ({ data }) => JSON.parse(JSON.stringify(data).replaceAll(MARKER, MASKED));
const langfuse = {
  publicKey: "pk-reach", secretKey: "sk-reach", baseUrl: env.OBS_INGEST_URL, flushAt: 1000,
  ...(policy === "mask" && { mask }),
  ...(policy === "redact" && { redactIO: true }),
};
const nl = new dist.NeuroLink({ observability: { langfuse } });
nl.registerTool("lookup", {
  name: "lookup", description: "look a value up", inputSchema: z.object({ q: z.string().optional() }),
  execute: async () => ({ found: true, note: "result " + MARKER }),
});
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const common = { provider: "openai", credentials, disableInternalFallback: true };
const outcomes = {};
const settle = async (name, run) => { try { await run(); outcomes[name] = "ok"; } catch (error) { outcomes[name] = "threw: " + String(error?.message ?? error).slice(0, 60); } };

await settle("tool", () => nl.generate({ ...common, model: "tool-model", input: { text: "prompt " + MARKER }, systemPrompt: "system " + MARKER, maxSteps: 3, context: { userId: "u1", sessionId: "s1", metadata: { note: "meta " + MARKER } } }));
await settle("stream", async () => { const result = await nl.stream({ ...common, model: "stream-model", input: { text: "stream prompt " + MARKER }, disableTools: true }); for await (const _chunk of result.stream) { /* drain */ } });
await settle("fail", () => nl.generate({ ...common, model: "fail-model", input: { text: "fail prompt " + MARKER }, disableTools: true }));
// A span another library made, carrying prompt and completion keys NeuroLink does not write.
api.trace.getTracer("host-library").startSpan("foreign.generation", { attributes: { "langfuse.observation.type": "generation", "ai.prompt": "foreign " + MARKER, "gen_ai.prompt": "foreign " + MARKER, "gen_ai.completion": "foreign " + MARKER } }).end();
const sdkSpans = JSON.parse(JSON.stringify(nl.getSpans()));
try { await dist.flushOpenTelemetry(); } catch { /* the failing call is part of the scenario */ }
await new Promise((resolve) => setTimeout(resolve, 500));
writeSync(1, "RESULT " + JSON.stringify({ outcomes, custom: rowsOf(seenByCustom), sdk: rowsOf(sdkSpans) }) + "\\n");
await dist.shutdownOpenTelemetry().catch(() => undefined);
process.exit(0);
`,
);

async function startReachUpstream(): Promise<{
  baseURL: string;
  close: () => Promise<void>;
}> {
  const server = createServer(async (req, res) => {
    const text = JSON.stringify(await readBody(req));
    const model = /"model":"([^"]*)"/.exec(text)?.[1] ?? "";
    if (model === "fail-model") {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            message: `upstream failed and echoed ${REACH_MARKER} key ${REACH_TOKEN}`,
            type: "server_error",
          },
        }),
      );
      return;
    }
    if (text.includes('"stream":true')) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const frame = (
        delta: JsonBody,
        finish: string | null,
        usage?: JsonBody,
      ) =>
        res.write(
          `data: ${JSON.stringify({
            id: "c1",
            object: "chat.completion.chunk",
            created: 1,
            model,
            choices: usage ? [] : [{ index: 0, delta, finish_reason: finish }],
            ...(usage && { usage }),
          })}\n\n`,
        );
      frame({ content: "stream answer " }, null);
      frame({ content: REACH_MARKER }, null);
      frame({}, "stop");
      frame({}, null, {
        prompt_tokens: 5,
        completion_tokens: 3,
        total_tokens: 8,
      });
      res.end("data: [DONE]\n\n");
      return;
    }
    const calling = model === "tool-model" && !text.includes("tool_call_id");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-fake",
        object: "chat.completion",
        created: 1,
        model,
        choices: [
          {
            index: 0,
            message: calling
              ? {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: "call_1",
                      type: "function",
                      function: {
                        name: "lookup",
                        arguments: JSON.stringify({ q: `arg ${REACH_MARKER}` }),
                      },
                    },
                  ],
                }
              : { role: "assistant", content: `answer ${REACH_MARKER}` },
            finish_reason: calling ? "tool_calls" : "stop",
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
      }),
    );
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => close(server),
  };
}

async function reachRun(policy: ReachPolicy): Promise<ReachRun> {
  const upstream = await startReachUpstream();
  const langfuse = await startReceiver("ok");
  const otlp = await startReceiver("ok");
  try {
    const { result, output } = await runBs(
      "reach",
      {
        OBS_POLICY: policy,
        OBS_MARKER: REACH_MARKER,
        OBS_MASKED: REACH_MASKED,
        OBS_OPENAI_URL: upstream.baseURL,
        OBS_INGEST_URL: langfuse.url,
        OTEL_EXPORTER_OTLP_ENDPOINT: otlp.url,
      },
      [],
      BR_SCENARIO,
    );
    expect(
      result.outcomes !== undefined,
      `the reach scenario reported no outcomes: ${output.slice(-300)}`,
    );
    return {
      langfuse: wireRows(langfuse.hits, LANGFUSE_TRACES),
      otlp: wireRows(otlp.hits, "/v1/traces"),
      custom: rowsFromTuples(result.custom),
      sdk: rowsFromTuples(result.sdk),
      outcomes: result.outcomes as Record<string, string>,
    };
  } finally {
    await upstream.close();
    await langfuse.close();
    await otlp.close();
  }
}

const reachRuns: Record<ReachPolicy, () => Promise<ReachRun>> = {
  none: once(() => reachRun("none")),
  mask: once(() => reachRun("mask")),
  redact: once(() => reachRun("redact")),
};

type Sink = "langfuse" | "otlp" | "custom" | "sdk";
const SINKS: [Sink, string][] = [
  ["langfuse", "the Langfuse request"],
  ["otlp", "the OTLP request"],
  ["custom", "a custom registry exporter"],
  ["sdk", "getSpans()"],
];

// What the released build masked, and removed with redactIO, on the Langfuse request.
const RELEASED_CONTENT_KEYS = new Set([
  "langfuse.observation.input",
  "langfuse.observation.output",
  "langfuse.trace.input",
  "langfuse.trace.output",
]);
const RELEASED_METADATA_PREFIXES = [
  "langfuse.observation.metadata.",
  "langfuse.trace.metadata.",
];
const keyOf = (row: string): string => row.split("|").slice(2).join("|");
const whereOf = (row: string): string => row.split("|")[1];
const isReleasedContent = (row: string): boolean =>
  whereOf(row) === "attr" && RELEASED_CONTENT_KEYS.has(keyOf(row));
const isReleasedMetadata = (row: string): boolean =>
  whereOf(row) === "attr" &&
  RELEASED_METADATA_PREFIXES.some((prefix) => keyOf(row).startsWith(prefix));
const rowsWithMarker = (rows: Rows): string[] =>
  Object.keys(rows).filter((row) => rows[row].includes(REACH_MARKER));

await check(
  "BR01",
  "precondition: with no policy every sink carries the marker in content rows, and the scenario's three calls ran",
  async () => {
    const none = await reachRuns.none();
    expect(
      none.outcomes.tool === "ok" && none.outcomes.stream === "ok",
      `outcomes: ${JSON.stringify(none.outcomes)}`,
    );
    for (const [sink, label] of SINKS) {
      const raw = rowsWithMarker(none[sink]);
      // getSpans() keeps its own record of each span, not the Langfuse keys.
      expect(
        sink === "sdk"
          ? raw.length > 0
          : raw.some(isReleasedContent) && raw.some(isReleasedMetadata),
        `${label} has no input, output or metadata row with the marker (${raw.length} rows)`,
      );
    }
    expect(
      rowsWithMarker(none.langfuse).some((row) => whereOf(row) === "status"),
      "the failing call left no status text with the marker on the Langfuse request",
    );
  },
);

await check(
  "BR01",
  "the Langfuse request masks input, output and metadata with a mask, as the released build did",
  async () => {
    const none = await reachRuns.none();
    const masked = await reachRuns.mask();
    const released = rowsWithMarker(none.langfuse).filter(
      (row) => isReleasedContent(row) || isReleasedMetadata(row),
    );
    expect(released.length > 0, "no released content rows to check");
    for (const row of released) {
      const text = masked.langfuse[row];
      expect(text !== undefined, `row ${row} is missing under the mask`);
      expect(
        text.includes(REACH_MASKED) && !text.includes(REACH_MARKER),
        `row ${row} is not masked`,
      );
    }
  },
);

await check(
  "BR01",
  "and removes input and output, and only those, with redactIO: metadata stays, as the released build did",
  async () => {
    const none = await reachRuns.none();
    const redacted = await reachRuns.redact();
    for (const row of Object.keys(none.langfuse).filter(isReleasedContent)) {
      expect(row in redacted.langfuse === false, `row ${row} was not removed`);
    }
    const metadata = rowsWithMarker(none.langfuse).filter(isReleasedMetadata);
    expect(metadata.length > 0, "no metadata rows to check");
    for (const row of metadata) {
      expect(
        redacted.langfuse[row]?.includes(REACH_MARKER) === true,
        `metadata row ${row} was touched by redactIO`,
      );
    }
  },
);

await check(
  "BR02",
  "error, status and exception text on the Langfuse request is not masked or removed by a mask or redactIO, as in the released build",
  async () => {
    const none = await reachRuns.none();
    const text = rowsWithMarker(none.langfuse).filter(
      (row) => !isReleasedContent(row) && !isReleasedMetadata(row),
    );
    expect(
      text.some((row) => whereOf(row) === "status") &&
        text.some((row) => keyOf(row) === "exception.message"),
      "the failing call recorded no status or exception text",
    );
    for (const policy of ["mask", "redact"] as const) {
      const run = await reachRuns[policy]();
      for (const row of text) {
        expect(
          run.langfuse[row]?.includes(REACH_MARKER) === true,
          `${policy}: row ${row} no longer carries the text`,
        );
      }
    }
  },
);

for (const [sink, label, id] of [
  ["custom", "a custom registry exporter", "BR03"],
  ["otlp", "the OTLP request", "BR04"],
  ["sdk", "getSpans()", "BR05"],
] as const) {
  await check(
    id,
    `${label} receives raw values with a mask and with redactIO: every row of the unprotected run is there, unchanged in kind`,
    async () => {
      const none = await reachRuns.none();
      const raw = rowsWithMarker(none[sink]);
      expect(raw.length > 0, `${label} carried no marker with no policy`);
      for (const policy of ["mask", "redact"] as const) {
        const run = await reachRuns[policy]();
        const missing = raw.filter((row) => run[sink][row] === undefined);
        expect(
          missing.length === 0,
          `${policy}: ${missing.length} rows removed, first ${missing[0]}`,
        );
        const changed = raw.filter(
          (row) => !run[sink][row].includes(REACH_MARKER),
        );
        expect(
          changed.length === 0,
          `${policy}: ${changed.length} rows no longer carry the marker, first ${changed[0]}`,
        );
        expect(
          Object.values(run[sink]).every(
            (text) => !text.includes(REACH_MASKED),
          ),
          `${policy}: a row carries the mask's output`,
        );
      }
    },
  );
}

await check(
  "BR06",
  "attributes the released build did not mask stay as they were on the Langfuse request: another library's prompt and completion keys",
  async () => {
    const none = await reachRuns.none();
    const foreign = Object.keys(none.langfuse).filter((row) =>
      row.startsWith("foreign.generation|attr|"),
    );
    expect(
      foreign.some((row) => keyOf(row) === "ai.prompt") &&
        foreign.some((row) => keyOf(row) === "gen_ai.completion"),
      `the foreign span did not reach Langfuse: ${foreign.join(", ")}`,
    );
    for (const policy of ["mask", "redact"] as const) {
      const run = await reachRuns[policy]();
      for (const row of foreign.filter((r) =>
        none.langfuse[r].includes(REACH_MARKER),
      )) {
        expect(
          run.langfuse[row]?.includes(REACH_MARKER) === true,
          `${policy}: ${row} was masked or removed`,
        );
      }
    }
  },
);

await check(
  "BR07",
  "an API key an upstream error echoes is recorded as given, with no policy and with a mask or redactIO: error, status and exception text carries it verbatim in every sink",
  async () => {
    const echoed = `upstream failed and echoed ${REACH_MARKER} key ${REACH_TOKEN}`;
    const none = await reachRuns.none();
    for (const [sink, label] of SINKS) {
      const keyed = Object.keys(none[sink]).filter(
        (row) =>
          !isReleasedContent(row) &&
          !isReleasedMetadata(row) &&
          none[sink][row].includes(REACH_TOKEN),
      );
      // getSpans() keeps the span's status message only; every exporter is
      // sent the error and exception attributes and the retry event as well.
      const recordedAs = ["status|message"].concat(
        sink === "sdk"
          ? []
          : [
              "attr|error.message",
              "attr|langfuse.observation.status_message",
              "event:gen_ai.provider.retry|retry.error",
              "event:exception|exception.message",
            ],
      );
      for (const kind of recordedAs) {
        expect(
          keyed.some((row) => row.split("|").slice(1).join("|") === kind),
          `${label} recorded no ${kind} text with the key (${keyed.length} rows)`,
        );
      }
      for (const policy of ["none", "mask", "redact"] as const) {
        const run = await reachRuns[policy]();
        for (const row of keyed) {
          const recorded = run[sink][row];
          expect(recorded !== undefined, `${policy}: ${label} lost row ${row}`);
          expect(
            recorded.includes(echoed),
            `${policy}: ${label} row ${row} does not hold the error text as given`,
          );
        }
        const replaced = Object.keys(run[sink]).filter(
          (row) =>
            !isReleasedContent(row) &&
            !isReleasedMetadata(row) &&
            (run[sink][row].includes(REACH_MASKED) ||
              run[sink][row].includes("[REDACTED]")),
        );
        expect(
          replaced.length === 0,
          `${policy}: ${label} replaced text in ${replaced.join(", ")}`,
        );
      }
    }
    // The caller's policy still acts, on the content rows only: the same run
    // that records the key in error text has no marker left in input, output
    // and metadata under a mask, and no input or output row under redactIO.
    const masked = await reachRuns.mask();
    expect(
      Object.keys(masked.langfuse)
        .filter((row) => isReleasedContent(row) || isReleasedMetadata(row))
        .every((row) => !masked.langfuse[row].includes(REACH_MARKER)),
      "mask: a Langfuse input, output or metadata row still carries the marker",
    );
    const redacted = await reachRuns.redact();
    expect(
      Object.keys(redacted.langfuse).filter(isReleasedContent).length === 0,
      "redactIO: a Langfuse input or output row was sent",
    );
  },
);

await openai.close();

console.log(
  failures === 0 ? "# all checks passed" : `# ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
