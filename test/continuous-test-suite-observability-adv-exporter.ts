#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability exporter, adversarial follow-up
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924): the defects an
 * adversarial run reproduced in the exporter and redaction area, and two
 * checks the earlier suites left vacuous. Every check prints one line,
 * `PROOF <id> PASS|FAIL <what is checked>`, and the suite exits non-zero when
 * any check fails.
 *
 *   A01  a status message is recorded as given, key included, with no policy
 *        set, and the caller's mask and redactIO leave it as the released
 *        build did
 *   A02  error.message, tool.error.message and retry.error are recorded as
 *        given, key included, and the caller's mask and redactIO leave them
 *        as the released build did
 *   A03  prompt and completion keys of another library's GenAI span are not
 *        touched by the caller's mask or redactIO, as in the released build
 *   A04  non-object metadata (the bare metadata keys) is left as the released
 *        build left it; keyed metadata entries are masked
 *   A05  an object key and a {name, value} entry are recorded as the released
 *        build recorded them (the masker reads values and text, not keys); a
 *        KEY=value line is still redacted exactly once
 *   A06  a span keeps its exported ancestor behind ended non-exported ones
 *   A07  a 2xx body that is not an object is a full success
 *   A08  partialSuccess.rejectedSpans is validated
 *   A09  deliveries in flight and spans waiting for one are capped, and what
 *        is dropped is counted
 *   A10  a span that ends during shutdown() is delivered or counted
 *   A11  Retry-After is honoured on 429 and 503, capped
 *   A12  an exporter whose last batch Langfuse took none of reads unhealthy
 *   A14  NEUROLINK_MASK_CREDENTIAL_ENTRIES=true masks {name, value} entries
 *        and credentials in object keys, read at call time; unset or any
 *        other value leaves the released rules
 *   V01  a mask or redactIO does not reach the status message of any exporter
 *   V02  partialSuccess rejections are counted
 *
 * Backward-compatibility pass (BZ-6924): behaviour live callers had before the
 * follow-up and that it must not change.
 *   BE01  ExporterSpanProcessor.shutdown() shuts the registry's exporters down
 *         by default; flush-only is the opt-out
 *   BE02  a plain generate() exports the spans it exported before, with the
 *         parents it had, through Langfuse and through a registry exporter
 *   BE03  the Langfuse resource carries no synthesized deployment.environment
 *   BE04  the Langfuse request names scope `sdk` and span kind 1
 *   BE05  getTelemetryStatus() and getStatuses() accept a plain-JS exporter
 *         that only has the previous method set
 *   BE06  a user BaseExporter subclass and a hand-built OtlpSpan from before
 *         the follow-up still compile
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from
 * `src/lib/` and is on the `neurolink/e2e-tests-only` allow list. What it
 * asserts needs control a live call cannot give:
 *   - Langfuse is a local OTLP receiver that answers 200 with a `null` body or
 *     a malformed partialSuccess, answers 429 and 503 with Retry-After, or
 *     holds every request open (a black hole) and later answers again;
 *   - the Langfuse exporter's mask and redactIO are fed a span from another library's GenAI
 *     instrumentation and non-object metadata, which no model call produces;
 *   - re-parenting needs 5,100 unrelated spans ended between two ancestors
 *     and their descendant, and redaction a credential inside an object key;
 *   - a span ends at the exact moment shutdown() is draining.
 * The end-to-end checks (a real `NeuroLink.generate()` against a local
 * OpenAI-compatible server whose error echoes a key, and an MCP tool from a
 * stdio fixture server, run through `NeuroLink.executeTool()`, whose error
 * result echoes a key) drive the same code from the public class.
 * The BE checks need the same control: a host process is a child that must
 * exit by itself after provider.shutdown(), the startup path runs in a fresh
 * process against a local Langfuse receiver whose resource, scope and span
 * kind it decodes, an exporter written in plain JavaScript has only the method
 * set of the previous release, and a user subclass or hand-built OtlpSpan is a
 * source file compiled with `tsc` against the types of this tree.
 *
 * Offline: every server is on 127.0.0.1 and nothing leaves the machine.
 * ADV_EXPORTER_ONLY=A01,A09 runs only the listed ids.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-adv-exporter.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Span,
} from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assert, defineSuite, runCommand, tempDir } from "./helpers/harness.js";
import * as langfuseConstants from "../src/lib/constants/langfuse.js";
import {
  INTERNAL_SPAN_ATTRIBUTE,
  MAX_REMEMBERED_SPANS,
} from "../src/lib/constants/telemetry.js";
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
import {
  spanContentAttribute,
  spanModelRequestAttribute,
} from "../src/lib/telemetry/attributes.js";
import {
  observe,
  observeGeneration,
  observeTrace,
} from "../src/lib/telemetry/observation.js";
import { markTurnlessRoot } from "../src/lib/telemetry/tracers.js";
import {
  SpanStatus,
  SpanType,
  type ExporterHealthStatus,
  type ExportResult,
  type LangfuseExporterConfig,
  type SpanData,
} from "../src/lib/types/index.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { ResearchWorker } from "../src/lib/autoresearch/worker.js";
import { RAGASEvaluator } from "../src/lib/evaluation/ragasEvaluator.js";
import { getProcessorRegistry } from "../src/lib/processors/registry/ProcessorRegistry.js";
import { CharacterChunker } from "../src/lib/rag/chunkers/CharacterChunker.js";
import { conditionResponse } from "../src/lib/workflow/core/responseConditioner.js";
import { logger } from "../src/lib/utils/logger.js";
import { withProviderRetry } from "../src/lib/utils/providerRetry.js";

const PROVIDER_KEY = "sk-live-AbCdEfGhIjKlMnOpQrStUvWx0123456789";
const URL_SECRET = "Zq9xSECRETvalue7781";
// The exact text the failing upstreams hand back, key included. Error, status
// and exception text is recorded verbatim, so these are what must come out.
const ECHOED_400 = `Invalid request: the header said api_key=${PROVIDER_KEY}`;
const ECHOED_TOOL_ERROR = `lookup failed: upstream said api_key=${PROVIDER_KEY}`;
const ECHOED_STATUS = `401 Incorrect API key provided: ${PROVIDER_KEY}`;
const ECHOED_RETRY = `500 from upstream: api_key=${PROVIDER_KEY}`;
const PROMPT = "PROMPT-CONTENT-77";
const MASKED = "<M>";
const STATUS_MESSAGE = "langfuse.observation.status_message";
const INPUT = "langfuse.observation.input";
const OUTPUT = "langfuse.observation.output";
const TRACE_INPUT = "langfuse.trace.input";

const ONLY = process.env.ADV_EXPORTER_ONLY?.split(",").map((id) => id.trim());

// ---------------------------------------------------------------------------
// Wire shapes the receiver decodes
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
  attributes: OtlpKv[];
  events: { name: string; attributes?: OtlpKv[] }[];
  status?: { code?: number; message?: string };
};
type WireBody = {
  resourceSpans: { scopeSpans: { spans: WireSpan[] }[] }[];
};

function attrOf(
  attributes: OtlpKv[] | undefined,
  key: string,
): string | undefined {
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

function carries(span: WireSpan, text: string): boolean {
  return JSON.stringify({
    attributes: span.attributes,
    events: span.events,
    status: span.status,
  }).includes(text);
}

// ---------------------------------------------------------------------------
// Local servers
// ---------------------------------------------------------------------------

type ReceivedRequest = {
  method: string;
  path: string;
  text: string;
  at: number;
};
type Reply = {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
  hold?: boolean;
};
type Receiver = {
  url: string;
  posts: () => ReceivedRequest[];
  reset: () => void;
  release: () => void;
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
  const held: ServerResponse[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const request = {
        method: req.method ?? "",
        path: req.url ?? "",
        text: Buffer.concat(chunks).toString("utf8"),
        at: Date.now(),
      };
      requests.push(request);
      const postIndex = requests.filter((r) => r.method === "POST").length - 1;
      const {
        status = 200,
        body = "{}",
        headers = {},
        hold = false,
      } = reply(request, postIndex);
      if (hold) {
        held.push(res);
        return;
      }
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(body);
    });
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    posts: () => requests.filter((request) => request.method === "POST"),
    reset: () => {
      requests.length = 0;
    },
    release: () => {
      for (const res of held.splice(0)) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      }
    },
    close: () => closeServer(server),
  };
}

function wireSpans(receiver: Receiver): WireSpan[] {
  return receiver.posts().flatMap((request) => {
    const body = JSON.parse(request.text) as WireBody;
    return body.resourceSpans.flatMap((resourceSpans) =>
      resourceSpans.scopeSpans.flatMap((scopeSpans) => scopeSpans.spans),
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
  recorder: RecordingExporter;
  tracer: (scope: string) => ReturnType<NodeTracerProvider["getTracer"]>;
  flush: () => Promise<void>;
  wire: () => WireSpan[];
  close: () => Promise<void>;
};

async function makeRig(
  options: {
    exporter?: Partial<LangfuseExporterConfig>;
    reply?: (request: ReceivedRequest, postIndex: number) => Reply;
    /** The caller's `mask` / `redactIO`, set on the Langfuse exporter. */
    policy?: ContentPolicy;
  } = {},
): Promise<Rig> {
  const receiver = await startReceiver(options.reply);
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-adv",
    secretKey: "sk-adv",
    baseUrl: receiver.url,
    retries: 0,
    maxBufferSize: 10_000,
    flushIntervalMs: 60_000,
    ...options.policy,
    ...options.exporter,
  });
  await exporter.initialize();
  const recorder = new RecordingExporter();
  await recorder.initialize();
  const registry = new ExporterRegistry();
  registry.register(exporter);
  registry.register(recorder);
  const processor = new ExporterSpanProcessor(registry);
  const provider = new NodeTracerProvider({ spanProcessors: [processor] });
  return {
    registry,
    exporter,
    processor,
    receiver,
    recorder,
    tracer: (scope) => provider.getTracer(scope),
    flush: () => processor.forceFlush(),
    wire: () => wireSpans(receiver),
    close: async () => {
      await provider.shutdown().catch(() => undefined);
      await exporter.shutdown().catch(() => undefined);
      await receiver.close();
    },
  };
}

async function withRig<T>(
  options: Parameters<typeof makeRig>[0],
  run: (rig: Rig) => Promise<T>,
): Promise<T> {
  const rig = await makeRig(options);
  try {
    return await run(rig);
  } finally {
    await rig.close();
  }
}

/** What a caller sets on the Langfuse exporter. */
type ContentPolicy = Pick<LangfuseExporterConfig, "mask" | "redactIO">;
const REDACT_IO: ContentPolicy = { redactIO: true };
const MASK: ContentPolicy = { redactIO: false, mask: () => MASKED };

function childOf(parent: Span) {
  return trace.setSpan(ROOT_CONTEXT, parent);
}

// Only an observation is exported, so a span a check expects on the wire is
// marked as one.
function observed(span: Span): Span {
  observe(span, "span", {});
  return span;
}

let spanCounter = 0;
function spanData(extra: Partial<SpanData> = {}): SpanData {
  spanCounter += 1;
  const stamp = String(spanCounter).padStart(16, "0");
  return {
    spanId: stamp,
    traceId: stamp.repeat(2),
    type: SpanType.CUSTOM,
    name: `adv-span-${spanCounter}`,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-01T00:00:00.100Z",
    status: SpanStatus.OK,
    attributes: {},
    events: [],
    links: [],
    ...extra,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function capturingWarnings<T>(
  run: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = logger.warn;
  logger.warn = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    return { result: await run(), warnings };
  } finally {
    logger.warn = original;
  }
}

function constant(name: string): number {
  return Number(Reflect.get(langfuseConstants, name));
}

function note(id: string, text: string): void {
  process.stderr.write(`  [${id}] ${text}\n`);
}

// ---------------------------------------------------------------------------
// End-to-end: a global host provider feeding NeuroLink's exporter processor
// into a Langfuse exporter pointed at a local receiver
// ---------------------------------------------------------------------------

const host = await startReceiver();
const hostExporter = new LangfuseExporter({
  enabled: true,
  publicKey: "pk-host",
  secretKey: "sk-host",
  baseUrl: host.url,
  retries: 0,
  maxBufferSize: 10_000,
  flushIntervalMs: 60_000,
});
await hostExporter.initialize();
const hostRegistry = new ExporterRegistry();
hostRegistry.register(hostExporter);
const hostProvider = new NodeTracerProvider({
  spanProcessors: [new ExporterSpanProcessor(hostRegistry)],
});
hostProvider.register();
process.env.NEUROLINK_SKIP_MCP = "true";
// A shell that sets the opt-in must not change what the released-behaviour checks see.
delete process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES;

type Upstream = { baseURL: string; close: () => Promise<void> };

async function startUpstream(
  respond: (text: string) => { status: number; body: unknown },
): Promise<Upstream> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const { status, body } = respond(Buffer.concat(chunks).toString("utf8"));
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => closeServer(server),
  };
}

type Turn = { thrown: boolean; wire: WireSpan[] };

async function hostTurn(upstream: Upstream): Promise<Turn> {
  host.reset();
  let thrown = false;
  try {
    await new NeuroLink().generate({
      input: { text: "hello" },
      provider: "openai",
      model: "tool-model",
      credentials: {
        openai: { apiKey: "test-key", baseURL: upstream.baseURL },
      },
      disableInternalFallback: true,
      maxSteps: 1,
    } as never);
  } catch {
    thrown = true;
  } finally {
    await upstream.close();
  }
  await hostProvider.forceFlush();
  return { thrown, wire: wireSpans(host) };
}

// A provider whose 400 echoes the caller's key, as some gateways do.
let echoingTurn: Promise<Turn> | undefined;
function echoTurn(): Promise<Turn> {
  echoingTurn ??= (async () =>
    hostTurn(
      await startUpstream(() => ({
        status: 400,
        body: {
          error: {
            message: ECHOED_400,
            type: "invalid_request_error",
            code: "bad",
          },
        },
      })),
    ))();
  return echoingTurn;
}

// An MCP tool, run through NeuroLink.executeTool(), whose error result echoes
// a key. Only an external server's result reaches the tool span unwrapped.
const TOOL_FIXTURE = fileURLToPath(
  new URL("./fixtures/mcp-adv-exporter-tool-error-server.mjs", import.meta.url),
);
let failingToolTurn: Promise<Turn> | undefined;
function toolTurn(): Promise<Turn> {
  failingToolTurn ??= (async () => {
    host.reset();
    let thrown = false;
    const nl = new NeuroLink();
    try {
      const added = await nl.addExternalMCPServer("adv-tool-error", {
        id: "adv-tool-error",
        name: "adv-tool-error",
        description: "MCP tool whose error result echoes a key",
        transport: "stdio",
        status: "initializing",
        command: process.execPath,
        args: [TOOL_FIXTURE, PROVIDER_KEY],
        tools: [],
      });
      assert(added.success, "the MCP fixture server did not start");
      await nl.executeTool("fail_with_key", {});
    } catch {
      thrown = true;
    } finally {
      await nl.shutdownExternalMCPServers().catch(() => undefined);
    }
    await hostProvider.forceFlush();
    return { thrown, wire: wireSpans(host) };
  })();
  return failingToolTurn;
}

function attributeValues(wire: WireSpan[], key: string): string[] {
  return wire.flatMap((span) => {
    const value = attrOf(span.attributes, key);
    return value === undefined ? [] : [value];
  });
}

// ---------------------------------------------------------------------------
// Backward-compatibility rigs (BE01..BE06)
// ---------------------------------------------------------------------------

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const srcUrl = (relative: string): string =>
  pathToFileURL(join(REPO_ROOT, "src/lib", relative)).href;
const srcPath = (relative: string): string =>
  join(REPO_ROOT, "src/lib", relative);

const COMPLETION = {
  id: "chatcmpl-be",
  object: "chat.completion",
  created: 1,
  model: "tool-model",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "hello there" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
};

// The spans one plain generate() exported before the follow-up, each with the
// span it hangs under: the agent root, an attempt, a step and the generation.
const PLAIN_GENERATE_TREE = [
  "generate <- (root)",
  "generate <- step",
  "generate.attempt <- generate",
  "step <- generate.attempt",
];

function treeOf(
  spans: { spanId: string; parentSpanId?: string; name: string }[],
): string[] {
  const nameById = new Map(spans.map((span) => [span.spanId, span.name]));
  return spans
    .map(
      (span) =>
        `${span.name} <- ${
          span.parentSpanId === undefined
            ? "(root)"
            : (nameById.get(span.parentSpanId) ?? "(not exported)")
        }`,
    )
    .sort();
}

class LifecycleExporter extends RecordingExporter {
  flushes = 0;
  shutdowns = 0;

  constructor() {
    super("lifecycle");
  }

  async flush(): Promise<void> {
    this.flushes += 1;
  }

  async shutdown(): Promise<void> {
    this.shutdowns += 1;
    this.initialized = false;
  }
}

type PlainTurn = { thrown: boolean; wire: WireSpan[]; recorded: SpanData[] };
let plainGenerateTurn: Promise<PlainTurn> | undefined;
// One generate() with no tools and no feature options, against a local
// OpenAI-compatible server that answers; Langfuse and a registry exporter both
// receive whatever the pipeline exports.
function plainGenerate(): Promise<PlainTurn> {
  plainGenerateTurn ??= (async () => {
    const recorder = new RecordingExporter("be-recorder");
    await recorder.initialize();
    hostRegistry.register(recorder);
    try {
      const turn = await hostTurn(
        await startUpstream(() => ({ status: 200, body: COMPLETION })),
      );
      return { ...turn, recorded: [...recorder.spans] };
    } finally {
      hostRegistry.unregister("be-recorder");
    }
  })();
  return plainGenerateTurn;
}

type ChildRun = {
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsedMs: number;
};

async function runChild(
  source: string,
  env: Record<string, string>,
  timeoutMs: number,
): Promise<ChildRun> {
  const file = join(tempDir("neurolink-adv-exporter-"), "child.mjs");
  writeFileSync(file, source);
  const startedAt = Date.now();
  const result = await runCommand(process.execPath, ["--import", "tsx", file], {
    cwd: REPO_ROOT,
    timeoutMs,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DOTENV_CONFIG_PATH: "/dev/null",
      NEUROLINK_SKIP_MCP: "true",
      NEUROLINK_DISABLE_UPDATE_CHECK: "1",
      ...env,
    },
  });
  return { ...result, elapsedMs: Date.now() - startedAt };
}

// A host process: a provider with NeuroLink's processor and an exporter that
// holds a flush interval, as a real exporter does. After provider.shutdown()
// nothing else stops the exporter.
const HOST_EXIT_CHILD = `
import { BasicTracerProvider } from ${JSON.stringify(import.meta.resolve("@opentelemetry/sdk-trace-base"))};
import { ExporterRegistry } from ${JSON.stringify(srcUrl("observability/exporterRegistry.ts"))};
import { createExporterSpanProcessor } from ${JSON.stringify(srcUrl("observability/exporterSpanProcessor.ts"))};
import { BaseExporter } from ${JSON.stringify(srcUrl("observability/exporters/baseExporter.ts"))};
class HeldOpen extends BaseExporter {
  constructor() { super("held-open", { enabled: true }); }
  async initialize() { this.initialized = true; this.startFlushInterval(60000); }
  async exportSpan() { return this.createSuccessResult(1, 0); }
  async exportBatch(spans) { return this.createSuccessResult(spans.length, 0); }
  async flush() {}
  async shutdown() { this.stopFlushInterval(); this.initialized = false; }
  async healthCheck() { return this.createHealthStatus(true); }
}
const registry = new ExporterRegistry();
const exporter = new HeldOpen();
await exporter.initialize();
registry.register(exporter);
const provider = new BasicTracerProvider({ spanProcessors: [createExporterSpanProcessor(registry)] });
provider.getTracer("sdk").startSpan("x", { attributes: { "langfuse.observation.type": "span" } }).end();
await provider.shutdown();
console.log("SHUTDOWN_RESOLVED");
`;

// The real startup path: environment-driven tracing, NeuroLink's own tracers,
// its provider and processor, the Langfuse exporter, a local receiver.
const STARTUP_CHILD = `
import { SpanKind, context, trace } from ${JSON.stringify(import.meta.resolve("@opentelemetry/api"))};
import { tracers } from ${JSON.stringify(srcUrl("telemetry/tracers.ts"))};
import { observe } from ${JSON.stringify(srcUrl("telemetry/observation.ts"))};
import { flushOpenTelemetry, shutdownOpenTelemetry } from ${JSON.stringify(srcUrl("services/server/ai/observability/instrumentation.ts"))};
const within = (span) => trace.setSpan(context.active(), span);
const root = tracers.sdk.startSpan("neurolink.generate");
observe(root, "span", { input: "hi" });
const generation = tracers.provider.startSpan("provider.generate", { kind: SpanKind.CLIENT }, within(root));
observe(generation, "generation", { model: "gpt-4o", input: "in", output: "out", usageDetails: { input: 3, output: 4 } });
generation.end();
root.end();
await flushOpenTelemetry();
await shutdownOpenTelemetry();
process.exit(0);
`;

type StartupWire = {
  exitCode: number;
  resources: Record<string, string>[];
  scopes: string[];
  kinds: number[];
  names: string[];
};
type StartupBody = {
  resourceSpans: {
    resource: { attributes: OtlpKv[] };
    scopeSpans: {
      scope: { name: string };
      spans: (WireSpan & { kind?: number })[];
    }[];
  }[];
};

const startupRuns = new Map<string, Promise<StartupWire>>();
function startupRun(
  label: "default" | "named",
  env: Record<string, string>,
): Promise<StartupWire> {
  let run = startupRuns.get(label);
  if (!run) {
    run = (async () => {
      const receiver = await startReceiver();
      try {
        const child = await runChild(
          STARTUP_CHILD,
          {
            LANGFUSE_PUBLIC_KEY: "pk-startup",
            LANGFUSE_SECRET_KEY: "sk-startup",
            LANGFUSE_BASE_URL: receiver.url,
            ...env,
          },
          60_000,
        );
        const bodies = receiver
          .posts()
          .map((request) => JSON.parse(request.text) as StartupBody);
        const resourceSpans = bodies.flatMap((body) => body.resourceSpans);
        const scopeSpans = resourceSpans.flatMap((entry) => entry.scopeSpans);
        const spans = scopeSpans.flatMap((entry) => entry.spans);
        return {
          exitCode: child.exitCode,
          resources: resourceSpans.map((entry) =>
            Object.fromEntries(
              entry.resource.attributes.map((kv) => [
                kv.key,
                attrOf([kv], kv.key) ?? "",
              ]),
            ),
          ),
          scopes: scopeSpans.map((entry) => entry.scope.name),
          kinds: spans.map((span) => span.kind ?? -1),
          names: spans.map((span) => span.name),
        };
      } finally {
        await receiver.close();
      }
    })();
    startupRuns.set(label, run);
  }
  return run;
}

// A source file written against the previous release's types, compiled with
// tsc against this tree's. One compile covers every BE06 check.
type ConsumerDiagnostic = { file: string; code: string; message: string };
const CONSUMER_IMPORTS = `
import { BaseExporter } from ${JSON.stringify(srcPath("observability/exporters/baseExporter.js"))};
import type { ExportResult, ExporterHealthStatus, OtlpSpan, SpanData } from ${JSON.stringify(srcPath("types/index.js"))};
`;
const CONSUMER_BODY = `
  constructor() { super("consumer", { enabled: true }); }
  async initialize(): Promise<void> {}
  async exportSpan(_span: SpanData): Promise<ExportResult> { return this.createSuccessResult(1, 0); }
  async exportBatch(_spans: SpanData[]): Promise<ExportResult> { return this.createSuccessResult(1, 0); }
  async flush(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async healthCheck(): Promise<ExporterHealthStatus> { return this.createHealthStatus(true); }
`;
const CONSUMER_FILES: Record<string, string> = {
  "own-get-status.ts": `${CONSUMER_IMPORTS}
export class OwnGetStatus extends BaseExporter {${CONSUMER_BODY}
  getStatus(): string { return "mine"; }
}
`,
  "own-counters.ts": `${CONSUMER_IMPORTS}
export class OwnCounters extends BaseExporter {${CONSUMER_BODY}
  private deliveredSpans = 0;
  private failedSpans = 0;
  private lastFailure = new Error("x");
  countOne(): Error { this.deliveredSpans += 1; this.failedSpans += 1; return this.lastFailure; }
}
`,
  "own-retry-members.ts": `${CONSUMER_IMPORTS}
export class OwnRetryMembers extends BaseExporter {${CONSUMER_BODY}
  private retryDelayMs = 250;
  deliveryCounts(): number { return this.retryDelayMs; }
}
`,
  "previous-members.ts": `${CONSUMER_IMPORTS}
export class PreviousMembers extends BaseExporter {${CONSUMER_BODY}
  note(span: SpanData): number {
    this.bufferSpan(span);
    this.startFlushInterval(1000);
    this.stopFlushInterval();
    return this.getPendingCount() + this.getLastExportTime() + (this.isInitialized() ? 1 : 0);
  }
  retry(): Promise<number> { return this.withRetry(async () => 1, "op"); }
}
`,
  "hand-built-otlp-span.ts": `${CONSUMER_IMPORTS}
export const built: OtlpSpan = { traceId: "a", spanId: "b", name: "n", kind: 1, startTimeUnixNano: "1", endTimeUnixNano: "2", attributes: [], events: [], status: { code: 0 } };
`,
  "control.ts": `export const broken: number = "not a number";\n`,
};

let consumerCompile: Promise<ConsumerDiagnostic[]> | undefined;
function compileConsumers(): Promise<ConsumerDiagnostic[]> {
  consumerCompile ??= (async () => {
    const dir = tempDir("neurolink-adv-exporter-tsc-");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), '{ "type": "module" }');
    const files = Object.entries(CONSUMER_FILES).map(([name, source]) => {
      writeFileSync(join(dir, name), source);
      return join(dir, name);
    });
    const result = await runCommand(
      join(REPO_ROOT, "node_modules/.bin/tsc"),
      [
        "--noEmit",
        "--strict",
        "--target",
        "es2023",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
        "--skipLibCheck",
        "--types",
        "node",
        "--typeRoots",
        join(REPO_ROOT, "node_modules/@types"),
        ...files,
      ],
      { cwd: REPO_ROOT, timeoutMs: 600_000 },
    );
    const lines = `${result.stdout}\n${result.stderr}`.split("\n");
    return lines.flatMap((line) => {
      const match = /^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/.exec(line);
      return match
        ? [
            {
              file: match[1].split("/").pop() ?? match[1],
              code: match[2],
              message: match[3],
            },
          ]
        : [];
    });
  })();
  return consumerCompile;
}
if (!ONLY || ONLY.includes("BE06")) {
  void compileConsumers().catch(() => undefined);
}

function duckExporter(name: string, initialized: boolean, pending: number) {
  return {
    getName: () => name,
    isInitialized: () => initialized,
    initialize: async () => {},
    exportSpan: async () => ({
      success: true,
      exportedCount: 1,
      failedCount: 0,
      durationMs: 0,
    }),
    exportBatch: async () => ({
      success: true,
      exportedCount: 0,
      failedCount: 0,
      durationMs: 0,
    }),
    flush: async () => {},
    shutdown: async () => {},
    healthCheck: async () => ({ healthy: true, name, pendingSpans: pending }),
    getPendingCount: () => pending,
    getLastExportTime: () => 0,
  };
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

const { test, section, runSuite } = defineSuite(
  "Observability exporter, adversarial follow-up",
  { offline: true, perTestTimeoutMs: 180_000 },
);

async function proof(
  id: string,
  description: string,
  check: () => boolean | Promise<boolean>,
): Promise<void> {
  if (ONLY && !ONLY.includes(id)) {
    return;
  }
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

// Error, tool and retry attributes NeuroLink writes on exported spans.
function writeErrorAttributes(span: Span): void {
  span.setAttribute("error.message", `upstream said: ${PROMPT}`);
  span.setAttribute("tool.error.message", `tool failed on ${PROMPT}`);
  span.addEvent("gen_ai.provider.retry", {
    "retry.attempt": 1,
    "retry.error": `400 bad input ${PROMPT}`,
  });
}

const FOREIGN_CONTENT: Record<string, string> = {
  "ai.prompt": PROMPT,
  "ai.prompt.messages": JSON.stringify([{ role: "user", content: PROMPT }]),
  "ai.response.text": `answer ${PROMPT}`,
  "ai.response.toolCalls": JSON.stringify([{ args: PROMPT }]),
  "ai.response.object": JSON.stringify({ value: PROMPT }),
  "ai.toolCall.args": JSON.stringify({ q: PROMPT }),
  "ai.toolCall.result": JSON.stringify({ r: PROMPT }),
  "gen_ai.prompt": PROMPT,
  "gen_ai.completion": PROMPT,
  "gen_ai.prompt.0.content": PROMPT,
  "gen_ai.completion.0.content": PROMPT,
  "gen_ai.input.messages": JSON.stringify([
    { role: "user", parts: [{ type: "text", content: PROMPT }] },
  ]),
  "gen_ai.output.messages": JSON.stringify([
    { role: "assistant", parts: [{ type: "text", content: PROMPT }] },
  ]),
  "gen_ai.system_instructions": PROMPT,
  "gen_ai.tool.call.arguments": JSON.stringify({ q: PROMPT }),
  "gen_ai.tool.call.result": JSON.stringify({ r: PROMPT }),
  "input.value": PROMPT,
  "output.value": PROMPT,
  "llm.input_messages.0.message.content": PROMPT,
  "llm.output_messages.0.message.content": PROMPT,
};

async function foreignGenAiSpan(policy: ContentPolicy) {
  return withRig({ policy }, async (rig) => {
    rig
      .tracer("ai")
      .startSpan("ai.generateText.doGenerate", {
        attributes: {
          "gen_ai.system": "openai",
          "gen_ai.request.model": "gpt-4o",
          "gen_ai.usage.input_tokens": 10,
          ...FOREIGN_CONTENT,
        },
      })
      .end();
    await rig.flush();
    return rig
      .wire()
      .find((span) => span.name === "ai.generateText.doGenerate");
  });
}

void runSuite(async () => {
  // ----------------------------------------------------------------- A01
  section("A01 status message");

  await proof(
    "A01",
    "observe() records a status message as given, key included, when no policy is set",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("sdk").startSpan("generate");
        observe(span, "agent", {
          level: "ERROR",
          statusMessage: ECHOED_STATUS,
        });
        span.end();
        await rig.flush();
        const status = attrOf(rig.wire()[0]?.attributes, STATUS_MESSAGE);
        return status === ECHOED_STATUS;
      }),
  );

  await proof(
    "A01",
    "generate() against a provider whose 400 echoes a key: a status_message carries the echoed text, key included",
    async () => {
      const { thrown, wire } = await echoTurn();
      const statuses = attributeValues(wire, STATUS_MESSAGE);
      note(
        "A01",
        `turn threw=${thrown} status_message attributes=${statuses.length}`,
      );
      return (
        thrown &&
        statuses.length > 0 &&
        statuses.some((status) => status.includes(ECHOED_400))
      );
    },
  );

  await proof(
    "A01",
    "an MCP tool whose error result echoes a key: the tool's status_message carries the echoed text, key included",
    async () => {
      const { wire } = await toolTurn();
      const statuses = attributeValues(wire, STATUS_MESSAGE);
      note("A01", `tool turn status_message attributes=${statuses.length}`);
      return statuses.some((status) => status.includes(ECHOED_TOOL_ERROR));
    },
  );

  for (const [label, policy] of [
    ["redactIO leaves", REDACT_IO],
    ["a mask leaves", MASK],
  ] as const) {
    await proof(
      "A01",
      `${label} the status_message attribute as recorded`,
      () =>
        withRig({ policy }, async (rig) => {
          const span = rig.tracer("sdk").startSpan("generate");
          observe(span, "agent", {
            level: "ERROR",
            statusMessage: `failed on ${PROMPT}`,
          });
          span.end();
          await rig.flush();
          return (
            attrOf(rig.wire()[0]?.attributes, STATUS_MESSAGE) ===
            `failed on ${PROMPT}`
          );
        }),
    );
  }

  // ----------------------------------------------------------------- A02
  section("A02 error, tool error and retry messages");

  await proof(
    "A02",
    "generate() against a provider whose 400 echoes a key: error.message carries the echoed text, key included",
    async () => {
      const { wire } = await echoTurn();
      const messages = attributeValues(wire, "error.message");
      note("A02", `error.message attributes=${messages.length}`);
      return (
        messages.length > 0 &&
        messages.some((message) => message.includes(ECHOED_400))
      );
    },
  );

  await proof(
    "A02",
    "generate() against a provider whose 400 echoes a key: an exported span carries the echoed text verbatim, key included",
    async () => {
      const { wire } = await echoTurn();
      const carrying = wire.filter((span) => carries(span, ECHOED_400));
      note("A02", `spans=${wire.length} carrying the echo=${carrying.length}`);
      return wire.length > 0 && carrying.length > 0;
    },
  );

  await proof(
    "A02",
    "an MCP tool whose error result echoes a key: tool.error.message carries the echoed text, key included",
    async () => {
      const { wire } = await toolTurn();
      const messages = attributeValues(wire, "tool.error.message");
      note("A02", `tool.error.message attributes=${messages.length}`);
      return messages.some((message) => message.includes(ECHOED_TOOL_ERROR));
    },
  );

  await proof(
    "A02",
    "a retried provider error with a key: retry.error on the retry event carries the error text as thrown, key included",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("provider").startSpan("provider.generate");
        observe(span, "generation", { model: "m" });
        let calls = 0;
        await withProviderRetry(
          async () => {
            calls += 1;
            if (calls === 1) {
              throw Object.assign(new Error(ECHOED_RETRY), {
                statusCode: 500,
              });
            }
            return "ok";
          },
          span,
          "adv",
          async () => undefined,
        );
        span.end();
        await rig.flush();
        const event = rig
          .wire()[0]
          ?.events.find((entry) => entry.name === "gen_ai.provider.retry");
        const retryError = attrOf(event?.attributes, "retry.error");
        return retryError !== undefined && retryError.includes(ECHOED_RETRY);
      }),
  );

  for (const [label, policy] of [
    ["redactIO leaves", REDACT_IO],
    ["a mask leaves", MASK],
  ] as const) {
    await proof(
      "A02",
      `${label} error.message, tool.error.message and retry.error as recorded`,
      () =>
        withRig({ policy }, async (rig) => {
          const span = rig.tracer("provider").startSpan("provider.generate");
          observe(span, "generation", { model: "m" });
          writeErrorAttributes(span);
          span.end();
          await rig.flush();
          const sent = rig.wire()[0];
          const event = sent?.events.find(
            (entry) => entry.name === "gen_ai.provider.retry",
          );
          const values = [
            attrOf(sent?.attributes, "error.message"),
            attrOf(sent?.attributes, "tool.error.message"),
            attrOf(event?.attributes, "retry.error"),
          ];
          return (
            sent !== undefined &&
            event !== undefined &&
            values[0] === `upstream said: ${PROMPT}` &&
            values[1] === `tool failed on ${PROMPT}` &&
            values[2] === `400 bad input ${PROMPT}`
          );
        }),
    );
  }

  // ----------------------------------------------------------------- A03
  section("A03 another library's GenAI span");

  await proof(
    "A03",
    "redactIO leaves every prompt and completion key of a foreign GenAI span as recorded, as the released build did",
    async () => {
      const sent = await foreignGenAiSpan(REDACT_IO);
      const changed = Object.entries(FOREIGN_CONTENT).filter(
        ([key, value]) => attrOf(sent?.attributes, key) !== value,
      );
      note("A03", `redactIO: content keys changed=${changed.length}`);
      return sent !== undefined && changed.length === 0;
    },
  );

  await proof(
    "A03",
    "a mask leaves every prompt and completion key of a foreign GenAI span as recorded, as the released build did",
    async () => {
      const sent = await foreignGenAiSpan(MASK);
      const changed = Object.entries(FOREIGN_CONTENT).filter(
        ([key, value]) => attrOf(sent?.attributes, key) !== value,
      );
      note("A03", `mask: content keys changed=${changed.length}`);
      return sent !== undefined && changed.length === 0;
    },
  );

  await proof(
    "A03",
    "control: under either policy the foreign GenAI span is still exported with its model and usage",
    async () => {
      const spans = [
        await foreignGenAiSpan(REDACT_IO),
        await foreignGenAiSpan(MASK),
      ];
      return spans.every(
        (sent) =>
          attrOf(sent?.attributes, "gen_ai.request.model") === "gpt-4o" &&
          attrOf(sent?.attributes, "gen_ai.usage.input_tokens") === "10",
      );
    },
  );

  // ----------------------------------------------------------------- A04
  section("A04 non-object metadata");

  await proof(
    "A04",
    "a mask leaves the bare langfuse.observation.metadata key as recorded, as the released build did",
    () =>
      withRig({ policy: MASK }, async (rig) => {
        const span = rig.tracer("sdk").startSpan("s");
        observe(span, "span", { metadata: [PROMPT] as never });
        span.end();
        await rig.flush();
        const sent = rig.wire()[0];
        return (
          attrOf(sent?.attributes, "langfuse.observation.metadata")?.includes(
            PROMPT,
          ) === true
        );
      }),
  );

  await proof(
    "A04",
    "a mask leaves the bare langfuse.trace.metadata key as recorded, as the released build did",
    () =>
      withRig({ policy: MASK }, async (rig) => {
        const span = rig.tracer("sdk").startSpan("s");
        observe(span, "span", {});
        span.setAttribute("langfuse.trace.metadata", JSON.stringify([PROMPT]));
        span.end();
        await rig.flush();
        const sent = rig.wire()[0];
        return (
          attrOf(sent?.attributes, "langfuse.trace.metadata")?.includes(
            PROMPT,
          ) === true
        );
      }),
  );

  await proof("A04", "control: keyed metadata entries are still masked", () =>
    withRig({ policy: MASK }, async (rig) => {
      const span = rig.tracer("sdk").startSpan("s");
      observe(span, "span", { metadata: { note: PROMPT } });
      observeTrace(span, { metadata: { note: PROMPT } });
      span.end();
      await rig.flush();
      const sent = rig.wire()[0];
      return (
        attrOf(sent?.attributes, "langfuse.observation.metadata.note") ===
          MASKED &&
        attrOf(sent?.attributes, "langfuse.trace.metadata.note") === MASKED
      );
    }),
  );

  // ----------------------------------------------------------------- A05
  section("A05 object keys and {name, value} entries, as released");

  const keyedUrl = `https://api.example.com/v1/items?api_key=${URL_SECRET}`;

  await proof(
    "A05",
    "an object key of a tool_result is recorded as the released build recorded it, in observation.input and trace.input",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("provider").startSpan("provider.generate");
        // The generation of a direct loop that opened its own root: only such
        // a generation writes the trace's input (under a host span the host owns it).
        markTurnlessRoot(span);
        observeGeneration(span, {
          provider: "openai",
          model: "gpt-4o",
          input: {
            messages: [
              { role: "user", content: "fetch the pages" },
              {
                role: "assistant",
                content: [
                  { type: "tool_use", id: "t1", name: "fetch", input: {} },
                ],
              },
              {
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: "t1",
                    content: { visited: { [keyedUrl]: { status: 200 } } },
                  },
                ],
              },
            ],
          },
          output: "done",
        });
        span.end();
        await rig.flush();
        const sent = rig.wire()[0];
        const input = attrOf(sent?.attributes, INPUT) ?? "";
        const traceInput = attrOf(sent?.attributes, TRACE_INPUT) ?? "";
        return (
          input.includes(keyedUrl) &&
          traceInput.includes(keyedUrl) &&
          input.includes("api.example.com/v1/items") &&
          traceInput.includes("api.example.com/v1/items")
        );
      }),
  );

  await proof(
    "A05",
    "an object key of a tool output is recorded as the released build recorded it",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("mcp").startSpan("tool.fetch");
        observe(span, "tool", {
          output: { [`https://h.example/x?access_token=${URL_SECRET}`]: "ok" },
        });
        span.end();
        await rig.flush();
        const output = attrOf(rig.wire()[0]?.attributes, OUTPUT) ?? "";
        return output.includes(`h.example/x?access_token=${URL_SECRET}`);
      }),
  );

  await proof(
    "A05",
    "an attribute built earlier from a credential-looking key is handed to observe() unchanged",
    () =>
      withRig({}, async (rig) => {
        const earlier = spanContentAttribute({
          [`password=${URL_SECRET}`]: true,
        });
        const span = rig.tracer("sdk").startSpan("s");
        observe(span, "span", { input: earlier });
        observeTrace(span, { input: earlier });
        span.end();
        await rig.flush();
        const sent = rig.wire()[0];
        return [INPUT, TRACE_INPUT].every(
          (key) => attrOf(sent?.attributes, key) === earlier,
        );
      }),
  );

  await proof(
    "A05",
    "a {name, value} pair that names a credential is recorded as the released build recorded it",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("mcp").startSpan("tool.call");
        observe(span, "tool", {
          input: {
            env: [{ name: "api_key", value: URL_SECRET }],
            headers: [{ key: "Authorization", value: `Basic ${URL_SECRET}` }],
          },
        });
        span.end();
        await rig.flush();
        const input = attrOf(rig.wire()[0]?.attributes, INPUT) ?? "";
        return input.includes("api_key") && input.includes(URL_SECRET);
      }),
  );

  await proof(
    "A05",
    "control: keys and {name, value} pairs that name no credential are unchanged",
    () =>
      withRig({}, async (rig) => {
        const content = {
          "https://example.com/a?page=2": { status: 200 },
          settings: [
            { name: "model", value: "gpt-4o" },
            { name: "max_tokens", value: 4096 },
            { key: "region", value: "us-east-1" },
          ],
        };
        const span = rig.tracer("mcp").startSpan("tool.call");
        observe(span, "tool", { input: content });
        span.end();
        await rig.flush();
        const input = attrOf(rig.wire()[0]?.attributes, INPUT);
        return input === JSON.stringify(content);
      }),
  );

  // ---------------------------------------------------------------- A14
  section("A14 NEUROLINK_MASK_CREDENTIAL_ENTRIES");

  const MASK_ENTRIES = "NEUROLINK_MASK_CREDENTIAL_ENTRIES";
  async function withMaskEntries<T>(
    value: string | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = process.env[MASK_ENTRIES];
    if (value === undefined) {
      delete process.env[MASK_ENTRIES];
    } else {
      process.env[MASK_ENTRIES] = value;
    }
    try {
      return await fn();
    } finally {
      if (previous === undefined) {
        delete process.env[MASK_ENTRIES];
      } else {
        process.env[MASK_ENTRIES] = previous;
      }
    }
  }
  const credentialPairs = {
    env: [{ name: "api_key", value: URL_SECRET }],
    headers: [{ key: "Authorization", value: `Basic ${URL_SECRET}` }],
  };
  const sentInput = (content: unknown, key: string) =>
    withRig({}, async (rig) => {
      const span = rig.tracer("mcp").startSpan("tool.call");
      observe(
        span,
        "tool",
        key === INPUT ? { input: content } : { output: content },
      );
      span.end();
      await rig.flush();
      return attrOf(rig.wire()[0]?.attributes, key) ?? "";
    });

  await proof(
    "A14",
    "with the variable set to true, a {name, value} pair that names a credential has its value masked, read at call time",
    () =>
      withMaskEntries("true", async () => {
        const input = await sentInput(credentialPairs, INPUT);
        return input.includes("api_key") && !input.includes(URL_SECRET);
      }),
  );

  await proof(
    "A14",
    "with the variable set (any casing, padded), a credential inside an object key is masked and the rest of the key kept",
    () =>
      withMaskEntries(" TRUE ", async () => {
        const output = await sentInput(
          { [`https://h.example/x?access_token=${URL_SECRET}`]: "ok" },
          OUTPUT,
        );
        return output.includes("h.example/x") && !output.includes(URL_SECRET);
      }),
  );

  await proof(
    "A14",
    "with the variable set, a numeric credential in a {name, value} entry is masked like the same credential under a key",
    () =>
      withMaskEntries("true", async () => {
        const pin = "4821907";
        const entry = await sentInput(
          { fields: [{ name: "password", value: pin }] },
          INPUT,
        );
        const keyed = await sentInput({ password: pin }, INPUT);
        return (
          !entry.includes(pin) &&
          entry.includes("[REDACTED]") &&
          !keyed.includes(pin)
        );
      }),
  );

  await proof(
    "A14",
    "with the variable set, an entry named access_tokens or refresh_tokens is masked like the same names under a key, while max_tokens and prompt_tokens stay readable",
    () =>
      withMaskEntries("true", async () => {
        const jwt = "eyJhbGciOiJIUzI1.payloadpart.signaturepart";
        const entry = await sentInput(
          {
            fields: [
              { name: "access_tokens", value: jwt },
              { name: "refresh_tokens", value: jwt },
              { name: "max_tokens", value: "4096 or so" },
              { name: "prompt_tokens", value: "12 of them" },
            ],
          },
          INPUT,
        );
        const keyed = await sentInput({ access_tokens: jwt }, INPUT);
        return (
          !entry.includes(jwt) &&
          !keyed.includes(jwt) &&
          entry.includes("4096 or so") &&
          entry.includes("12 of them")
        );
      }),
  );

  await proof(
    "A14",
    "with the variable set, keys and {name, value} pairs that name no credential are unchanged",
    () =>
      withMaskEntries("true", async () => {
        const content = {
          "https://example.com/a?page=2": { status: 200 },
          settings: [
            { name: "model", value: "gpt-4o" },
            { name: "max_tokens", value: 4096 },
            { name: "password_policy", value: "min length 8" },
            { key: "region", value: "us-east-1" },
          ],
        };
        return (await sentInput(content, INPUT)) === JSON.stringify(content);
      }),
  );

  for (const off of [undefined, "", "false", "1", "yes", "on"]) {
    await proof(
      "A14",
      `with the variable ${off === undefined ? "unset" : `set to "${off}"`} nothing is masked beyond the released rules`,
      () =>
        withMaskEntries(off, async () => {
          const input = await sentInput(credentialPairs, INPUT);
          return input.includes(URL_SECRET);
        }),
    );
  }

  await proof(
    "A05",
    "a KEY=value line followed by text is still redacted exactly once, the text kept",
    () =>
      withRig({}, async (rig) => {
        const span = rig.tracer("sdk").startSpan("generate");
        const request = {
          messages: [
            {
              role: "user",
              content:
                "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwx\nKEEP-THIS-TAIL please",
            },
          ],
        };
        observeGeneration(span, {
          provider: "openai",
          model: "gpt-4o",
          input: request,
          output: "API_TOKEN=abc123xyz\nKEEP-OUTPUT-TAIL",
        });
        span.end();
        await rig.flush();
        const sent = rig.wire()[0];
        const input = attrOf(sent?.attributes, INPUT) ?? "";
        const output = attrOf(sent?.attributes, OUTPUT) ?? "";
        return (
          input === spanModelRequestAttribute(request) &&
          input.includes("KEEP-THIS-TAIL") &&
          !input.includes("sk-abcdefghijklmnopqrstuvwx") &&
          output.includes("KEEP-OUTPUT-TAIL") &&
          !output.includes("abc123xyz")
        );
      }),
  );

  // ----------------------------------------------------------------- A06
  section("A06 re-parenting behind ended ancestors");

  const INTERNAL = { [INTERNAL_SPAN_ATTRIBUTE]: true };

  async function grandchildParent(
    fillers: number,
    endOrder: "child-first" | "parent-first",
  ): Promise<boolean> {
    return withRig({}, async (rig) => {
      const tracer = rig.tracer("sdk");
      const top = observed(tracer.startSpan("P"));
      const wrapper = tracer.startSpan(
        "W",
        { attributes: INTERNAL },
        childOf(top),
      );
      const inner = tracer.startSpan(
        "C",
        { attributes: INTERNAL },
        childOf(wrapper),
      );
      const leaf = observed(tracer.startSpan("G", {}, childOf(inner)));
      const ancestors =
        endOrder === "child-first" ? [inner, wrapper] : [wrapper, inner];
      for (const ancestor of ancestors) {
        ancestor.end();
      }
      for (let index = 0; index < fillers; index++) {
        tracer.startSpan(`u${index}`, { attributes: INTERNAL }).end();
      }
      leaf.end();
      top.end();
      await rig.flush();
      const sent = rig.wire().find((span) => span.name === "G");
      return sent?.parentSpanId === top.spanContext().spanId;
    });
  }

  await proof(
    "A06",
    `a grandchild behind two ended internal ancestors keeps its exported grandparent after ${MAX_REMEMBERED_SPANS + 100} unrelated spans end`,
    async () =>
      (await grandchildParent(MAX_REMEMBERED_SPANS + 100, "child-first")) &&
      (await grandchildParent(MAX_REMEMBERED_SPANS + 100, "parent-first")),
  );

  await proof(
    "A06",
    "the same holds behind two ended foreign-scope ancestors",
    () =>
      withRig({}, async (rig) => {
        const own = rig.tracer("sdk");
        const other = rig.tracer("undici");
        const top = observed(own.startSpan("P"));
        const outer = other.startSpan("http.client", {}, childOf(top));
        const inner = other.startSpan("http.inner", {}, childOf(outer));
        const leaf = observed(own.startSpan("G", {}, childOf(inner)));
        inner.end();
        outer.end();
        for (let index = 0; index < MAX_REMEMBERED_SPANS + 100; index++) {
          other.startSpan(`noise${index}`).end();
        }
        leaf.end();
        top.end();
        await rig.flush();
        const sent = rig.wire().find((span) => span.name === "G");
        const maps = rig.processor as unknown as {
          open: Map<string, unknown>;
          ended: Map<string, unknown>;
          pins: Map<string, number>;
        };
        note(
          "A06",
          `after everything ended: open=${maps.open.size} ended=${maps.ended.size} pins=${maps.pins.size}`,
        );
        return sent?.parentSpanId === top.spanContext().spanId;
      }),
  );

  await proof(
    "A06",
    "control: with 10 unrelated spans the grandparent is found",
    async () =>
      (await grandchildParent(10, "child-first")) &&
      (await grandchildParent(10, "parent-first")),
  );

  await proof(
    "A06",
    "once every span has ended the processor remembers no open span, no pin and at most the limit",
    () =>
      withRig({}, async (rig) => {
        const tracer = rig.tracer("sdk");
        const top = observed(tracer.startSpan("P"));
        const wrapper = tracer.startSpan(
          "W",
          { attributes: INTERNAL },
          childOf(top),
        );
        const inner = tracer.startSpan(
          "C",
          { attributes: INTERNAL },
          childOf(wrapper),
        );
        const leaves = [0, 1, 2].map((index) =>
          observed(tracer.startSpan(`G${index}`, {}, childOf(inner))),
        );
        inner.end();
        wrapper.end();
        for (let index = 0; index < MAX_REMEMBERED_SPANS + 100; index++) {
          tracer.startSpan(`u${index}`, { attributes: INTERNAL }).end();
        }
        for (const leaf of leaves) {
          leaf.end();
        }
        top.end();
        await rig.flush();
        const maps = rig.processor as unknown as {
          open: Map<string, unknown>;
          ended: Map<string, unknown>;
          pins: Map<string, number>;
        };
        const parents = rig
          .wire()
          .filter((span) => /^G\d$/.test(span.name))
          .map((span) => span.parentSpanId);
        return (
          parents.length === 3 &&
          parents.every((id) => id === top.spanContext().spanId) &&
          maps.open.size === 0 &&
          maps.pins.size === 0 &&
          maps.ended.size <= MAX_REMEMBERED_SPANS
        );
      }),
  );

  // ----------------------------------------------------------------- A07
  section("A07 a 2xx body that is not an object");

  await proof(
    "A07",
    "a 200 with the JSON body null is a full success, POSTed once",
    () =>
      withRig(
        {
          exporter: { retries: 2 },
          reply: () => ({ status: 200, body: "null" }),
        },
        async (rig) => {
          const result = await rig.exporter.exportBatch([
            spanData(),
            spanData(),
          ]);
          const status = rig.exporter.getStatus();
          note("A07", `posts=${rig.receiver.posts().length}`);
          return (
            rig.receiver.posts().length === 1 &&
            result.success &&
            result.exportedCount === 2 &&
            result.failedCount === 0 &&
            status.failedSpans === 0 &&
            status.deliveredSpans === 2
          );
        },
      ),
  );

  await proof(
    "A07",
    "control: 200 bodies that are true, a string, an array or not JSON are full successes",
    async () => {
      const outcomes: boolean[] = [];
      for (const body of ["true", '"ok"', "[1]", "not json"]) {
        outcomes.push(
          await withRig(
            {
              exporter: { retries: 2 },
              reply: () => ({ status: 200, body }),
            },
            async (rig) => {
              const result = await rig.exporter.exportBatch([spanData()]);
              return (
                rig.receiver.posts().length === 1 &&
                result.success &&
                result.exportedCount === 1
              );
            },
          ),
        );
      }
      return outcomes.every(Boolean);
    },
  );

  // ----------------------------------------------------------------- A08
  section("A08 partialSuccess.rejectedSpans is validated");

  const partial = (rejectedSpans: unknown): Reply => ({
    status: 200,
    body: JSON.stringify({ partialSuccess: { rejectedSpans } }),
  });

  await proof(
    "A08",
    'rejectedSpans "n/a" counts as none, and later real drops are still counted and health-checked',
    async () => {
      let mode: "malformed" | "down" = "malformed";
      return withRig(
        {
          reply: () =>
            mode === "malformed" ? partial("n/a") : { status: 400 },
        },
        async (rig) => {
          const first = await rig.exporter.exportBatch([
            spanData(),
            spanData(),
          ]);
          mode = "down";
          await rig.exporter.exportBatch([spanData(), spanData(), spanData()]);
          const status = rig.exporter.getStatus();
          const health = await rig.exporter.healthCheck();
          note(
            "A08",
            `failedSpans=${status.failedSpans} deliveredSpans=${status.deliveredSpans}`,
          );
          return (
            first.success &&
            first.exportedCount === 2 &&
            status.failedSpans === 3 &&
            status.deliveredSpans === 2 &&
            (health.errors ?? []).some((message) =>
              /3 spans dropped/.test(message),
            )
          );
        },
      );
    },
  );

  await proof(
    "A08",
    'rejectedSpans "-3" neither lowers failedSpans nor inflates deliveredSpans',
    async () => {
      let mode: "down" | "negative" = "down";
      return withRig(
        { reply: () => (mode === "down" ? { status: 400 } : partial("-3")) },
        async (rig) => {
          await rig.exporter.exportBatch([spanData(), spanData(), spanData()]);
          mode = "negative";
          const result = await rig.exporter.exportBatch([spanData()]);
          const status = rig.exporter.getStatus();
          note(
            "A08",
            `failedSpans=${status.failedSpans} deliveredSpans=${status.deliveredSpans}`,
          );
          return (
            result.success &&
            result.exportedCount === 1 &&
            status.failedSpans === 3 &&
            status.deliveredSpans === 1
          );
        },
      );
    },
  );

  await proof(
    "A08",
    "rejectedSpans larger than the batch, or not a whole number, counts as none",
    async () => {
      const outcomes: boolean[] = [];
      for (const rejectedSpans of [5, "5", 1.5, "1e400", true]) {
        outcomes.push(
          await withRig(
            { reply: () => partial(rejectedSpans) },
            async (rig) => {
              const result = await rig.exporter.exportBatch([
                spanData(),
                spanData(),
              ]);
              const status = rig.exporter.getStatus();
              return (
                result.success &&
                result.exportedCount === 2 &&
                result.failedCount === 0 &&
                status.failedSpans === 0 &&
                status.deliveredSpans === 2
              );
            },
          ),
        );
      }
      note("A08", `accepted as none: ${outcomes.filter(Boolean).length} of 5`);
      return outcomes.every(Boolean);
    },
  );

  // ----------------------------------------------------------------- A09
  section("A09 a black-holed Langfuse");

  const BLACK_HOLE_SPANS = 15_000;
  const blackHole = await (async () => {
    if (ONLY && !ONLY.includes("A09")) {
      return undefined;
    }
    let answering = false;
    const rig = await makeRig({
      exporter: {
        maxBufferSize: undefined,
        flushIntervalMs: undefined,
        retries: undefined,
        flushBudgetMs: 20_000,
      },
      reply: (request) =>
        answering || request.method !== "POST" ? {} : { hold: true },
    });
    try {
      rig.registry.configureCircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 60_000,
      });
      const payload = "x".repeat(200);
      const { result: load, warnings } = await capturingWarnings(async () => {
        let refused = 0;
        for (let index = 0; index < BLACK_HOLE_SPANS; index++) {
          const results = await rig.registry.exportToAll(
            spanData({ attributes: { "langfuse.observation.input": payload } }),
          );
          if (results.get("langfuse")?.success !== true) {
            refused += 1;
          }
        }
        await sleep(1_500);
        return {
          refused,
          posts: rig.receiver.posts().length,
          onWire: wireSpans(rig.receiver).length,
          status: rig.exporter.getStatus(),
          health: await rig.exporter.healthCheck(),
          breaker: rig.registry.getCircuitBreakerStatus("langfuse"),
        };
      });
      answering = true;
      rig.receiver.release();
      await sleep(500);
      rig.receiver.reset();
      await rig.registry.exportToAll(spanData({ name: "after-recovery" }));
      await rig.exporter.flush();
      const recovered = wireSpans(rig.receiver).some(
        (span) => span.name === "after-recovery",
      );
      note(
        "A09",
        `posts in flight=${load.posts} spans on wire=${load.onWire} failedSpans=${load.status.failedSpans} pendingSpans=${load.status.pendingSpans} healthy=${load.status.healthy} cap=${constant("MAX_CONCURRENT_DELIVERIES")} queue=${constant("MAX_QUEUED_SPANS")}`,
      );
      return {
        ...load,
        dropWarnings: warnings.filter((message) => /drop/i.test(message))
          .length,
        recovered,
      };
    } finally {
      rig.receiver.release();
      await rig.close();
    }
  })();

  await proof(
    "A09",
    `${BLACK_HOLE_SPANS} spans against a black-holed Langfuse keep the deliveries in flight at or below MAX_CONCURRENT_DELIVERIES`,
    () =>
      blackHole !== undefined &&
      blackHole.posts > 0 &&
      blackHole.posts <= constant("MAX_CONCURRENT_DELIVERIES"),
  );

  await proof(
    "A09",
    "spans waiting for a delivery slot stop at MAX_QUEUED_SPANS and the oldest beyond it are dropped and counted",
    () =>
      blackHole !== undefined &&
      blackHole.status.pendingSpans === constant("MAX_QUEUED_SPANS") &&
      blackHole.status.failedSpans > 0 &&
      blackHole.status.failedSpans +
        blackHole.status.pendingSpans +
        blackHole.onWire ===
        BLACK_HOLE_SPANS,
  );

  await proof(
    "A09",
    "while spans are dropped the status is unhealthy with an error and the health check counts them",
    () =>
      blackHole !== undefined &&
      !blackHole.status.healthy &&
      (blackHole.status.errors ?? []).length > 0 &&
      (blackHole.health.errors ?? []).some((message) =>
        new RegExp(`${blackHole.status.failedSpans} spans dropped`).test(
          message,
        ),
      ),
  );

  await proof(
    "A09",
    "every exportSpan still reported success and the registry's breaker stayed closed",
    () =>
      blackHole !== undefined &&
      blackHole.refused === 0 &&
      (blackHole.breaker === undefined ||
        (blackHole.breaker.state === "closed" &&
          blackHole.breaker.failures === 0)),
  );

  await proof(
    "A09",
    "the drops are warned about once in the interval, not once per span",
    () => blackHole !== undefined && blackHole.dropWarnings === 1,
  );

  await proof(
    "A09",
    "after Langfuse answers again a new span is delivered",
    () => blackHole !== undefined && blackHole.recovered,
  );

  // ----------------------------------------------------------------- A10
  section("A10 a span that ends during shutdown()");

  await proof(
    "A10",
    "against a healthy Langfuse it is delivered and nothing is left pending",
    () =>
      withRig({}, async (rig) => {
        await rig.registry.exportToAll(spanData({ name: "before-shutdown" }));
        const shutdown = rig.exporter.shutdown();
        await rig.registry.exportToAll(spanData({ name: "during-shutdown" }));
        await shutdown;
        await sleep(100);
        const names = rig.wire().map((span) => span.name);
        const status = rig.exporter.getStatus();
        note(
          "A10",
          `delivered during=${names.includes("during-shutdown")} pending=${status.pendingSpans} failed=${status.failedSpans}`,
        );
        return (
          names.includes("before-shutdown") &&
          names.includes("during-shutdown") &&
          status.pendingSpans === 0 &&
          status.failedSpans === 0
        );
      }),
  );

  await proof(
    "A10",
    "when shutdown runs out of budget it is counted as dropped and nothing is left pending",
    () =>
      withRig(
        {
          exporter: { flushBudgetMs: 300, timeoutMs: 5_000 },
          reply: () => ({ hold: true }),
        },
        async (rig) => {
          await rig.registry.exportToAll(spanData({ name: "before-shutdown" }));
          const shutdown = rig.exporter.shutdown();
          await rig.registry.exportToAll(spanData({ name: "during-shutdown" }));
          await shutdown;
          const status = rig.exporter.getStatus();
          rig.receiver.release();
          note(
            "A10",
            `pending=${status.pendingSpans} failed=${status.failedSpans}`,
          );
          return status.pendingSpans === 0 && status.failedSpans === 2;
        },
      ),
  );

  // ----------------------------------------------------------------- A11
  section("A11 Retry-After");

  async function retryGap(first: Reply): Promise<number> {
    return withRig(
      {
        exporter: { retries: 1 },
        reply: (_request, postIndex) => (postIndex === 0 ? first : {}),
      },
      async (rig) => {
        const result = await rig.exporter.exportBatch([spanData()]);
        const posts = rig.receiver.posts();
        const gap = posts.length === 2 ? posts[1].at - posts[0].at : -1;
        return result.success ? gap : -1;
      },
    );
  }

  await proof(
    "A11",
    "a 429 with Retry-After: 3 waits at least 3 s before the retry",
    async () => {
      const gap = await retryGap({
        status: 429,
        headers: { "retry-after": "3" },
      });
      note("A11", `429 Retry-After 3: retry after ${gap} ms`);
      return gap >= 2_900;
    },
  );

  await proof(
    "A11",
    "a 503 with an HTTP-date Retry-After waits until that date",
    async () => {
      const gap = await retryGap({
        status: 503,
        headers: { "retry-after": new Date(Date.now() + 4_000).toUTCString() },
      });
      note("A11", `503 Retry-After date: retry after ${gap} ms`);
      return gap >= 2_500;
    },
  );

  await proof(
    "A11",
    "a Retry-After of an hour is capped at 60 s and a flush still returns within its budget",
    async () => {
      const { result: elapsed, warnings } = await capturingWarnings(() =>
        withRig(
          {
            exporter: { retries: 1, flushBudgetMs: 500 },
            reply: () => ({ status: 429, headers: { "retry-after": "3600" } }),
          },
          async (rig) => {
            await rig.registry.exportToAll(spanData());
            const started = Date.now();
            await rig.exporter.flush();
            return Date.now() - started;
          },
        ),
      );
      const waits = warnings
        .map((message) => /retrying in (\d+)ms/.exec(message)?.[1])
        .filter((wait): wait is string => wait !== undefined);
      note("A11", `logged waits=${waits.join(",")} flush took ${elapsed} ms`);
      return waits.length === 1 && waits[0] === "60000" && elapsed < 2_000;
    },
  );

  await proof(
    "A11",
    "control: a 500 without Retry-After keeps the 1 s backoff",
    async () => {
      const gap = await retryGap({ status: 500 });
      return gap >= 900 && gap < 2_500;
    },
  );

  // ----------------------------------------------------------------- A12
  section("A12 health after Langfuse took none of a batch");

  const namesDrop = (messages: string[] | undefined, count: number) =>
    (messages ?? []).some(
      (message) =>
        new RegExp(`\\b${count}\\b`).test(message) &&
        /drop|reject/i.test(message),
    );

  await proof(
    "A12",
    "a partialSuccess rejecting all 9 spans: getStatus and healthCheck are unhealthy with an error naming the 9 dropped",
    () =>
      withRig({ reply: () => partial(9) }, async (rig) => {
        const spans = Array.from({ length: 9 }, () => spanData());
        await rig.exporter.exportBatch(spans);
        const status = rig.exporter.getStatus();
        const health = await rig.exporter.healthCheck();
        note(
          "A12",
          `status healthy=${status.healthy} errors=${(status.errors ?? []).length} health healthy=${health.healthy} delivered=${status.deliveredSpans} failed=${status.failedSpans}`,
        );
        return (
          status.deliveredSpans === 0 &&
          status.failedSpans === 9 &&
          !status.healthy &&
          namesDrop(status.errors, 9) &&
          !health.healthy &&
          namesDrop(health.errors, 9)
        );
      }),
  );

  await proof(
    "A12",
    "a 400 for the whole batch: getStatus and healthCheck are unhealthy with an error naming the dropped count",
    () =>
      withRig(
        {
          reply: (request) =>
            request.method === "POST" ? { status: 400 } : {},
        },
        async (rig) => {
          await rig.exporter.exportBatch([spanData(), spanData(), spanData()]);
          const status = rig.exporter.getStatus();
          const health = await rig.exporter.healthCheck();
          return (
            !status.healthy &&
            namesDrop(status.errors, 3) &&
            !health.healthy &&
            namesDrop(health.errors, 3)
          );
        },
      ),
  );

  await proof(
    "A12",
    "after a batch Langfuse accepts, getStatus and healthCheck are healthy again",
    async () => {
      let mode: "reject" | "accept" = "reject";
      return withRig(
        { reply: () => (mode === "reject" ? partial(2) : {}) },
        async (rig) => {
          await rig.exporter.exportBatch([spanData(), spanData()]);
          const rejected = rig.exporter.getStatus().healthy;
          mode = "accept";
          await rig.exporter.exportBatch([spanData(), spanData()]);
          const status = rig.exporter.getStatus();
          const health = await rig.exporter.healthCheck();
          return (
            !rejected &&
            status.healthy &&
            (status.errors ?? []).length === 0 &&
            health.healthy &&
            namesDrop(health.errors, 2)
          );
        },
      );
    },
  );

  await proof(
    "A12",
    "control: a batch Langfuse accepts in part keeps the exporter healthy",
    () =>
      withRig({ reply: () => partial(1) }, async (rig) => {
        await rig.exporter.exportBatch([spanData(), spanData(), spanData()]);
        return rig.exporter.getStatus().healthy;
      }),
  );

  await proof(
    "A12",
    "control: while every batch is rejected, exportSpan still succeeds and the registry's breaker stays closed",
    () =>
      withRig({ reply: () => partial(1) }, async (rig) => {
        rig.registry.configureCircuitBreaker({
          failureThreshold: 3,
          resetTimeout: 60_000,
        });
        const outcomes: boolean[] = [];
        for (let index = 0; index < 6; index++) {
          const results = await rig.registry.exportToAll(spanData());
          outcomes.push(results.get("langfuse")?.success === true);
          await rig.exporter.flush();
        }
        const breaker = rig.registry.getCircuitBreakerStatus("langfuse");
        return (
          outcomes.every(Boolean) &&
          rig.exporter.getStatus().failedSpans === 6 &&
          (breaker === undefined ||
            (breaker.state === "closed" && breaker.failures === 0))
        );
      }),
  );

  // ----------------------------------------------------------------- V01
  section("V01 the status message is not under the caller's policy");

  for (const [label, policy] of [
    ["redactIO leaves", REDACT_IO],
    ["a mask leaves", MASK],
  ] as const) {
    await proof(
      "V01",
      `${label} a span's status message as recorded, for every exporter and on the Langfuse wire`,
      () =>
        withRig({ policy }, async (rig) => {
          const span = rig.tracer("sdk").startSpan("failing");
          observe(span, "span", {});
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `failed on ${PROMPT}`,
          });
          span.end();
          await rig.flush();
          const recorded = rig.recorder.spans.find(
            (entry) => entry.name === "failing",
          );
          const sent = rig.wire().find((entry) => entry.name === "failing");
          const expected = `failed on ${PROMPT}`;
          return (
            recorded !== undefined &&
            sent !== undefined &&
            recorded.statusMessage === expected &&
            (sent.status?.message || undefined) === expected
          );
        }),
    );
  }

  // ----------------------------------------------------------------- V02
  section("V02 partialSuccess rejections are counted");

  for (const rejectedSpans of [2, "2"]) {
    await proof(
      "V02",
      `rejectedSpans ${JSON.stringify(rejectedSpans)} of 3 is reported, counted and health-checked`,
      () =>
        withRig({ reply: () => partial(rejectedSpans) }, async (rig) => {
          const result = await rig.exporter.exportBatch([
            spanData(),
            spanData(),
            spanData(),
          ]);
          const status = rig.exporter.getStatus();
          const health = await rig.exporter.healthCheck();
          return (
            !result.success &&
            result.failedCount === 2 &&
            result.exportedCount === 1 &&
            status.failedSpans === 2 &&
            status.deliveredSpans === 1 &&
            (health.errors ?? []).some((message) =>
              /2 spans dropped/.test(message),
            )
          );
        }),
    );
  }

  // ----------------------------------------------------------------- BE01
  section("BE01 shutdown() shuts the exporters down by default");

  type ProcessorBuild = (registry: ExporterRegistry) => ExporterSpanProcessor;
  async function afterProviderShutdown(build: ProcessorBuild) {
    const registry = new ExporterRegistry();
    const exporter = new LifecycleExporter();
    await exporter.initialize();
    registry.register(exporter);
    const provider = new NodeTracerProvider({
      spanProcessors: [build(registry)],
    });
    const span = provider.getTracer("sdk").startSpan("be01");
    observe(span, "span", {});
    span.end();
    await provider.shutdown();
    return {
      shutdowns: exporter.shutdowns,
      flushes: exporter.flushes,
      initialized: exporter.isInitialized(),
      exported: exporter.spans.length,
      registry,
      exporter,
    };
  }

  await proof(
    "BE01",
    "new ExporterSpanProcessor(registry): provider.shutdown() shuts the registry's exporters down",
    async () => {
      const after = await afterProviderShutdown(
        (registry) => new ExporterSpanProcessor(registry),
      );
      return (
        after.exported === 1 && after.shutdowns === 1 && !after.initialized
      );
    },
  );

  await proof(
    "BE01",
    "createExporterSpanProcessor(registry): provider.shutdown() shuts the registry's exporters down",
    async () => {
      const after = await afterProviderShutdown((registry) =>
        createExporterSpanProcessor(registry),
      );
      return (
        after.exported === 1 && after.shutdowns === 1 && !after.initialized
      );
    },
  );

  await proof(
    "BE01",
    "the opt-out createExporterSpanProcessor(registry, { shutdownExporters: false }) only flushes, and a rebuilt provider keeps exporting",
    async () => {
      const after = await afterProviderShutdown((registry) =>
        createExporterSpanProcessor(registry, { shutdownExporters: false }),
      );
      const rebuilt = new NodeTracerProvider({
        spanProcessors: [createExporterSpanProcessor(after.registry)],
      });
      const span = rebuilt.getTracer("sdk").startSpan("be01-rebuilt");
      observe(span, "span", {});
      span.end();
      await rebuilt.forceFlush();
      return (
        after.shutdowns === 0 &&
        after.flushes >= 1 &&
        after.initialized &&
        after.exporter.spans.some((entry) => entry.name === "be01-rebuilt")
      );
    },
  );

  await proof(
    "BE01",
    "the constructor opt-out new ExporterSpanProcessor(registry, false) only flushes",
    async () => {
      const after = await afterProviderShutdown(
        (registry) => new ExporterSpanProcessor(registry, false),
      );
      return after.shutdowns === 0 && after.flushes >= 1 && after.initialized;
    },
  );

  await proof(
    "BE01",
    "a host process whose exporter holds a flush interval exits by itself after provider.shutdown()",
    async () => {
      const child = await runChild(HOST_EXIT_CHILD, {}, 7_000);
      if (child.exitCode !== 0) {
        note("BE01", `exit ${child.exitCode} after ${child.elapsedMs} ms`);
      }
      return (
        child.exitCode === 0 &&
        child.stdout.includes("SHUTDOWN_RESOLVED") &&
        child.elapsedMs < 6_500
      );
    },
  );

  // ----------------------------------------------------------------- BE02
  section("BE02 a plain generate() exports what it exported before");

  await proof(
    "BE02",
    "generate() sends Langfuse the same four spans with the same parents as before the follow-up",
    async () => {
      const turn = await plainGenerate();
      const tree = treeOf(turn.wire);
      note("BE02", `Langfuse got ${turn.wire.length}: ${tree.join("; ")}`);
      return (
        !turn.thrown &&
        tree.length === PLAIN_GENERATE_TREE.length &&
        tree.every((entry, index) => entry === PLAIN_GENERATE_TREE[index])
      );
    },
  );

  await proof(
    "BE02",
    "generate() hands a custom registry exporter the same four spans with the same parents",
    async () => {
      const turn = await plainGenerate();
      const tree = treeOf(turn.recorded);
      note(
        "BE02",
        `the registry got ${turn.recorded.length}: ${tree.join("; ")}`,
      );
      return (
        !turn.thrown &&
        tree.length === PLAIN_GENERATE_TREE.length &&
        tree.every((entry, index) => entry === PLAIN_GENERATE_TREE[index])
      );
    },
  );

  const PLAIN_SCOPES = [
    "sdk",
    "provider",
    "generation",
    "decision",
    "stream",
    "http",
    "mcp",
    "memory",
    "redis",
    "factory",
    "context",
    "middleware",
    "file",
    "auth",
    // Scope names a host can reuse for its own spans.
    "rag",
    "workflow",
    "processor",
    "autoresearch",
  ];

  await proof(
    "BE02",
    "a span that is not an observation is exported from no tracer scope, whatever the scope is called",
    () =>
      withRig({}, async (rig) => {
        for (const scope of PLAIN_SCOPES) {
          rig.tracer(scope).startSpan(`plain.${scope}`).end();
        }
        await rig.flush();
        const leaked = [
          ...rig.recorder.spans.map((span) => span.name),
          ...rig.wire().map((span) => span.name),
        ];
        if (leaked.length > 0) {
          note("BE02", `exported: ${[...new Set(leaked)].join(", ")}`);
        }
        return leaked.length === 0;
      }),
  );

  await proof(
    "BE02",
    "control: an observation is exported from every one of those scopes",
    () =>
      withRig({}, async (rig) => {
        for (const scope of PLAIN_SCOPES) {
          const span = rig.tracer(scope).startSpan(`marked.${scope}`);
          observe(span, "span", {});
          span.end();
        }
        await rig.flush();
        const sent = new Set(rig.wire().map((span) => span.name));
        const recorded = new Set(rig.recorder.spans.map((span) => span.name));
        return PLAIN_SCOPES.every(
          (scope) =>
            sent.has(`marked.${scope}`) && recorded.has(`marked.${scope}`),
        );
      }),
  );

  await proof(
    "BE02",
    "an observation keeps the parent it had when the span between them is not exported",
    () =>
      withRig({}, async (rig) => {
        const root = rig.tracer("sdk").startSpan("neurolink.generate");
        observe(root, "agent", { input: "hi" });
        const fetch = rig
          .tracer("http")
          .startSpan("http.fetch", { kind: SpanKind.CLIENT }, childOf(root));
        const generation = rig
          .tracer("provider")
          .startSpan(
            "provider.generate",
            { kind: SpanKind.CLIENT },
            childOf(fetch),
          );
        observe(generation, "generation", { model: "gpt-4o", input: "in" });
        generation.end();
        fetch.end();
        root.end();
        await rig.flush();
        const sent = rig.wire();
        const recorded = rig.recorder.spans;
        return (
          !sent.some((span) => span.name === "http.fetch") &&
          !recorded.some((span) => span.name === "http.fetch") &&
          sent.find((span) => span.name === "provider.generate")
            ?.parentSpanId === root.spanContext().spanId &&
          recorded.find((span) => span.name === "provider.generate")
            ?.parentSpanId === root.spanContext().spanId
        );
      }),
  );

  const NO_OPTIONS = { runCommand: "true", mutablePaths: ["x"] };
  const FEATURES: [string, string, () => Promise<unknown>][] = [
    [
      "rag",
      "neurolink.rag.chunk",
      () => new CharacterChunker().chunk("alpha beta gamma delta"),
    ],
    [
      "processors",
      "neurolink.processor.processFile",
      async () =>
        (await getProcessorRegistry()).processFile({
          name: "be.unknown",
          mimetype: "application/x-be-none",
        } as never),
    ],
    [
      "workflow",
      "neurolink.workflow.response.condition",
      () =>
        conditionResponse({
          content: "answer",
          selectedResponse: { provider: "openai", model: "m" } as never,
          allResponses: [],
        }),
    ],
    [
      "evaluation",
      "neurolink.evaluation.ragas",
      () => new RAGASEvaluator("be-model", "openai", 7).evaluate({} as never),
    ],
    [
      "autoresearch",
      "autoresearch.initialize",
      () =>
        new ResearchWorker({
          ...NO_OPTIONS,
          repoPath: join(tempDir("neurolink-adv-exporter-ar-"), "missing"),
          metric: { name: "m", direction: "minimize", pattern: "m" } as never,
        }).initialize("be"),
    ],
  ];

  for (const [feature, spanName, drive] of FEATURES) {
    await proof(
      "BE02",
      `${feature}: the feature's span reaches Langfuse as an observation`,
      async () => {
        host.reset();
        await drive().catch(() => undefined);
        await hostProvider.forceFlush();
        const sent = wireSpans(host).find((span) => span.name === spanName);
        return (
          sent !== undefined &&
          attrOf(sent.attributes, "langfuse.observation.type") === "span"
        );
      },
    );
  }

  // ----------------------------------------------------------------- BE03
  section("BE03 no synthesized deployment.environment");

  const DEFAULT_STARTUP = (): Promise<StartupWire> => startupRun("default", {});
  const NAMED_STARTUP = (): Promise<StartupWire> =>
    startupRun("named", {
      OTEL_SERVICE_NAME: "my-svc",
      LANGFUSE_TRACING_ENVIRONMENT: "prod",
      LANGFUSE_RELEASE: "r1",
    });

  await proof(
    "BE03",
    "with no environment configured the Langfuse resource has service.name and service.version and no deployment.environment",
    async () => {
      const run = await DEFAULT_STARTUP();
      const resource = run.resources[0] ?? {};
      note("BE03", `resource ${JSON.stringify(resource)}`);
      return (
        run.exitCode === 0 &&
        run.resources.length > 0 &&
        resource["service.name"] === "neurolink" &&
        (resource["service.version"] ?? "") !== "" &&
        !("deployment.environment" in resource)
      );
    },
  );

  await proof(
    "BE03",
    "a configured environment and service name still reach the Langfuse resource",
    async () => {
      const run = await NAMED_STARTUP();
      const resource = run.resources[0] ?? {};
      return (
        run.exitCode === 0 &&
        resource["service.name"] === "my-svc" &&
        resource["deployment.environment"] === "prod"
      );
    },
  );

  // ----------------------------------------------------------------- BE04
  section("BE04 scope sdk and span kind 1 on the Langfuse request");

  await proof(
    "BE04",
    "the Langfuse request names the scope sdk for every span",
    async () => {
      const run = await DEFAULT_STARTUP();
      note("BE04", `scopes ${JSON.stringify(run.scopes)}`);
      return (
        run.exitCode === 0 &&
        run.names.includes("provider.generate") &&
        run.scopes.length > 0 &&
        run.scopes.every((scope) => scope === "sdk")
      );
    },
  );

  await proof(
    "BE04",
    "the Langfuse request sends span kind 1 for a CLIENT span",
    async () => {
      const run = await DEFAULT_STARTUP();
      note("BE04", `kinds ${JSON.stringify(run.kinds)}`);
      return (
        run.exitCode === 0 &&
        run.kinds.length >= 2 &&
        run.kinds.every((kind) => kind === 1)
      );
    },
  );

  await proof(
    "BE04",
    "a registry exporter keeps the real scope and kind of the same span",
    () =>
      withRig({}, async (rig) => {
        const span = rig
          .tracer("provider")
          .startSpan("provider.generate", { kind: SpanKind.CLIENT });
        observe(span, "generation", { model: "gpt-4o" });
        span.end();
        await rig.flush();
        const recorded = rig.recorder.spans.find(
          (entry) => entry.name === "provider.generate",
        );
        const bodies = rig.receiver
          .posts()
          .map((request) => JSON.parse(request.text) as StartupBody);
        const wire = bodies.flatMap((body) =>
          body.resourceSpans.flatMap((entry) =>
            entry.scopeSpans.flatMap((scoped) =>
              scoped.spans.map((sent) => ({
                scope: scoped.scope.name,
                kind: sent.kind,
              })),
            ),
          ),
        );
        return (
          recorded?.scope?.name === "provider" &&
          recorded.kind === SpanKind.CLIENT &&
          wire.length === 1 &&
          wire[0].scope === "sdk" &&
          wire[0].kind === 1
        );
      }),
  );

  // ----------------------------------------------------------------- BE05
  section("BE05 a plain-JS exporter with the previous method set");

  await proof(
    "BE05",
    "getTelemetryStatus() resolves with an entry for an exporter that has no getStatus()",
    () => {
      const registry = getExporterRegistry();
      registry.register(duckExporter("be05-duck", true, 0) as never);
      try {
        const status = new NeuroLink().getTelemetryStatus();
        const entry = status.exporters?.find(
          (exporter) => exporter.name === "be05-duck",
        );
        return (
          entry !== undefined &&
          entry.enabled &&
          entry.healthy &&
          entry.pendingSpans === 0 &&
          entry.deliveredSpans === 0 &&
          entry.failedSpans === 0
        );
      } finally {
        registry.unregister("be05-duck");
      }
    },
  );

  await proof(
    "BE05",
    "getStatuses() builds the entry from getName, isInitialized and getPendingCount",
    () => {
      const registry = new ExporterRegistry();
      registry.register(duckExporter("stopped-duck", false, 3) as never);
      const [entry] = registry.getStatuses();
      return (
        entry?.name === "stopped-duck" &&
        entry.enabled === false &&
        entry.healthy === false &&
        entry.pendingSpans === 3
      );
    },
  );

  await proof(
    "BE05",
    "a BaseExporter subclass with its own getStatus() is reported from the base accessors, not from that method",
    async () => {
      class OwnStatus extends RecordingExporter {
        constructor() {
          super("own-status");
        }

        getStatus(): string {
          return "mine";
        }
      }
      const registry = new ExporterRegistry();
      const exporter = new OwnStatus();
      await exporter.initialize();
      registry.register(exporter);
      const [entry] = registry.getStatuses();
      return typeof entry === "object" && entry?.name === "own-status";
    },
  );

  // ----------------------------------------------------------------- BE06
  section("BE06 source written before the follow-up still compiles");

  async function diagnosticsIn(file: string): Promise<string[]> {
    return (await compileConsumers())
      .filter((entry) => entry.file === file)
      .map((entry) => `${entry.code} ${entry.message}`);
  }

  await proof(
    "BE06",
    "control: tsc ran against the tree and reported the one error planted in a control file",
    async () => {
      const control = await diagnosticsIn("control.ts");
      const unresolved = (await compileConsumers()).filter(
        (entry) => entry.code === "TS2307",
      );
      return (
        control.length === 1 &&
        control[0].startsWith("TS2322") &&
        unresolved.length === 0
      );
    },
  );

  for (const [file, what] of [
    ["own-get-status.ts", "its own getStatus(): string"],
    ["own-counters.ts", "private deliveredSpans, failedSpans and lastFailure"],
    ["own-retry-members.ts", "its own retryDelayMs and deliveryCounts"],
    ["previous-members.ts", "only members the previous release had"],
    ["hand-built-otlp-span.ts", "an OtlpSpan literal without links"],
  ] as const) {
    await proof(
      "BE06",
      `a user class or literal with ${what} compiles against this tree's types`,
      async () => {
        const errors = await diagnosticsIn(file);
        if (errors.length > 0) {
          note("BE06", `${file}: ${errors.join(" | ")}`);
        }
        return errors.length === 0;
      },
    );
  }

  await hostProvider.shutdown().catch(() => undefined);
  await host.close();
});
