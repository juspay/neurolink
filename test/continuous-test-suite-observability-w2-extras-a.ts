#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability follow-up, extras A
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924). Every check prints one
 * line, `PROOF <extra> PASS|FAIL <what is checked>`, and the suite exits
 * non-zero when any check fails.
 *
 *   X07  synchronous telemetry code never throws into the traced call
 *   X09  re-parenting survives more than MAX_REMEMBERED_SPANS spans
 *   X40  a long-lived root keeps its children when its entry is evicted
 *   X10  cost is priced on the model that answered
 *   X11  status messages and exception events are recorded as the error gave
 *        them, key included; the caller's mask and redactIO leave them as
 *        recorded, in every sink
 *   X13  a host provider created with shutdownExporters: false leaves the
 *        shared Langfuse exporter up when it is shut down
 *   X24  an unconfigured process does not latch (why initialize() reruns)
 *   X25  `observability.langfuse: true` enables Langfuse
 *   X32  a host provider without a context manager is called out
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from
 * `src/lib/` and is on the `neurolink/e2e-tests-only` allow list. None of it
 * is reachable through `generate()` with a live provider:
 *   - more than 5,000 simultaneously open spans, an event stamped with an
 *     out-of-range time, a model call whose output has the wrong type and a
 *     response that names a different model than the request cannot come out
 *     of a real provider;
 *   - the Langfuse leg is read from a local OTLP receiver, and the host
 *     provider is torn down and rebuilt on demand;
 *   - a global tracer provider, with or without a context manager, can be
 *     registered once per process, so each of those cases runs in a child.
 *
 * Offline: every server is on 127.0.0.1 and nothing leaves the machine.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-w2-extras-a.ts
 */
import "./helpers/credentialFreeEnv.js";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import {
  context,
  ROOT_CONTEXT,
  SpanStatusCode,
  trace,
  type Span,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assert, defineSuite, runCommand } from "./helpers/harness.js";
import { MAX_REMEMBERED_SPANS } from "../src/lib/constants/telemetry.js";
import {
  ExporterRegistry,
  getExporterRegistry,
} from "../src/lib/observability/exporterRegistry.js";
import {
  createExporterSpanProcessor,
  ExporterSpanProcessor,
} from "../src/lib/observability/exporterSpanProcessor.js";
import { BaseExporter } from "../src/lib/observability/exporters/baseExporter.js";
import { LangfuseExporter } from "../src/lib/observability/exporters/langfuseExporter.js";
import { createOtlpSpanProcessor } from "../src/lib/services/server/ai/observability/otlpSetup.js";
import {
  ensureTelemetry,
  getLangfuseHealthStatus,
  shutdownOpenTelemetry,
} from "../src/lib/services/server/ai/observability/instrumentation.js";
import {
  observe,
  observeGeneration,
  observeTrace,
} from "../src/lib/telemetry/observation.js";
import { tracers } from "../src/lib/telemetry/tracers.js";
import { withGeneration, withSpan } from "../src/lib/telemetry/withSpan.js";
import { calculateCost } from "../src/lib/utils/pricing.js";
import type {
  ExporterHealthStatus,
  ExportResult,
  LangfuseExporterConfig,
  SpanData,
} from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";

const SELF = fileURLToPath(import.meta.url);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE_COMMIT = "fc892bbb5";
const CHILD_RESULT = "CHILD_RESULT ";
const MARKER = "PII-MARKER-7316";
const MASKED = "<masked>";
const API_KEY = "sk-abcdefghijklmnopqrstuvwxyz123456";
const ENV_SECRET_VALUE = "supersecretvalue99";
const PROVIDER_ERROR = `401 Incorrect API key provided: ${API_KEY}. OPENAI_API_KEY=${ENV_SECRET_VALUE}. Request was: ${MARKER}`;
const STATUS_MESSAGE_ATTRIBUTE = "langfuse.observation.status_message";
const COST_ATTRIBUTE = "langfuse.observation.cost_details";
const OBSERVATION = { "gen_ai.observation.type": "agent" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Wire shapes the receiver decodes
// ---------------------------------------------------------------------------

type OtlpKv = { key: string; value: { stringValue?: string } };
type WireSpan = {
  name: string;
  attributes: OtlpKv[];
  events: { name: string; attributes: OtlpKv[] }[];
  status?: { code?: number; message?: string };
};
type WireBody = {
  resourceSpans: { scopeSpans: { spans: WireSpan[] }[] }[];
};

// ---------------------------------------------------------------------------
// Local servers
// ---------------------------------------------------------------------------

type Receiver = {
  url: string;
  posts: () => string[];
  close: () => Promise<void>;
};

function listen(server: Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}

async function startReceiver(): Promise<Receiver> {
  const bodies: string[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      if (req.method === "POST") {
        bodies.push(Buffer.concat(chunks).toString("utf8"));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    posts: () => bodies,
    close: () => closeServer(server),
  };
}

function wireSpans(receiver: Receiver): WireSpan[] {
  return receiver
    .posts()
    .flatMap((text) =>
      (JSON.parse(text) as WireBody).resourceSpans.flatMap((resourceSpans) =>
        resourceSpans.scopeSpans.flatMap((scopeSpans) => scopeSpans.spans),
      ),
    );
}

// ---------------------------------------------------------------------------
// Exporter rigs
// ---------------------------------------------------------------------------

class RecordingExporter extends BaseExporter {
  readonly spans: SpanData[] = [];

  constructor(name = "recorder") {
    super(name, { enabled: true });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    this.spans.push(span);
    return this.createSuccessResult(1, 0);
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    this.spans.push(...spans);
    return this.createSuccessResult(spans.length, 0);
  }

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return this.createHealthStatus(true);
  }
}

class CapturingRegistry extends ExporterRegistry {
  readonly exported: SpanData[] = [];

  override async exportToAll(span: SpanData) {
    this.exported.push(span);
    return new Map<string, ExportResult>();
  }
}

function capturingPipeline() {
  const registry = new CapturingRegistry();
  const processor = new ExporterSpanProcessor(registry);
  const provider = new NodeTracerProvider({ spanProcessors: [processor] });
  return { registry, processor, tracer: provider.getTracer("sdk") };
}

type Pipeline = {
  registry: ExporterRegistry;
  exporter: LangfuseExporter;
  receiver: Receiver;
  recorder: RecordingExporter;
  provider: NodeTracerProvider;
  tracer: ReturnType<NodeTracerProvider["getTracer"]>;
  flush: () => Promise<void>;
  close: () => Promise<void>;
};

async function makePipeline(
  policy?: ContentPolicy,
  processorOptions?: { shutdownExporters?: boolean },
): Promise<Pipeline> {
  const receiver = await startReceiver();
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-xa",
    secretKey: "sk-xa",
    baseUrl: receiver.url,
    retries: 0,
    maxBufferSize: 10_000,
    flushIntervalMs: 60_000,
    ...policy,
  });
  await exporter.initialize();
  const recorder = new RecordingExporter();
  await recorder.initialize();
  const registry = new ExporterRegistry();
  registry.register(exporter);
  registry.register(recorder);
  const provider = new NodeTracerProvider({
    spanProcessors: [createExporterSpanProcessor(registry, processorOptions)],
  });
  return {
    registry,
    exporter,
    receiver,
    recorder,
    provider,
    tracer: provider.getTracer("sdk"),
    flush: () => registry.flushAll(),
    close: async () => {
      await provider.shutdown().catch(() => undefined);
      await exporter.shutdown().catch(() => undefined);
      await receiver.close();
    },
  };
}

/** What a caller sets on the Langfuse exporter. */
type ContentPolicy = Pick<LangfuseExporterConfig, "mask" | "redactIO">;

const maskMarker: NonNullable<ContentPolicy["mask"]> = ({ data }) =>
  JSON.parse(JSON.stringify(data).replaceAll(MARKER, MASKED));

async function failWith(
  tracer: Parameters<typeof withSpan>[0]["tracer"],
  message: string,
  name = "xa.failing",
): Promise<void> {
  await withSpan({ name, tracer }, async (span) => {
    observe(span, "span", { input: "x" });
    throw new Error(message);
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Scenarios that need a process of their own: a global tracer provider and the
// telemetry module state can be set once per process
// ---------------------------------------------------------------------------

async function runChild(scenario: string): Promise<void> {
  const url = process.env.XA_LANGFUSE_URL ?? "http://127.0.0.1:1";
  const warnings: string[] = [];
  const infos: string[] = [];
  logger.warn = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  logger.info = (...args: unknown[]) => {
    infos.push(String(args[0]));
  };
  const useKeys = () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-xa";
    process.env.LANGFUSE_SECRET_KEY = "sk-xa";
    process.env.LANGFUSE_BASE_URL = url;
  };
  const result: Record<string, unknown> = {};

  if (scenario.startsWith("cfg-")) {
    if (scenario.endsWith("-keys")) {
      useKeys();
    }
    ensureTelemetry({
      langfuse: scenario.startsWith("cfg-false") ? false : true,
    });
  } else if (scenario === "late-config") {
    ensureTelemetry();
    result.beforeConfig = getLangfuseHealthStatus().initialized;
    useKeys();
    ensureTelemetry();
  } else if (scenario.startsWith("host-")) {
    useKeys();
    trace.setGlobalTracerProvider(
      new BasicTracerProvider({
        spanProcessors: [new ExporterSpanProcessor(new ExporterRegistry())],
      }),
    );
    if (scenario === "host-with-cm") {
      context.setGlobalContextManager(
        new AsyncLocalStorageContextManager().enable(),
      );
    }
    ensureTelemetry();
  } else if (scenario === "owned-shutdown") {
    ensureTelemetry({
      langfuse: {
        publicKey: "pk-xa",
        secretKey: "sk-xa",
        baseUrl: url,
        flushInterval: 60,
      },
    });
    const span = tracers.sdk.startSpan("xa.owned");
    observe(span, "span", { input: "owned" });
    span.end();
    await shutdownOpenTelemetry();
    result.exporterInitialized =
      getExporterRegistry().get("langfuse")?.isInitialized() ?? null;
  }
  await sleep(50);
  const health = getLangfuseHealthStatus();
  process.stdout.write(
    `${CHILD_RESULT}${JSON.stringify({
      ...result,
      initialized: health.initialized,
      hasProcessor: health.hasProcessor,
      usingExternalProvider: health.usingExternalProvider,
      warnings,
      infos,
    })}\n`,
  );
  process.exit(0);
}

if (process.env.XA_CHILD) {
  await runChild(process.env.XA_CHILD);
}

type ChildResult = {
  initialized: boolean;
  hasProcessor: boolean;
  usingExternalProvider: boolean;
  warnings: string[];
  infos: string[];
  beforeConfig?: boolean;
  exporterInitialized?: boolean | null;
  posts: string[];
};

async function runScenario(scenario: string): Promise<ChildResult> {
  const receiver = await startReceiver();
  try {
    const result = await runCommand(
      process.execPath,
      ["--import", "tsx", SELF],
      {
        cwd: process.cwd(),
        timeoutMs: 90_000,
        env: {
          ...process.env,
          XA_CHILD: scenario,
          XA_LANGFUSE_URL: receiver.url,
        },
      },
    );
    const line = result.stdout
      .split("\n")
      .find((entry) => entry.startsWith(CHILD_RESULT));
    if (!line) {
      throw new Error(`scenario ${scenario} produced no result`);
    }
    await sleep(100);
    return {
      ...(JSON.parse(line.slice(CHILD_RESULT.length)) as Omit<
        ChildResult,
        "posts"
      >),
      posts: receiver.posts(),
    };
  } finally {
    await receiver.close();
  }
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

// Global host provider for the checks that use NeuroLink's own tracers: it
// records every span and feeds NeuroLink's exporter processor into a registry.
const hostSpans = new InMemorySpanExporter();
const hostRegistry = new ExporterRegistry();
const hostRecorder = new RecordingExporter("host-recorder");
hostRegistry.register(hostRecorder);
await hostRecorder.initialize();
new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(hostSpans),
    new ExporterSpanProcessor(hostRegistry),
  ],
}).register();

const unitSpans = new InMemorySpanExporter();
const unitProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(unitSpans)],
});

function written(run: (span: Span) => void): ReadableSpan["attributes"] {
  unitSpans.reset();
  const span = unitProvider.getTracer("unit").startSpan("unit");
  run(span);
  span.end();
  return unitSpans.getFinishedSpans()[0].attributes;
}

function finished(name: string): ReadableSpan {
  const found = hostSpans.getFinishedSpans().find((span) => span.name === name);
  assert(found !== undefined, "span not recorded");
  return found as ReadableSpan;
}

const { test, section, runSuite } = defineSuite(
  "Observability follow-up, extras A",
  { offline: true, perTestTimeoutMs: 180_000 },
);

async function proof(
  id: string,
  description: string,
  check: () => boolean | Promise<boolean>,
): Promise<void> {
  await test(`${id} ${description}`, async () => {
    let passed = false;
    let thrown = false;
    try {
      passed = await check();
    } catch (error) {
      thrown = true;
      process.stderr.write(
        `  [${id}] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    console.log(`PROOF ${id} ${passed ? "PASS" : "FAIL"} ${description}`);
    assert(passed, `${id} check ${thrown ? "threw" : "failed"}`);
  });
}

function throwsOf(runs: [string, () => unknown][]): string[] {
  const thrown: string[] = [];
  for (const [label, run] of runs) {
    try {
      run();
    } catch {
      thrown.push(label);
    }
  }
  return thrown;
}

function costOf(attributes: ReadableSpan["attributes"]): number | undefined {
  const raw = attributes[COST_ATTRIBUTE];
  return typeof raw === "string"
    ? (JSON.parse(raw) as { total?: number }).total
    : undefined;
}

const USAGE = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
function rate(model: string): number {
  return calculateCost("openai", model, {
    input: 1_000_000,
    output: 1_000_000,
    total: 2_000_000,
  });
}

function cost(call: Record<string, unknown>): number | undefined {
  return costOf(
    written((span) =>
      observeGeneration(span, { provider: "openai", usage: USAGE, ...call }),
    ),
  );
}

async function docsText(path: string): Promise<string> {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function baselineText(path: string): string {
  return execFileSync("git", ["show", `${BASELINE_COMMIT}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

void runSuite(async () => {
  // ----------------------------------------------------------------- X07
  section("X07 synchronous telemetry code never throws into the traced call");

  const cyclic: Record<string, unknown> = { a: 1 };
  cyclic.self = cyclic;
  const oddGenerations: [string, Record<string, unknown>][] = [
    ["output null", { output: null }],
    ["output [null]", { output: [null] }],
    ["output toolCalls object", { output: { toolCalls: {} } }],
    ["output toolCalls string", { output: { toolCalls: "x" } }],
    ["output toolCalls [null]", { output: { toolCalls: [null] } }],
    ["model number", { provider: "openai", model: 123, usage: USAGE }],
    ["provider object", { provider: {}, model: "m", usage: USAGE }],
    ["usage cyclic", { provider: "openai", model: "gpt-4o", usage: cyclic }],
    ["input cyclic", { input: cyclic }],
  ];

  await proof(
    "X07",
    "observe, observeGeneration and observeTrace return normally for out-of-type input",
    () => {
      const thrown = throwsOf([
        ...oddGenerations.map(([label, call]): [string, () => unknown] => [
          label,
          () =>
            written((span) =>
              observeGeneration(
                span,
                call as Parameters<typeof observeGeneration>[1],
              ),
            ),
        ]),
        [
          "observe metadata BigInt",
          () =>
            written((span) =>
              observe(span, "span", { metadata: { a: 1n } } as never),
            ),
        ],
        [
          "observeTrace metadata cyclic",
          () =>
            written((span) => observeTrace(span, { metadata: { a: cyclic } })),
        ],
      ]);
      if (thrown.length > 0) {
        process.stderr.write(`  [X07] threw: ${thrown.join(", ")}\n`);
      }
      return thrown.length === 0;
    },
  );

  await proof(
    "X07",
    "a well-formed observeGeneration still records its attributes",
    () => {
      const attributes = written((span) =>
        observeGeneration(span, {
          provider: "openai",
          model: "gpt-4o",
          output: { text: "ok" },
          usage: USAGE,
        }),
      );
      return (
        attributes["langfuse.observation.type"] === "generation" &&
        typeof attributes["langfuse.observation.output"] === "string" &&
        costOf(attributes) === rate("gpt-4o")
      );
    },
  );

  await proof(
    "X07",
    "withGeneration returns the model result when the recorded output has the wrong type",
    async () => {
      const result = await withGeneration(
        { provider: "openai", model: "gpt-4o" },
        async (span) => {
          observeGeneration(span, {
            output: null,
          } as unknown as Parameters<typeof observeGeneration>[1]);
          return "MODEL RESULT";
        },
      ).catch((error: unknown) => `threw ${String(error)}`);
      return result === "MODEL RESULT";
    },
  );

  await proof(
    "X07",
    "span.end() with an out-of-range event time does not reach the traced caller",
    async () => {
      const outcome = await withSpan(
        { name: "xa.poisoned", tracer: tracers.sdk },
        async (span) => {
          observe(span, "span", { input: "i" });
          span.addEvent("e", {}, 1e18);
          return "RESULT";
        },
      ).catch((error: unknown) => `caller saw ${String(error)}`);
      return outcome === "RESULT";
    },
  );

  await proof(
    "X07",
    "spans keep exporting after one that could not be converted",
    async () => {
      hostRecorder.spans.length = 0;
      await withSpan(
        { name: "xa.poisoned-again", tracer: tracers.sdk },
        async (span) => {
          observe(span, "span", {});
          span.addEvent("e", {}, Number.NaN);
        },
      ).catch(() => undefined);
      await withSpan(
        { name: "xa.healthy-after", tracer: tracers.sdk },
        async (span) => {
          observe(span, "span", { input: "ok" });
        },
      );
      await sleep(30);
      return hostRecorder.spans.some(
        (span) => span.name === "xa.healthy-after",
      );
    },
  );

  // ----------------------------------------------------------- X09 / X40
  section("X09 / X40 re-parenting under load");

  type Layout = "others-then-child" | "child-then-others";

  // A long-lived root, a child that ends while `open` unrelated spans are
  // still running: does the child export under the root?
  async function childWhileOpen(
    open: number,
    layout: Layout,
  ): Promise<boolean> {
    const { registry, tracer } = capturingPipeline();
    const root = tracer.startSpan("slow-root", { attributes: OBSERVATION });
    const inRoot = trace.setSpan(ROOT_CONTEXT, root);
    const startChild = () =>
      tracer.startSpan("child-of-root", { attributes: OBSERVATION }, inRoot);
    const startOthers = () =>
      Array.from({ length: open }, (_, index) =>
        tracer.startSpan(`other-${index}`, { attributes: OBSERVATION }),
      );
    const [child, others] =
      layout === "others-then-child"
        ? (() => {
            const started = startOthers();
            return [startChild(), started] as const;
          })()
        : ([startChild(), startOthers()] as const);
    child.end();
    root.end();
    others.forEach((span) => span.end());
    await sleep(10);
    const exported = registry.exported.find(
      (span) => span.name === "child-of-root",
    );
    return exported?.parentSpanId === root.spanContext().spanId;
  }

  // The parent ends first, then `ended` unrelated short spans start and end
  // one after another, then the child ends.
  async function childAfterChurn(ended: number): Promise<boolean> {
    const { registry, tracer } = capturingPipeline();
    const parent = tracer.startSpan("parent", { attributes: OBSERVATION });
    const child = tracer.startSpan(
      "child-of-parent",
      { attributes: OBSERVATION },
      trace.setSpan(ROOT_CONTEXT, parent),
    );
    parent.end();
    for (let index = 0; index < ended; index += 1) {
      tracer.startSpan(`unrelated-${index}`, { attributes: OBSERVATION }).end();
    }
    child.end();
    await sleep(10);
    const exported = registry.exported.find(
      (span) => span.name === "child-of-parent",
    );
    return exported?.parentSpanId === parent.spanContext().spanId;
  }

  await proof(
    "X40",
    "a child finds a long-lived root while fewer spans than the cap are open",
    () => childWhileOpen(10, "others-then-child"),
  );

  await proof(
    "X40",
    "a child finds a long-lived root that was evicted because more spans than the cap are open",
    () => childWhileOpen(MAX_REMEMBERED_SPANS, "others-then-child"),
  );

  await proof(
    "X09",
    "a child keeps its parent when the child itself is evicted from the open spans",
    () => childWhileOpen(MAX_REMEMBERED_SPANS + 1, "child-then-others"),
  );

  await proof(
    "X09",
    "a child keeps its parent when more than the cap of unrelated spans end after the parent",
    () => childAfterChurn(MAX_REMEMBERED_SPANS + 1),
  );

  await proof(
    "X09",
    "the open and ended maps stay within the cap and nothing stays pinned after churn",
    () => {
      const { processor, tracer } = capturingPipeline();
      const parent = tracer.startSpan("pinned-parent", {
        attributes: OBSERVATION,
      });
      const children = Array.from({ length: 50 }, (_, index) =>
        tracer.startSpan(
          `pinned-child-${index}`,
          { attributes: OBSERVATION },
          trace.setSpan(ROOT_CONTEXT, parent),
        ),
      );
      parent.end();
      const leaked = Array.from({ length: MAX_REMEMBERED_SPANS * 2 }, (_, i) =>
        tracer.startSpan(`leaked-${i}`, { attributes: OBSERVATION }),
      );
      for (let index = 0; index < MAX_REMEMBERED_SPANS * 3; index += 1) {
        tracer.startSpan(`short-${index}`, { attributes: OBSERVATION }).end();
      }
      const open = Reflect.get(processor, "open") as Map<string, unknown>;
      const ended = Reflect.get(processor, "ended") as Map<string, unknown>;
      const withinCap =
        open.size <= MAX_REMEMBERED_SPANS && ended.size <= MAX_REMEMBERED_SPANS;
      children.forEach((span) => span.end());
      leaked.forEach((span) => span.end());
      const pins = Reflect.get(processor, "pins") as
        | Map<string, number>
        | undefined;
      return withinCap && (pins?.size ?? 0) === 0;
    },
  );

  // ----------------------------------------------------------------- X10
  section("X10 cost is priced on the model that answered");

  await proof(
    "X10",
    "a routed request is priced on the model that served it",
    () =>
      cost({ model: "gpt-4o-mini", responseModel: "gpt-4o" }) ===
      rate("gpt-4o"),
  );

  await proof(
    "X10",
    "an aliased request is priced on the model that served it",
    () => cost({ model: "auto", responseModel: "gpt-4o" }) === rate("gpt-4o"),
  );

  await proof(
    "X10",
    "a served model without a price falls back to the requested model's price",
    () =>
      rate("gpt-4o-mini") > 0 &&
      cost({ model: "gpt-4o-mini", responseModel: "xa-unpriced-model-1" }) ===
        rate("gpt-4o-mini"),
  );

  await proof(
    "X10",
    "the same requested and served model is priced as before",
    () =>
      cost({ model: "gpt-4o", responseModel: "gpt-4o" }) === rate("gpt-4o") &&
      cost({ model: "gpt-4o-mini" }) === rate("gpt-4o-mini") &&
      cost({ responseModel: "gpt-4o" }) === rate("gpt-4o"),
  );

  // ----------------------------------------------------------------- X11
  section("X11 status messages and exception events");

  await proof(
    "X11",
    "a failed withSpan call records its status, status message attribute and exception event as the error gave them, key included",
    async () => {
      await failWith(tracers.sdk, PROVIDER_ERROR, "xa.cred-withspan");
      const span = finished("xa.cred-withspan");
      const exception = span.events.find((event) => event.name === "exception");
      return (
        span.status.message === PROVIDER_ERROR &&
        span.attributes[STATUS_MESSAGE_ATTRIBUTE] === PROVIDER_ERROR &&
        exception?.attributes?.["exception.message"] === PROVIDER_ERROR
      );
    },
  );

  await proof(
    "X11",
    "a status set directly on a NeuroLink span keeps its message as given, key included",
    () => {
      const span = tracers.sdk.startSpan("xa.cred-status");
      span.setStatus({ code: SpanStatusCode.ERROR, message: PROVIDER_ERROR });
      span.end();
      return finished("xa.cred-status").status.message === PROVIDER_ERROR;
    },
  );

  await proof(
    "X11",
    "an exception recorded directly on a NeuroLink span keeps its message as given, key included",
    () => {
      const span = tracers.sdk.startSpan("xa.cred-exception");
      span.recordException(new Error(PROVIDER_ERROR));
      span.end();
      const exception = finished("xa.cred-exception").events.find(
        (event) => event.name === "exception",
      );
      return exception?.attributes?.["exception.message"] === PROVIDER_ERROR;
    },
  );

  await proof(
    "X11",
    "an ordinary error message and the exception type are kept",
    async () => {
      await failWith(tracers.sdk, "upstream returned 502", "xa.plain-failure");
      const span = finished("xa.plain-failure");
      const exception = span.events.find((event) => event.name === "exception");
      return (
        span.status.message === "upstream returned 502" &&
        span.attributes[STATUS_MESSAGE_ATTRIBUTE] === "upstream returned 502" &&
        exception?.attributes?.["exception.message"] ===
          "upstream returned 502" &&
        exception?.attributes?.["exception.type"] === "Error"
      );
    },
  );

  async function exportedUnder(
    policy: ContentPolicy,
  ): Promise<{ span: SpanData; pipeline: Pipeline }> {
    const pipeline = await makePipeline(policy);
    await failWith(pipeline.tracer, `upstream said ${MARKER}`, "xa.policy");
    await sleep(20);
    const span = pipeline.recorder.spans.find((s) => s.name === "xa.policy");
    assert(span !== undefined, "span not exported");
    return { span: span as SpanData, pipeline };
  }

  function spanDataText(span: SpanData): string {
    return JSON.stringify({
      statusMessage: span.statusMessage,
      attributes: span.attributes,
      events: span.events,
    });
  }

  await proof(
    "X11",
    "the mask leaves the status message, its attribute and the exception event of an exported span as recorded, for a second exporter",
    async () => {
      const { span, pipeline } = await exportedUnder({
        mask: maskMarker,
        redactIO: false,
      });
      try {
        const text = spanDataText(span);
        return (
          text.includes(MARKER) &&
          !text.includes(MASKED) &&
          typeof span.statusMessage === "string"
        );
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X11",
    "redactIO leaves the status message text and the exception message of an exported span as recorded, for a second exporter",
    async () => {
      const { span, pipeline } = await exportedUnder({ redactIO: true });
      try {
        return spanDataText(span).includes(MARKER);
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X11",
    "the Langfuse request carries the status message and exception text as recorded under a mask, as in the released build",
    async () => {
      const pipeline = await makePipeline({
        mask: maskMarker,
        redactIO: false,
      });
      try {
        await failWith(pipeline.tracer, `upstream said ${MARKER}`, "xa.wire");
        await pipeline.flush();
        const wire = wireSpans(pipeline.receiver).find(
          (span) => span.name === "xa.wire",
        );
        return (
          wire !== undefined &&
          wire.status?.message === `upstream said ${MARKER}`
        );
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X11",
    "the OTLP span processor sends the status message and exception text as recorded, whatever mask and redactIO the caller set",
    async () => {
      const receiver = await startReceiver();
      try {
        const processor = createOtlpSpanProcessor(receiver.url, 2_000);
        if (processor === null) {
          throw new Error("no OTLP span processor was built");
        }
        const provider = new NodeTracerProvider({
          spanProcessors: [processor],
        });
        await failWith(provider.getTracer("otlp"), `upstream said ${MARKER}`);
        await provider.forceFlush();
        await provider.shutdown();
        const sent = receiver.posts().join("\n");
        return sent.includes(MARKER) && !sent.includes(MASKED);
      } finally {
        await receiver.close();
      }
    },
  );

  await proof(
    "X11",
    "the observability guide says error messages are recorded as received, with no credential masking of its own, and are outside mask and redactIO",
    async () => {
      const current = await docsText("docs/features/observability.md");
      const base = baselineText("docs/features/observability.md");
      const claim =
        /Everything else goes to Langfuse as it was recorded[^.]*status message/i;
      const redaction = /adds no credential masking of its own to error text/i;
      return (
        claim.test(current) && redaction.test(current) && !claim.test(base)
      );
    },
  );

  // ----------------------------------------------------------------- X13
  section("X13 shutting down a host provider");

  await proof(
    "X13",
    "the Langfuse exporter stays initialized when a host provider created with shutdownExporters: false is shut down and rebuilt",
    async () => {
      const pipeline = await makePipeline(undefined, {
        shutdownExporters: false,
      });
      try {
        await pipeline.provider.shutdown();
        const rebuilt = new NodeTracerProvider({
          spanProcessors: [
            createExporterSpanProcessor(pipeline.registry, {
              shutdownExporters: false,
            }),
          ],
        });
        const survived = pipeline.exporter.isInitialized();
        await rebuilt.shutdown();
        return survived;
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X13",
    "spans from a rebuilt host provider created with shutdownExporters: false still reach Langfuse",
    async () => {
      const pipeline = await makePipeline(undefined, {
        shutdownExporters: false,
      });
      try {
        const first = pipeline.tracer.startSpan("xa.before-rebuild", {
          attributes: OBSERVATION,
        });
        first.end();
        await pipeline.flush();
        const before = pipeline.receiver.posts().length;
        await pipeline.provider.shutdown();
        const rebuilt = new NodeTracerProvider({
          spanProcessors: [
            createExporterSpanProcessor(pipeline.registry, {
              shutdownExporters: false,
            }),
          ],
        });
        rebuilt
          .getTracer("sdk")
          .startSpan("xa.after-rebuild", { attributes: OBSERVATION })
          .end();
        await pipeline.flush();
        await sleep(50);
        return (
          before > 0 &&
          wireSpans(pipeline.receiver).some(
            (span) => span.name === "xa.after-rebuild",
          )
        );
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X13",
    "shutting a host provider down delivers the spans it still holds",
    async () => {
      const pipeline = await makePipeline();
      try {
        pipeline.tracer
          .startSpan("xa.held-at-shutdown", { attributes: OBSERVATION })
          .end();
        await pipeline.provider.shutdown();
        await sleep(50);
        return wireSpans(pipeline.receiver).some(
          (span) => span.name === "xa.held-at-shutdown",
        );
      } finally {
        await pipeline.close();
      }
    },
  );

  await proof(
    "X13",
    "shutdownOpenTelemetry still shuts the exporter of NeuroLink's own provider down and delivers its spans",
    async () => {
      const child = await runScenario("owned-shutdown");
      return (
        child.exporterInitialized === false &&
        child.posts.join("\n").includes("xa.owned")
      );
    },
  );

  // ----------------------------------------------------------------- X24
  section("X24 an unconfigured process does not latch");

  await proof(
    "X24",
    "a call made before anything is configured does not stop a later configuration from starting tracing",
    async () => {
      const child = await runScenario("late-config");
      return child.beforeConfig === false && child.initialized === true;
    },
  );

  // ----------------------------------------------------------------- X25
  section("X25 observability.langfuse: true");

  await proof(
    "X25",
    "langfuse: true without keys warns that the keys are missing, as an empty options object does, and starts nothing",
    async () => {
      const child = await runScenario("cfg-true-nokeys");
      return (
        child.initialized === false &&
        child.hasProcessor === false &&
        child.warnings.some((message) =>
          /publicKey and secretKey/.test(message),
        )
      );
    },
  );

  await proof(
    "X25",
    "langfuse: true with both keys registers the Langfuse exporter",
    async () => {
      const child = await runScenario("cfg-true-keys");
      return (
        child.initialized === true &&
        child.hasProcessor === true &&
        child.warnings.length === 0
      );
    },
  );

  await proof(
    "X25",
    "langfuse: false still disables Langfuse when both keys are set",
    async () => {
      const child = await runScenario("cfg-false-keys");
      return child.hasProcessor === false;
    },
  );

  // ----------------------------------------------------------------- X32
  section("X32 a host provider without a context manager");

  await proof(
    "X32",
    "a host provider with no context manager is warned about",
    async () => {
      const child = await runScenario("host-no-cm");
      return (
        child.usingExternalProvider === true &&
        child.warnings.some((message) => /context manager/i.test(message))
      );
    },
  );

  await proof(
    "X32",
    "a host provider with a context manager gets no such warning",
    async () => {
      const child = await runScenario("host-with-cm");
      return (
        child.usingExternalProvider === true &&
        !child.warnings.some((message) => /context manager/i.test(message))
      );
    },
  );

  await proof(
    "X32",
    "the host-provider log line says the host must register a context manager",
    async () => {
      const child = await runScenario("host-with-cm");
      return child.infos.some(
        (message) =>
          /Host TracerProvider detected/.test(message) &&
          /context manager/i.test(message),
      );
    },
  );

  await proof(
    "X32",
    "the observability guide says a host provider needs a context manager",
    async () => {
      const current = await docsText("docs/features/observability.md");
      const base = baselineText("docs/features/observability.md");
      const claim = /context manager/i;
      return claim.test(current) && !claim.test(base);
    },
  );
});
