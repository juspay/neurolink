#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability exporter pipeline and redaction
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924). Every check prints one
 * line, `PROOF <finding> PASS|FAIL <what is checked>`, and the suite exits
 * non-zero when any check fails.
 *
 *   K11  only observations reach Langfuse, from every tracer scope
 *   K14  parent ids from OpenTelemetry SDK 1.x and 2.x spans
 *   K21  mask and redactIO act on what is sent to Langfuse, as in the
 *        released build, and on no other sink
 *   K25  resource, links and nanosecond times survive the wire; scope and kind
 *        are the sdk and INTERNAL Langfuse has always received
 *   K26  flush and shutdown have a deadline
 *   K28  dropped spans are reported, counted and seen by the circuit breaker
 *   K07  NEUROLINK_RECORD_INPUTS=false keeps inputs out of traces
 *   K12  model-request input is redacted exactly once
 *   K13  the credential pattern runs in linear time
 *   K27  plain text under a data/image/bytes key keeps its content
 *   K32  nothing is built for a span that is not recording
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from
 * `src/lib/` and is on the `neurolink/e2e-tests-only` allow list. None of it
 * is reachable through `generate()` with a live provider:
 *   - the Langfuse leg is read from a local OTLP receiver that can refuse,
 *     hold or fail requests on demand (an unreachable Langfuse, a 500, a
 *     black-holed connection);
 *   - the OpenTelemetry SDK 1.x span shape is not installed (only 2.x is), so
 *     it is reproduced as a fixture;
 *   - exact nanosecond timestamps, a sampled-out span, a value that counts how
 *     often it is read and an 80 KB adversarial string cannot come out of a
 *     model call.
 * The end-to-end halves (a real `NeuroLink.generate()` with a registered tool
 * against a fake OpenAI-compatible server, and the owned-provider path with
 * `observability.langfuse` and `OTEL_EXPORTER_OTLP_ENDPOINT`, run in child
 * processes) drive the same code from the public class.
 *
 * Offline: every server is on 127.0.0.1 and nothing leaves the machine.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-exporter-redaction.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROOT_CONTEXT, SpanKind, trace, type Span } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  AlwaysOffSampler,
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { z } from "zod";
import { assert, defineSuite, runCommand } from "./helpers/harness.js";
import {
  ExporterRegistry,
  getExporterRegistry,
} from "../src/lib/observability/exporterRegistry.js";
import { ExporterSpanProcessor } from "../src/lib/observability/exporterSpanProcessor.js";
import { BaseExporter } from "../src/lib/observability/exporters/baseExporter.js";
import { LangfuseExporter } from "../src/lib/observability/exporters/langfuseExporter.js";
import {
  ensureTelemetry,
  flushOpenTelemetry,
} from "../src/lib/services/server/ai/observability/instrumentation.js";
import {
  redactSpanContent,
  spanContentAttribute,
  spanModelRequestAttribute,
} from "../src/lib/telemetry/attributes.js";
import {
  observe,
  observeGeneration,
  observeTrace,
} from "../src/lib/telemetry/observation.js";
import {
  binaryPlaceholder,
  redactSecretAssignments,
} from "../src/lib/telemetry/spanSanitizer.js";
import { tracers } from "../src/lib/telemetry/tracers.js";
import {
  SpanStatus,
  SpanType,
  type ExporterHealthStatus,
  type ExportResult,
  type LangfuseExporterConfig,
  type SpanData,
} from "../src/lib/types/index.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { logger } from "../src/lib/utils/logger.js";

const SELF = fileURLToPath(import.meta.url);
const MARKER = "PII-MARKER-4821";
const MASKED = "<masked>";
const CHILD_RESULT = "CHILD_RESULT ";

// ---------------------------------------------------------------------------
// Wire shapes the receivers decode
// ---------------------------------------------------------------------------

type OtlpValue = {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
};
type OtlpKv = { key: string; value: OtlpValue };
type WireSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpKv[];
  events: { name: string; timeUnixNano: string; attributes: OtlpKv[] }[];
  links?: { traceId: string; spanId: string; attributes?: OtlpKv[] }[];
};
type WireBody = {
  resourceSpans: {
    resource?: { attributes: OtlpKv[] };
    scopeSpans: {
      scope?: { name?: string; version?: string };
      spans: WireSpan[];
    }[];
  }[];
};
type Wire = {
  span: WireSpan;
  resource: OtlpKv[];
  scope: { name?: string; version?: string };
};

function attrOf(attributes: OtlpKv[] | undefined, key: string) {
  const value = attributes?.find((entry) => entry.key === key)?.value;
  return (
    value?.stringValue ??
    value?.intValue ??
    (value?.doubleValue === undefined
      ? undefined
      : String(value.doubleValue)) ??
    (value?.boolValue === undefined ? undefined : String(value.boolValue))
  );
}

// ---------------------------------------------------------------------------
// Local servers
// ---------------------------------------------------------------------------

type ReceivedRequest = { method: string; path: string; text: string };
type Reply = { status?: number; hold?: boolean };
type Receiver = {
  url: string;
  requests: ReceivedRequest[];
  posts: () => ReceivedRequest[];
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

async function startReceiver(
  reply: (request: ReceivedRequest, postIndex: number) => Reply = () => ({}),
): Promise<Receiver> {
  const requests: ReceivedRequest[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const request = {
        method: req.method ?? "",
        path: req.url ?? "",
        text: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(request);
      const postIndex = requests.filter((r) => r.method === "POST").length - 1;
      const { status = 200, hold = false } = reply(request, postIndex);
      if (hold) {
        return;
      }
      res.writeHead(status, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    posts: () => requests.filter((request) => request.method === "POST"),
    close: () => closeServer(server),
  };
}

async function closedPortUrl(): Promise<string> {
  const server = createServer();
  const port = await listen(server);
  await closeServer(server);
  return `http://127.0.0.1:${port}`;
}

function wireSpans(receiver: Receiver): Wire[] {
  return receiver.posts().flatMap((request) => {
    const body = JSON.parse(request.text) as WireBody;
    return body.resourceSpans.flatMap((resourceSpans) =>
      resourceSpans.scopeSpans.flatMap((scopeSpans) =>
        scopeSpans.spans.map((span) => ({
          span,
          resource: resourceSpans.resource?.attributes ?? [],
          scope: scopeSpans.scope ?? {},
        })),
      ),
    );
  });
}

// ---------------------------------------------------------------------------
// Exporter pipeline rig
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

type Rig = {
  registry: ExporterRegistry;
  exporter: LangfuseExporter;
  processor: ExporterSpanProcessor;
  receiver: Receiver;
  tracer: (
    scope: string,
    version?: string,
  ) => ReturnType<NodeTracerProvider["getTracer"]>;
  flush: () => Promise<void>;
  wire: () => Wire[];
  close: () => Promise<void>;
};

async function makeRig(
  options: {
    exporter?: Partial<LangfuseExporterConfig>;
    resource?: Record<string, string>;
    reply?: (request: ReceivedRequest, postIndex: number) => Reply;
    baseUrl?: string;
  } = {},
): Promise<Rig> {
  const receiver = await startReceiver(options.reply);
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-er",
    secretKey: "sk-er",
    baseUrl: options.baseUrl ?? receiver.url,
    retries: 0,
    maxBufferSize: 10_000,
    flushIntervalMs: 60_000,
    ...options.exporter,
  });
  await exporter.initialize();
  const registry = new ExporterRegistry();
  registry.register(exporter);
  const processor = new ExporterSpanProcessor(registry);
  const provider = new NodeTracerProvider({
    ...(options.resource && {
      resource: resourceFromAttributes(options.resource),
    }),
    spanProcessors: [processor],
  });
  return {
    registry,
    exporter,
    processor,
    receiver,
    tracer: (scope, version) => provider.getTracer(scope, version),
    flush: () => processor.forceFlush(),
    wire: () => wireSpans(receiver),
    close: async () => {
      await provider.shutdown().catch(() => undefined);
      await receiver.close();
    },
  };
}

function observed(span: Span): Span {
  observe(span, "span", {});
  return span;
}

function childOf(parent: Span) {
  return trace.setSpan(ROOT_CONTEXT, parent);
}

let spanCounter = 0;
function spanData(extra: Partial<SpanData> = {}): SpanData {
  spanCounter += 1;
  const stamp = String(spanCounter).padStart(16, "0");
  return {
    spanId: stamp,
    traceId: stamp.repeat(2),
    type: SpanType.CUSTOM,
    name: `span-${spanCounter}`,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-01T00:00:00.100Z",
    status: SpanStatus.OK,
    attributes: {},
    events: [],
    links: [],
    ...extra,
  };
}

async function timed(run: () => Promise<unknown>): Promise<number> {
  const started = Date.now();
  await run();
  return Date.now() - started;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withEnv<T>(name: string, value: string | undefined, run: () => T): T {
  const saved = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    return run();
  } finally {
    if (saved === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = saved;
    }
  }
}

async function withEnvAsync<T>(
  name: string,
  value: string | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const saved = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    return await run();
  } finally {
    if (saved === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = saved;
    }
  }
}

// ---------------------------------------------------------------------------
// Recording provider for the unit-level checks
// ---------------------------------------------------------------------------

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

const offProvider = new NodeTracerProvider({ sampler: new AlwaysOffSampler() });

function countingContent() {
  const reads = { count: 0 };
  return {
    reads,
    value: {
      toJSON() {
        reads.count += 1;
        return { text: "counted" };
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Owned-provider scenario, run in a child process (a global provider can be
// registered once per process)
// ---------------------------------------------------------------------------

async function runChild(scenario: string): Promise<void> {
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = process.env.ER_OTLP_URL;
  const seen: string[] = [];
  const mask = ({ data }: { data: unknown }) => {
    seen.push(JSON.stringify(data));
    return JSON.parse(JSON.stringify(data).replaceAll(MARKER, MASKED));
  };
  const langfuse: Record<string, unknown> = {
    publicKey: "pk-child",
    secretKey: "sk-child",
    baseUrl: process.env.ER_LANGFUSE_URL,
    ...(scenario === "mask" && { mask }),
    ...(scenario === "redact" && { redactIO: true }),
  };
  const second = new RecordingExporter("second");
  getExporterRegistry().register(second);
  await second.initialize();
  ensureTelemetry({ langfuse });
  const span = tracers.sdk.startSpan("scenario.generate");
  observe(span, "generation", {
    input: `prompt ${MARKER}`,
    output: `answer ${MARKER}`,
    ...(scenario !== "redact" && { metadata: { note: `note ${MARKER}` } }),
  });
  span.addEvent("proxy.upstream.response_body", {
    "proxy.body": `body ${MARKER}`,
  });
  span.setAttribute(
    "gen_ai.response.tool_calls",
    `[{"name":"lookup","arguments":"${MARKER}"}]`,
  );
  span.end();
  await flushOpenTelemetry();
  await sleep(200);
  process.stdout.write(
    `${CHILD_RESULT}${JSON.stringify({ recorded: second.spans, seen })}\n`,
  );
  process.exit(0);
}

if (process.env.ER_CHILD) {
  await runChild(process.env.ER_CHILD);
}

type ScenarioResult = {
  /** Attributes of the scenario span, then of its events, as the Langfuse request carries them. */
  langfuseAttrs: Record<string, string>;
  langfuseEventAttrs: Record<string, string>;
  langfuse: string;
  otlp: string;
  recorded: string;
  seen: string[];
  langfuseNames: string[];
};

async function runScenario(scenario: string): Promise<ScenarioResult> {
  const langfuse = await startReceiver();
  const otlp = await startReceiver();
  try {
    const result = await runCommand(
      process.execPath,
      ["--import", "tsx", SELF],
      {
        cwd: process.cwd(),
        timeoutMs: 90_000,
        env: {
          ...process.env,
          ER_CHILD: scenario,
          ER_LANGFUSE_URL: langfuse.url,
          ER_OTLP_URL: otlp.url,
        },
      },
    );
    const line = result.stdout
      .split("\n")
      .find((entry) => entry.startsWith(CHILD_RESULT));
    if (!line) {
      throw new Error(`scenario ${scenario} produced no result`);
    }
    const child = JSON.parse(line.slice(CHILD_RESULT.length)) as {
      recorded: unknown;
      seen: string[];
    };
    await sleep(100);
    const scenarioSpan = wireSpans(langfuse).find(
      (entry) => entry.span.name === "scenario.generate",
    )?.span;
    const flatten = (attributes: OtlpKv[] | undefined) =>
      Object.fromEntries(
        (attributes ?? []).map((entry) => [
          entry.key,
          attrOf(attributes, entry.key) ?? "",
        ]),
      );
    return {
      langfuseAttrs: flatten(scenarioSpan?.attributes),
      langfuseEventAttrs: flatten(
        scenarioSpan?.events.flatMap((event) => event.attributes),
      ),
      langfuse: langfuse
        .posts()
        .map((request) => request.text)
        .join("\n"),
      otlp: otlp
        .posts()
        .map((request) => request.text)
        .join("\n"),
      recorded: JSON.stringify(child.recorded),
      seen: child.seen,
      langfuseNames: wireSpans(langfuse).map((entry) => entry.span.name),
    };
  } finally {
    await langfuse.close();
    await otlp.close();
  }
}

// ---------------------------------------------------------------------------
// A fake OpenAI-compatible upstream for the end-to-end checks
// ---------------------------------------------------------------------------

const PROMPT_MARKER = "PROMPT-MARKER-7f3a91";
const TOOL_ARGS = { q: "needle-ARG-MARKER-31" };

function chatBody(toolDone: boolean) {
  const calling = !toolDone;
  return {
    id: "chatcmpl-fake",
    object: "chat.completion",
    created: 1,
    model: "tool-model",
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
                    arguments: JSON.stringify(TOOL_ARGS),
                  },
                },
              ],
            }
          : { role: "assistant", content: "hello there" },
        finish_reason: calling ? "tool_calls" : "stop",
      },
    ],
    usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
  };
}

async function startOpenAI(): Promise<{
  baseURL: string;
  close: () => Promise<void>;
}> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(chatBody(text.includes("tool_call_id"))));
    });
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => closeServer(server),
  };
}

// ---------------------------------------------------------------------------
// Global host provider for the end-to-end checks: records every span and also
// feeds NeuroLink's exporter processor into a private registry.
// ---------------------------------------------------------------------------

const hostSpans = new InMemorySpanExporter();
const hostRegistry = new ExporterRegistry();
const hostRecorder = new RecordingExporter("host-recorder");
hostRegistry.register(hostRecorder);
await hostRecorder.initialize();
const hostProvider = new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(hostSpans),
    new ExporterSpanProcessor(hostRegistry),
  ],
});
hostProvider.register();
process.env.NEUROLINK_SKIP_MCP = "true";

async function turn(): Promise<{
  spans: ReadableSpan[];
  recorded: SpanData[];
}> {
  hostSpans.reset();
  hostRecorder.spans.length = 0;
  const fake = await startOpenAI();
  try {
    const nl = new NeuroLink();
    nl.registerTool("lookup", {
      name: "lookup",
      description: "look a value up",
      inputSchema: z.object({ q: z.string().optional() }),
      execute: async () => ({ found: true }),
    } as never);
    await nl.generate({
      input: { text: PROMPT_MARKER },
      provider: "openai",
      model: "tool-model",
      credentials: { openai: { apiKey: "test-key", baseURL: fake.baseURL } },
      disableInternalFallback: true,
      maxSteps: 3,
    } as never);
    await hostProvider.forceFlush();
    return {
      spans: hostSpans.getFinishedSpans(),
      recorded: [...hostRecorder.spans],
    };
  } finally {
    await fake.close();
  }
}

function observationsOf(spans: ReadableSpan[], type: string): ReadableSpan[] {
  return spans.filter(
    (span) => span.attributes["langfuse.observation.type"] === type,
  );
}

function everyAttributeText(spans: ReadableSpan[]): string {
  return JSON.stringify(
    spans.map((span) => ({ attributes: span.attributes, events: span.events })),
  );
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

const { test, section, runSuite } = defineSuite(
  "Observability exporter pipeline and redaction",
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

const NEUROLINK_SCOPES = [
  ...readFileSync(
    new URL("../src/lib/telemetry/tracers.ts", import.meta.url),
    "utf8",
  ).matchAll(/scrubbedTracer\("([\w-]+)"\)/g),
].map((match) => match[1]);

void runSuite(async () => {
  // ----------------------------------------------------------------- K11
  section("K11 spans that are not observations");

  await proof(
    "K11",
    "an observation from every NeuroLink tracer scope reaches Langfuse, and a plain span from none of them does",
    async () => {
      assert(NEUROLINK_SCOPES.length >= 18, "tracer scopes not parsed");
      const rig = await makeRig();
      try {
        for (const scope of NEUROLINK_SCOPES) {
          rig
            .tracer(scope)
            .startSpan(`neurolink.${scope}.plain`, {
              attributes: { "rag.query_length": 3 },
            })
            .end();
          observed(
            rig.tracer(scope).startSpan(`neurolink.${scope}.step`, {
              attributes: { "rag.query_length": 3 },
            }),
          ).end();
        }
        await rig.flush();
        const names = rig.wire().map((entry) => entry.span.name);
        return NEUROLINK_SCOPES.every(
          (scope) =>
            names.includes(`neurolink.${scope}.step`) &&
            !names.includes(`neurolink.${scope}.plain`),
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K11",
    "an internal wrapper is dropped and its child re-parents to the nearest exported ancestor",
    async () => {
      const rig = await makeRig();
      try {
        const root = rig.tracer("sdk").startSpan("generate");
        observe(root, "agent", { input: "hi" });
        const wrapper = observed(
          rig.tracer("mcp").startSpan(
            "tool.registry.execute",
            {
              attributes: { "langfuse.internal": true },
            },
            childOf(root),
          ),
        );
        const rag = observed(
          rig.tracer("rag").startSpan(
            "neurolink.rag.search",
            {
              attributes: { "rag.top_k": 5 },
            },
            childOf(wrapper),
          ),
        );
        const generation = rig
          .tracer("generation")
          .startSpan("model.generation", {}, childOf(rag));
        observe(generation, "generation", { input: "q" });
        generation.end();
        rag.end();
        wrapper.end();
        root.end();
        await rig.flush();
        const byName = new Map(
          rig.wire().map((entry) => [entry.span.name, entry.span]),
        );
        return (
          !byName.has("tool.registry.execute") &&
          byName.get("neurolink.rag.search")?.parentSpanId ===
            root.spanContext().spanId &&
          byName.get("model.generation")?.parentSpanId ===
            rag.spanContext().spanId
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K11",
    "a span from a scope that is not NeuroLink's and has no GenAI attributes is not exported",
    async () => {
      const rig = await makeRig();
      try {
        rig
          .tracer("@opentelemetry/instrumentation-http")
          .startSpan("GET /health", { attributes: { "http.method": "GET" } })
          .end();
        observed(rig.tracer("rag").startSpan("neurolink.rag.search")).end();
        await rig.flush();
        const names = rig.wire().map((entry) => entry.span.name);
        return (
          names.includes("neurolink.rag.search") &&
          !names.includes("GET /health")
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K11",
    "end to end: tool wrapper spans stay out of the registry, and so does every span that is not an observation",
    async () => {
      const { spans, recorded } = await turn();
      const wrappers = spans.filter((span) =>
        ["tools.execute_custom", "tool.registry.execute"].includes(span.name),
      );
      assert(wrappers.length > 0, "no wrapper span was produced");
      const wrapperNames = new Set(wrappers.map((span) => span.name));
      const plain = recorded.filter(
        (span) =>
          span.attributes["langfuse.observation.type"] === undefined &&
          !Object.keys(span.attributes).some((key) =>
            key.startsWith("gen_ai."),
          ),
      );
      return (
        wrappers.every(
          (span) => span.attributes["langfuse.internal"] === true,
        ) &&
        recorded.every((span) => !wrapperNames.has(span.name)) &&
        recorded.length > 0 &&
        plain.length === 0
      );
    },
  );

  // ----------------------------------------------------------------- K14
  section("K14 parent ids across OpenTelemetry SDK majors");

  type Fixture = Span & ReadableSpan;
  function fixtureSpan(options: {
    sdk: 1 | 2;
    spanId: string;
    parentSpanId?: string;
    attributes?: Record<string, string | boolean>;
    scope?: string;
  }): Fixture {
    const traceId = "a".repeat(32);
    const common = {
      name: `fixture-${options.spanId}`,
      kind: SpanKind.INTERNAL,
      startTime: [1_700_000_000, 0],
      endTime: [1_700_000_001, 0],
      duration: [1, 0],
      status: { code: 0 },
      attributes: options.attributes ?? {},
      links: [],
      events: [],
      ended: true,
      resource: { attributes: {} },
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
      spanContext: () => ({ traceId, spanId: options.spanId, traceFlags: 1 }),
      setAttributes() {
        return this;
      },
      isRecording: () => true,
    };
    const scope = { name: options.scope ?? "sdk" };
    return (
      options.sdk === 2
        ? {
            ...common,
            parentSpanContext: options.parentSpanId && {
              traceId,
              spanId: options.parentSpanId,
              traceFlags: 1,
            },
            instrumentationScope: scope,
          }
        : {
            ...common,
            parentSpanId: options.parentSpanId,
            instrumentationLibrary: scope,
          }
    ) as never;
  }

  function fixtureProcessor() {
    const registry = new ExporterRegistry();
    const recorder = new RecordingExporter();
    registry.register(recorder);
    return { processor: new ExporterSpanProcessor(registry), recorder };
  }

  for (const sdk of [2, 1] as const) {
    await proof(
      "K14",
      `SDK ${sdk} shape: the parent id of an exported span is kept`,
      async () => {
        const { processor, recorder } = fixtureProcessor();
        await recorder.initialize();
        const parent = fixtureSpan({
          sdk,
          spanId: "b".repeat(16),
          attributes: { "langfuse.observation.type": "agent" },
        });
        const child = fixtureSpan({
          sdk,
          spanId: "c".repeat(16),
          parentSpanId: "b".repeat(16),
          attributes: { "langfuse.observation.type": "generation" },
        });
        processor.onStart(parent, ROOT_CONTEXT);
        processor.onStart(child, ROOT_CONTEXT);
        processor.onEnd(child);
        await sleep(20);
        return recorder.spans[0]?.parentSpanId === "b".repeat(16);
      },
    );

    await proof(
      "K14",
      `SDK ${sdk} shape: a child of an internal wrapper re-parents through the open and ended chains`,
      async () => {
        const { processor, recorder } = fixtureProcessor();
        await recorder.initialize();
        const root = fixtureSpan({
          sdk,
          spanId: "1".repeat(16),
          attributes: { "langfuse.observation.type": "agent" },
        });
        const wrapper = fixtureSpan({
          sdk,
          spanId: "2".repeat(16),
          parentSpanId: "1".repeat(16),
          attributes: { "langfuse.internal": true },
        });
        const openChild = fixtureSpan({
          sdk,
          spanId: "3".repeat(16),
          parentSpanId: "2".repeat(16),
          attributes: { "langfuse.observation.type": "tool" },
        });
        const endedChild = fixtureSpan({
          sdk,
          spanId: "4".repeat(16),
          parentSpanId: "2".repeat(16),
          attributes: { "langfuse.observation.type": "tool" },
        });
        for (const span of [root, wrapper]) {
          processor.onStart(span, ROOT_CONTEXT);
        }
        processor.onStart(openChild, ROOT_CONTEXT);
        processor.onEnd(openChild);
        processor.onEnd(wrapper);
        processor.onEnd(endedChild);
        await sleep(20);
        const parents = recorder.spans.map((span) => span.parentSpanId);
        return (
          recorder.spans.length === 2 &&
          parents.every((parent) => parent === "1".repeat(16))
        );
      },
    );
  }

  // ----------------------------------------------------------------- K21
  section("K21 mask and redactIO act on the Langfuse request only");

  const scenarios = new Map<string, Promise<ScenarioResult>>();
  const scenario = (name: string): Promise<ScenarioResult> => {
    const cached = scenarios.get(name) ?? runScenario(name);
    scenarios.set(name, cached);
    return cached;
  };

  await proof(
    "K21",
    "control: with no policy the marker reaches Langfuse, the OTLP processor and a second registry exporter",
    async () => {
      const result = await scenario("plain");
      return (
        result.langfuseNames.includes("scenario.generate") &&
        result.langfuse.includes(MARKER) &&
        result.otlp.includes(MARKER) &&
        result.recorded.includes(MARKER)
      );
    },
  );
  await proof(
    "K21",
    "mask: the Langfuse request masks input, output and metadata, once, and sends the tool-call attribute and the event body as recorded, as the released build did",
    async () => {
      const result = await scenario("mask");
      const attrs = result.langfuseAttrs;
      return (
        result.langfuseNames.includes("scenario.generate") &&
        ["langfuse.observation.input", "langfuse.observation.output"].every(
          (key) => attrs[key]?.includes(MASKED) && !attrs[key].includes(MARKER),
        ) &&
        attrs["langfuse.observation.metadata.note"]?.includes(MASKED) ===
          true &&
        !attrs["langfuse.observation.metadata.note"].includes(MARKER) &&
        attrs["gen_ai.response.tool_calls"]?.includes(MARKER) === true &&
        result.langfuseEventAttrs["proxy.body"]?.includes(MARKER) === true &&
        result.seen.length > 0 &&
        result.seen.every((value) => !value.includes(MASKED))
      );
    },
  );
  await proof(
    "K21",
    "mask: a second registry exporter receives the raw content",
    async () => {
      const result = await scenario("mask");
      return (
        result.recorded.includes("scenario.generate") &&
        result.recorded.includes(MARKER) &&
        !result.recorded.includes(MASKED)
      );
    },
  );
  await proof(
    "K21",
    "mask: the OTLP span processor receives the raw content",
    async () => {
      const result = await scenario("mask");
      return (
        result.otlp.includes("scenario.generate") &&
        result.otlp.includes(MARKER) &&
        !result.otlp.includes(MASKED)
      );
    },
  );
  await proof(
    "K21",
    "redactIO: the Langfuse request carries no input or output, and still the tool-call attribute and the event body, as the released build did",
    async () => {
      const result = await scenario("redact");
      const attrs = result.langfuseAttrs;
      return (
        result.langfuseNames.includes("scenario.generate") &&
        attrs["langfuse.observation.input"] === undefined &&
        attrs["langfuse.observation.output"] === undefined &&
        attrs["gen_ai.response.tool_calls"]?.includes(MARKER) === true &&
        result.langfuseEventAttrs["proxy.body"]?.includes(MARKER) === true
      );
    },
  );
  await proof(
    "K21",
    "redactIO: a second registry exporter still receives input and output",
    async () => {
      const result = await scenario("redact");
      return (
        result.recorded.includes("scenario.generate") &&
        result.recorded.includes(MARKER)
      );
    },
  );
  await proof(
    "K21",
    "redactIO: the OTLP span processor still receives input and output",
    async () => {
      const result = await scenario("redact");
      return (
        result.otlp.includes("scenario.generate") &&
        result.otlp.includes(MARKER)
      );
    },
  );

  // ----------------------------------------------------------------- K25
  section("K25 what the Langfuse request keeps of the span");

  await proof(
    "K25",
    "the provider's resource attributes are sent instead of a placeholder service name",
    async () => {
      const rig = await makeRig({
        resource: {
          "service.name": "svc-under-test",
          "deployment.environment": "staging-x",
        },
      });
      try {
        observed(rig.tracer("sdk").startSpan("a")).end();
        await rig.flush();
        const [entry] = rig.wire();
        return (
          attrOf(entry.resource, "service.name") === "svc-under-test" &&
          attrOf(entry.resource, "deployment.environment") === "staging-x"
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K25",
    "the Langfuse request names the scope sdk, with no version, whatever tracer made the span; a registry exporter still gets the real scope",
    async () => {
      const rig = await makeRig();
      try {
        const recorder = new RecordingExporter();
        await recorder.initialize();
        rig.registry.register(recorder);
        observed(rig.tracer("rag", "9.9.9").startSpan("from-rag")).end();
        observed(
          rig.tracer("workflow", "1.2.3").startSpan("from-workflow"),
        ).end();
        await rig.flush();
        const scopes = new Map(
          rig.wire().map((entry) => [entry.span.name, entry.scope]),
        );
        const recorded = new Map(
          recorder.spans.map((span) => [span.name, span.scope]),
        );
        return (
          scopes.get("from-rag")?.name === "sdk" &&
          scopes.get("from-rag")?.version === undefined &&
          scopes.get("from-workflow")?.name === "sdk" &&
          recorded.get("from-rag")?.name === "rag" &&
          recorded.get("from-rag")?.version === "9.9.9" &&
          recorded.get("from-workflow")?.name === "workflow"
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K25",
    "the Langfuse request sends every span as kind 1; a registry exporter still gets the real kind",
    async () => {
      const rig = await makeRig();
      try {
        const recorder = new RecordingExporter();
        await recorder.initialize();
        rig.registry.register(recorder);
        observed(
          rig.tracer("sdk").startSpan("client", { kind: SpanKind.CLIENT }),
        ).end();
        observed(rig.tracer("sdk").startSpan("internal")).end();
        await rig.flush();
        const kinds = new Map(
          rig.wire().map((entry) => [entry.span.name, entry.span.kind]),
        );
        const recorded = new Map(
          recorder.spans.map((span) => [span.name, span.kind]),
        );
        return (
          kinds.get("client") === 1 &&
          kinds.get("internal") === 1 &&
          recorded.get("client") === SpanKind.CLIENT &&
          recorded.get("internal") === SpanKind.INTERNAL
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof("K25", "span links are sent", async () => {
    const rig = await makeRig();
    try {
      observed(
        rig.tracer("sdk").startSpan("linked", {
          links: [
            {
              context: {
                traceId: "d".repeat(32),
                spanId: "e".repeat(16),
                traceFlags: 1,
              },
              attributes: { "link.kind": "retry" },
            },
          ],
        }),
      ).end();
      await rig.flush();
      const [link] = rig.wire()[0].span.links ?? [];
      return (
        link?.traceId === "d".repeat(32) &&
        link?.spanId === "e".repeat(16) &&
        attrOf(link?.attributes, "link.kind") === "retry"
      );
    } finally {
      await rig.close();
    }
  });

  await proof(
    "K25",
    "start, end and event times keep their sub-millisecond digits",
    async () => {
      const rig = await makeRig();
      try {
        const span = observed(
          rig
            .tracer("sdk")
            .startSpan("precise", { startTime: [1_700_000_000, 123_456_789] }),
        );
        span.addEvent("evt", {}, [1_700_000_000, 555_000_111]);
        span.end([1_700_000_001, 987_654_321]);
        await rig.flush();
        const wire = rig.wire()[0].span;
        return (
          wire.startTimeUnixNano === "1700000000123456789" &&
          wire.endTimeUnixNano === "1700000001987654321" &&
          wire.events[0]?.timeUnixNano === "1700000000555000111"
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K25",
    "a SpanData without the new fields still encodes (fallback resource and scope)",
    async () => {
      const rig = await makeRig();
      try {
        await rig.exporter.exportBatch([spanData({ name: "bare" })]);
        const [entry] = rig.wire();
        return (
          entry.span.name === "bare" &&
          entry.span.kind === 1 &&
          entry.span.startTimeUnixNano === "1767225600000000000" &&
          entry.scope.name !== undefined &&
          entry.resource.length > 0
        );
      } finally {
        await rig.close();
      }
    },
  );

  // ----------------------------------------------------------------- K26
  section("K26 flush and shutdown deadlines");

  await proof(
    "K26",
    "default budget: flushing against an unreachable Langfuse returns in under 5 s",
    async () => {
      const dead = await closedPortUrl();
      const rig = await makeRig({
        baseUrl: dead,
        exporter: { retries: undefined },
      });
      try {
        await rig.registry.exportToAll(spanData());
        return (await timed(() => rig.flush())) < 5_000;
      } finally {
        await rig.close();
      }
    },
  );

  const BLACK_HOLE = { retries: 1, timeoutMs: 1_200, flushBudgetMs: 300 };

  await proof(
    "K26",
    "a configured flush budget bounds flush() against a black-holed Langfuse",
    async () => {
      const rig = await makeRig({
        exporter: BLACK_HOLE,
        reply: () => ({ hold: true }),
      });
      try {
        await rig.registry.exportToAll(spanData());
        return (await timed(() => rig.exporter.flush())) < 1_000;
      } finally {
        await rig.close();
      }
    },
  );

  await proof("K26", "shutdown() is bounded by the same budget", async () => {
    const rig = await makeRig({
      exporter: BLACK_HOLE,
      reply: () => ({ hold: true }),
    });
    try {
      await rig.registry.exportToAll(spanData());
      return (await timed(() => rig.exporter.shutdown())) < 1_000;
    } finally {
      await rig.close();
    }
  });

  await proof(
    "K26",
    "after the deadline no retry is attempted in the background",
    async () => {
      const rig = await makeRig({
        exporter: { retries: 3, timeoutMs: 1_200, flushBudgetMs: 300 },
        reply: () => ({ hold: true }),
      });
      try {
        await rig.registry.exportToAll(spanData());
        await rig.exporter.flush();
        await sleep(2_800);
        return rig.receiver.posts().length === 1;
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K26",
    "control: a healthy Langfuse still receives everything on flush",
    async () => {
      const rig = await makeRig();
      try {
        for (let index = 0; index < 5; index++) {
          await rig.registry.exportToAll(spanData());
        }
        await rig.exporter.flush();
        return rig.wire().length === 5;
      } finally {
        await rig.close();
      }
    },
  );

  // ----------------------------------------------------------------- K28
  section("K28 delivery failures are reported");

  const failingTraces = (request: ReceivedRequest) => ({
    status: request.path.includes("/otel/") ? 500 : 200,
  });

  await proof(
    "K28",
    "exportBatch reports failure and counts when the endpoint rejects the batch",
    async () => {
      const rig = await makeRig({ reply: failingTraces });
      try {
        const spans = [spanData(), spanData(), spanData()];
        const result = await rig.exporter.exportBatch(spans);
        return (
          result.success === false &&
          result.failedCount === 3 &&
          result.exportedCount === 0 &&
          (result.errors ?? []).length === 3
        );
      } finally {
        await rig.close();
      }
    },
  );

  const bulk = () =>
    spanData({
      attributes: { "langfuse.observation.input": "x".repeat(1_300_000) },
    });

  await proof(
    "K28",
    "a batch split into two requests reports the delivered and the dropped half",
    async () => {
      const rig = await makeRig({
        reply: (_request, postIndex) => ({
          status: postIndex === 0 ? 200 : 500,
        }),
      });
      try {
        const result = await rig.exporter.exportBatch([bulk(), bulk(), bulk()]);
        return (
          result.success === false &&
          result.exportedCount === 2 &&
          result.failedCount === 1
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K28",
    "a warn-level log states how many of how many spans were dropped",
    async () => {
      const rig = await makeRig({ reply: failingTraces });
      const warnings: string[] = [];
      const original = logger.warn;
      logger.warn = (...args: unknown[]) => {
        warnings.push(String(args[0]));
      };
      try {
        await rig.exporter.exportBatch([spanData(), spanData(), spanData()]);
        return warnings.some((message) => /Dropped 3 of 3 spans/.test(message));
      } finally {
        logger.warn = original;
        await rig.close();
      }
    },
  );

  await proof(
    "K28",
    "the health check reports the spans dropped so far",
    async () => {
      const rig = await makeRig({ reply: failingTraces });
      try {
        await rig.exporter.exportBatch([spanData(), spanData()]);
        const health = await rig.exporter.healthCheck();
        return (health.errors ?? []).some((message) =>
          /2 spans dropped/.test(message),
        );
      } finally {
        await rig.close();
      }
    },
  );

  await proof(
    "K28",
    "repeated failed deliveries never open the registry's circuit breaker, and the batch delivered after the outage leaves it closed",
    async () => {
      let healthy = false;
      const rig = await makeRig({
        reply: (request) => ({
          status: healthy || !request.path.includes("/otel/") ? 200 : 500,
        }),
      });
      try {
        rig.registry.configureCircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 120,
        });
        for (let index = 0; index < 4; index++) {
          await rig.registry.exportToAll(spanData());
          await rig.exporter.flush();
        }
        const opened =
          rig.registry.getCircuitBreakerStatus("langfuse")?.state === "open";
        healthy = true;
        for (let cycle = 0; cycle < 2; cycle++) {
          await sleep(200);
          await rig.registry.exportToAll(spanData());
          await rig.exporter.flush();
        }
        const state = rig.registry.getCircuitBreakerStatus("langfuse")?.state;
        return !opened && (state === undefined || state === "closed");
      } finally {
        await rig.close();
      }
    },
  );

  // ----------------------------------------------------------------- K07
  section("K07 NEUROLINK_RECORD_INPUTS=false");

  const INPUT = "langfuse.observation.input";
  const TRACE_INPUT = "langfuse.trace.input";
  const OUTPUT = "langfuse.observation.output";

  await proof(
    "K07",
    "generation input is not recorded, output is; unset, true and other values record both",
    () => {
      const run = (value: string | undefined) =>
        withEnv("NEUROLINK_RECORD_INPUTS", value, () =>
          written((span) =>
            observeGeneration(span, {
              provider: "openai",
              model: "gpt-4o-mini",
              input: { prompt: "the question" },
              output: "the answer",
            }),
          ),
        );
      const off = [run("false"), run(" False "), run("FALSE")];
      const on = [run(undefined), run("true"), run("0"), run("")];
      return (
        off.every(
          (attrs) => attrs[INPUT] === undefined && attrs[OUTPUT] !== undefined,
        ) &&
        on.every(
          (attrs) => attrs[INPUT] !== undefined && attrs[OUTPUT] !== undefined,
        )
      );
    },
  );

  await proof("K07", "tool arguments are not recorded, the result is", () => {
    const run = (value: string | undefined) =>
      withEnv("NEUROLINK_RECORD_INPUTS", value, () =>
        written((span) => {
          observe(span, "tool", { input: TOOL_ARGS });
          observe(span, "tool", { output: { found: true } });
        }),
      );
    const off = run("false");
    const on = run(undefined);
    return (
      off[INPUT] === undefined &&
      off[OUTPUT] !== undefined &&
      on[INPUT] !== undefined
    );
  });

  await proof(
    "K07",
    "trace-level and agent input are not recorded either",
    () => {
      const attrs = withEnv("NEUROLINK_RECORD_INPUTS", "false", () =>
        written((span) => {
          observe(span, "agent", { input: "the prompt", output: "the reply" });
          observeTrace(span, { input: "the prompt", output: "the reply" });
        }),
      );
      return (
        attrs[INPUT] === undefined &&
        attrs[TRACE_INPUT] === undefined &&
        attrs[OUTPUT] !== undefined &&
        attrs["langfuse.trace.output"] !== undefined
      );
    },
  );

  await proof(
    "K07",
    "end to end: generate() with a registered tool leaves prompt and tool arguments out of every span",
    async () => {
      const recordedRun = await withEnvAsync(
        "NEUROLINK_RECORD_INPUTS",
        undefined,
        turn,
      );
      const recordedTools = observationsOf(recordedRun.spans, "tool");
      assert(
        everyAttributeText(recordedRun.spans).includes(PROMPT_MARKER) &&
          recordedTools.some((span) =>
            String(span.attributes[INPUT]).includes("needle"),
          ),
        "control run recorded no input",
      );
      const hiddenRun = await withEnvAsync(
        "NEUROLINK_RECORD_INPUTS",
        "false",
        turn,
      );
      const tools = observationsOf(hiddenRun.spans, "tool");
      const generations = observationsOf(hiddenRun.spans, "generation");
      return (
        tools.length > 0 &&
        generations.length > 0 &&
        !everyAttributeText(hiddenRun.spans).includes(PROMPT_MARKER) &&
        tools.every((span) => span.attributes[INPUT] === undefined) &&
        generations.every((span) => span.attributes[INPUT] === undefined) &&
        tools.some((span) => span.attributes[OUTPUT] !== undefined)
      );
    },
  );

  // The Vertex client writes the request to its provider.generate and
  // executeGeneration spans itself, as the released code did, and only through
  // `generationInputAttribute`, which is built when recordsSpanInputs() holds.
  // Every other input reaches a span through observeGeneration, whose handling
  // of NEUROLINK_RECORD_INPUTS the checks above cover. What must hold is that
  // no direct write is left that skips the guard.
  const unguardedInputWrites = (source: string): string[] =>
    [
      ...source.matchAll(
        /LangfuseOtelSpanAttributes\.OBSERVATION_INPUT[^]{0,80}/g,
      ),
    ]
      .map((write) => write[0])
      .filter((write) => !write.includes("generationInputAttribute"));

  await proof(
    "K07",
    "the Vertex client has no input write that skips the record-inputs guard",
    () =>
      unguardedInputWrites(
        readFileSync(
          new URL(
            "../src/lib/providers/googleVertex/client.ts",
            import.meta.url,
          ),
          "utf8",
        ),
      ).length === 0,
  );

  await proof(
    "K07",
    "control: the Vertex scan flags an unguarded input write and accepts a guarded one",
    () =>
      unguardedInputWrites(
        "span.setAttribute(LangfuseOtelSpanAttributes.OBSERVATION_INPUT, prompt);",
      ).length === 1 &&
      unguardedInputWrites(
        "span.setAttribute(LangfuseOtelSpanAttributes.OBSERVATION_INPUT, generationInputAttribute);",
      ).length === 0,
  );

  // ----------------------------------------------------------------- K12
  section("K12 input is redacted once");

  const K12_CASES: { content: string; expected?: string }[] = [
    {
      content: "API_KEY=abc\nPORT=3000\nNAME=foo",
      expected: "API_KEY=[REDACTED]\nPORT=3000\nNAME=foo",
    },
    {
      content: "token: x\nfoo: bar\nplease summarise",
      expected: "token: [REDACTED]\nfoo: bar\nplease summarise",
    },
    {
      content:
        "services:\n  db:\n    password: s3cret-value\n    image: postgres\nPlease review the file above, thanks",
    },
    {
      content: "DB_PASSWORD=hunter3\nDB_HOST=db.internal\nAnswer in one line.",
    },
  ];

  await proof(
    "K12",
    "generation input is the single-pass redaction of the request",
    () =>
      K12_CASES.every(({ content, expected }) => {
        const request = { messages: [{ role: "user", content }] };
        const attrs = written((span) =>
          observeGeneration(span, {
            provider: "openai",
            model: "gpt-4o-mini",
            input: request,
          }),
        );
        const stored = String(attrs[INPUT]);
        const messages = JSON.parse(stored) as { content: string }[];
        return (
          stored === spanModelRequestAttribute(request) &&
          (expected === undefined || messages[0].content === expected)
        );
      }),
  );

  await proof(
    "K12",
    "a turn input built by spanModelRequestAttribute and handed to observe() is not redacted again",
    () =>
      K12_CASES.every(({ content }) => {
        const request = { messages: [{ role: "user", content }] };
        const built = spanModelRequestAttribute(request);
        const attrs = written((span) => {
          observe(span, "agent", { input: built });
          observeTrace(span, { input: built });
        });
        return attrs[INPUT] === built && attrs[TRACE_INPUT] === built;
      }),
  );

  await proof("K12", "credentials in the request are still masked", () => {
    const secrets = [
      "abcdefghijklmnopqrstuvwxyz012345",
      "hunter2-literal",
      "sk-abcdefghijklmnopqrstu12345",
      "hunter3-literal",
      "k-literal-77",
    ];
    const request = {
      messages: [
        {
          role: "user",
          content: `Authorization: Bearer ${secrets[0]}\nplease continue`,
        },
        { role: "user", content: `{"password":"${secrets[1]}"}` },
        { role: "user", content: `my key is ${secrets[2]} ok` },
        { role: "user", content: `DB_PASSWORD=${secrets[3]}\nNEXT=1` },
        { role: "tool", content: "done", apiKey: secrets[4] },
      ],
    };
    const attrs = written((span) =>
      observeGeneration(span, {
        provider: "openai",
        model: "m",
        input: request,
      }),
    );
    const stored = String(attrs[INPUT]);
    return secrets.every((secret) => !stored.includes(secret));
  });

  // ----------------------------------------------------------------- K13
  section("K13 credential pattern is linear");

  const REFERENCE_ENV =
    /\b([\w.-]*(?:api[_-]?key|secret|password|passwd|token|credential|private[_-]?key|signature)[\w.-]*)(\s*[=:]\s*)(?!\d+\b)[^\s&"',;]+/gi;
  const REFERENCE_BARE =
    /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})/g;
  const referenceRedact = (text: string) =>
    text
      .replace(
        REFERENCE_ENV,
        (_match, key: string, separator: string) =>
          `${key}${separator}[REDACTED]`,
      )
      .replace(REFERENCE_BARE, "[REDACTED]");

  const lcg = (seed: number) => {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 2 ** 32;
    };
  };

  const BASE64URL =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const LETTERS = "abcdefghijklmnopqrstuvwxyz";
  const nextRandom = lcg(7);
  const pick = (alphabet: string, length: number) =>
    Array.from(
      { length },
      () => alphabet[Math.floor(nextRandom() * alphabet.length)],
    ).join("");
  const hyphenated = Array.from({ length: 20_000 }, () =>
    pick(LETTERS, 3),
  ).join("-");

  const ADVERSARIAL: Record<string, string> = {
    "80 KB dash runs": `${"a-".repeat(40_000)}token`,
    "80 KB dot runs": `${"a.".repeat(40_000)}secret`,
    "80 KB hyphenated random words": `${hyphenated} token`,
    "400 KB base64url blob": `${pick(BASE64URL, 400_000)} token`,
  };

  for (const [label, input] of Object.entries(ADVERSARIAL)) {
    await proof("K13", `a ${label} string is redacted in under 250 ms`, () => {
      assert(input.length >= 80_000, "input too short");
      const started = performance.now();
      redactSecretAssignments(input);
      return performance.now() - started < 250;
    });
  }

  await proof(
    "K13",
    "the whole span-content path stays under 500 ms on the 80 KB dash-run string",
    () => {
      const started = performance.now();
      spanContentAttribute(ADVERSARIAL["80 KB dash runs"]);
      return performance.now() - started < 500;
    },
  );

  // Assembled from parts so the repository's secret scan does not read the
  // test's own fixtures as credentials.
  const GITHUB_TOKEN = ["ghp", "_", "abcdefghijklmnopqrst1234"].join("");
  const AWS_KEY_ID = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
  const SLACK_TOKEN = ["xoxb", "-", "1234567890-abc"].join("");

  const HANDWRITTEN = [
    "API_KEY=abc\\nPORT=3000\\nNAME=foo",
    "API_KEY=abc\nPORT=3000\nNAME=foo",
    "token: x\nfoo: bar\nplease summarise",
    "export OPENAI_API_KEY=sk-abcdefghijklmnop1234 and go",
    "https://x.example/cb?access_token=abc123&state=ok",
    "max_tokens: 4096, temperature=0.2, top_p: 1",
    "password = hunter2 then more text",
    "foo=token=abc rest",
    "token=abc:secret=xyz tail",
    "client-secret: a.b-c_d;next",
    "--token=abc --password 'x y' --api-key=k",
    "Authorization: Basic dXNlcjpwYXNz",
    "x-api-key:   spaced-value  and more",
    "secret=12 secret=12a secret=12.5 secret=12-3",
    "tokens: [a, b]",
    '{"token":"abc","n":1}',
    '\\"password\\":\\"x\\"',
    "a-b-c-token = v-1 d-e-f-secret: w-2",
    "private_key=-----BEGIN KEY----- end",
    `${GITHUB_TOKEN} and ${AWS_KEY_ID} and ${SLACK_TOKEN}`,
    "plain prose with no credentials at all, just words.",
    "tokenizer: fast  signature_version=2  credentials_file=/tmp/x",
    "   token   =   spaced   ",
    "token=\ntoken: \n",
    "TOKEN=A\tSECRET=B\rPASSWORD=C",
    "db.password=abc;db.user=me&db.token=zzz,db.other=1",
    "a=b c=d token",
    "---token=abc",
    "x.token.y=abc",
    "ünïcode-token=välue",
  ];

  const FRAGMENTS = [
    "api_key",
    "API-KEY",
    "token",
    "secret",
    "password",
    "passwd",
    "credential",
    "private_key",
    "signature",
    "Authorization",
    "x-api-key",
    "max_tokens",
    "foo",
    "bar.baz",
    "sk-abcdefghijklmnop1234",
    GITHUB_TOKEN,
    AWS_KEY_ID,
    "=",
    ":",
    " = ",
    ": ",
    "\n",
    "\\n",
    '"',
    "'",
    ",",
    ";",
    "&",
    " ",
    "123",
    "4096",
    "12.5",
    "abc",
    "a-b-c",
    "---",
    "...",
    "tokens",
    "refresh_token",
    "\t",
    "Bearer abcdefghijklmnopqrst",
    "_",
    "9x",
  ];
  const nextFragment = lcg(42);
  const GENERATED = Array.from({ length: 4_000 }, () =>
    Array.from(
      { length: 1 + Math.floor(nextFragment() * 24) },
      () => FRAGMENTS[Math.floor(nextFragment() * FRAGMENTS.length)],
    ).join(""),
  );

  await proof(
    "K13",
    "equivalence: output equals the previous pattern on 30 handwritten inputs and 4,000 generated ones",
    () => {
      const mismatches = [...HANDWRITTEN, ...GENERATED].filter(
        (input) => redactSecretAssignments(input) !== referenceRedact(input),
      );
      return mismatches.length === 0;
    },
  );

  await proof(
    "K13",
    "equivalence: the K12 request contents redact exactly as before",
    () =>
      K12_CASES.every(
        ({ content }) =>
          redactSecretAssignments(content) === referenceRedact(content),
      ),
  );

  // ----------------------------------------------------------------- K27
  section("K27 text under a data/image/bytes key");

  const SENTENCE = "The quick brown fox jumps over the lazy dog ";
  const longSentence = SENTENCE.repeat(30);
  const wordList = "word ".repeat(300);
  const nameList = Array.from({ length: 150 }, (_, i) => `name${i}`).join("\n");
  const nextByte = lcg(99);
  const bytes = Buffer.from(
    Array.from({ length: 2_000 }, () => Math.floor(nextByte() * 256)),
  );
  const base64 = bytes.toString("base64");
  const mimeWrapped = base64.replace(/(.{76})/g, "$1\r\n");
  const urlSafe = bytes.toString("base64url");

  await proof(
    "K27",
    "prose, word lists and name lists over 1,024 characters keep their content under data, image and bytes",
    () => {
      assert(longSentence.length > 1_024 && wordList.length > 1_024, "short");
      return ["data", "image", "bytes"].every((key) =>
        [longSentence, wordList, nameList].every(
          (text) =>
            (redactSpanContent({ [key]: text }) as Record<string, string>)[
              key
            ] === text,
        ),
      );
    },
  );

  await proof(
    "K27",
    "real binary values still become byte placeholders",
    () => {
      const placeholder = /^\[\d+ bytes\]$/;
      const asBytes = (
        redactSpanContent({ data: new Uint8Array(bytes) }) as { data: string }
      ).data;
      const results = [base64, mimeWrapped, urlSafe].map(
        (value) =>
          (redactSpanContent({ data: value }) as { data: string }).data,
      );
      const withMime = (
        redactSpanContent({ mimeType: "image/png", image: base64 }) as {
          image: string;
        }
      ).image;
      return (
        asBytes === "[2000 bytes]" &&
        results.every((value) => placeholder.test(value)) &&
        withMime === `[${Math.floor((base64.length * 3) / 4)} bytes image/png]`
      );
    },
  );

  await proof(
    "K27",
    "binaryPlaceholder leaves text alone and a short value alone, and sizes binary",
    () =>
      binaryPlaceholder(longSentence, undefined) === undefined &&
      binaryPlaceholder("QUJD", undefined) === undefined &&
      binaryPlaceholder(base64, undefined) !== undefined,
  );

  // ----------------------------------------------------------------- K32
  section("K32 nothing is built for a span that is not recording");

  const nonRecording = () => offProvider.getTracer("off").startSpan("off");

  await proof(
    "K32",
    "observe() does not redact or serialize for a non-recording span",
    () => {
      const span = nonRecording();
      assert(!span.isRecording(), "span is recording");
      const probe = countingContent();
      observe(span, "generation", { input: probe.value, output: probe.value });
      const control = countingContent();
      written((live) => observe(live, "generation", { input: control.value }));
      return probe.reads.count === 0 && control.reads.count > 0;
    },
  );

  await proof(
    "K32",
    "observeGeneration() does not serialize the request or price the call for a non-recording span",
    () => {
      const span = nonRecording();
      const probe = countingContent();
      const usage = new Proxy(
        { inputTokens: 3, outputTokens: 4 },
        {
          get(target, key, receiver) {
            probe.reads.count += 1;
            return Reflect.get(target, key, receiver);
          },
        },
      );
      observeGeneration(span, {
        provider: "openai",
        model: "gpt-4o-mini",
        input: { messages: [probe.value] },
        output: { text: "x" },
        usage,
      });
      const control = countingContent();
      written((live) =>
        observeGeneration(live, {
          provider: "openai",
          model: "gpt-4o-mini",
          input: { messages: [control.value] },
        }),
      );
      return probe.reads.count === 0 && control.reads.count > 0;
    },
  );

  await proof(
    "K32",
    "observeTrace() does not redact for a non-recording span",
    () => {
      const probe = countingContent();
      observeTrace(nonRecording(), {
        input: probe.value,
        metadata: { a: probe.value },
      });
      return probe.reads.count === 0;
    },
  );

  await proof(
    "K32",
    "a recording span still receives its observation attributes",
    () => {
      const attrs = written((span) =>
        observe(span, "tool", { input: { q: 1 }, output: { ok: true } }),
      );
      return attrs[INPUT] !== undefined && attrs[OUTPUT] !== undefined;
    },
  );
});
