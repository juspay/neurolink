#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, adversarial provider follow-up
 *
 * Proof for the defects an adversarial verifier reproduced in provider spans,
 * token usage and the never-throw guarantee of the PR #2002 follow-up
 * (BZ-6924): P01-P07, plus V03 and V04, which make two guards that no check
 * reached observable. Every check prints exactly one
 * `PROOF <id> PASS|FAIL <description>` line and the suite exits non-zero if
 * any check fails.
 *
 * Determinism exception (CLAUDE.md rule 15). This suite imports from `src/`,
 * never from `dist/`, and is listed in the `neurolink/e2e-tests-only` allow
 * list. What determinism buys, per finding:
 *   P01  tool calls whose arguments carry a marker, from local Gemini, OpenAI
 *        and Anthropic stand-ins, through direct providers and NeuroLink, plus
 *        the raw content-part shapes a provider hands the recorder.
 *   P02  a NeuroLink turn started from inside a direct tool loop's tool.
 *   P03  finish reasons in shapes no provider sends on demand: an ai@6
 *        `{ unified, raw }` object and a number.
 *   P04  thrown values a live call never produces: an Error whose name or
 *        message is not a string or throws, a null-prototype object, a value
 *        whose toString throws and a Proxy.
 *   P05  Gemini usage metadata that reports more cached tokens than prompt
 *        tokens, whose usage and cost are computed by hand.
 *   P06  a stream result dropped without being read, then a forced garbage
 *        collection, which no caller can schedule around a live call.
 *   P07  a `return()` that races a pending `next()` which rejects later.
 *   V03  a span whose `isRecording()` starts throwing while the SageMaker
 *        stream pump runs.
 *   V04  a generation record whose getter throws.
 * No keys and no network beyond loopback servers are used.
 *
 * Backward-compatibility pass (BZ-6924 follow-up): BT05, BT07, BT08, BT10,
 * BT11, BT12, BT13 and BT17 pin what a caller or deployment already running
 * the released code sees, named after the audit's findings. What determinism
 * buys for them:
 *   BT05  a direct provider turn under a host span, which only a test can open
 *   BT07  a native Vertex turn against a local Gemini stand-in, read at the
 *         wrapper spans a default exporter never shows
 *   BT08  an upstream error of 45,000 characters that echoes a key, longer
 *         than any real one
 *   BT10  `{ name, value }` entries are recorded as released: the name does not
 *         make the value a credential; text patterns inside it are still masked
 *   BT11  fixed long strings, checked against the released rule written out
 *         here as the oracle
 *   BT12  Gemini usage metadata with more cached tokens than prompt tokens
 *   BT13  a SageMaker body that fails mid-stream with an abort-class error
 *         whose message echoes a key
 *   BT17  a consumer `throw()` into a NeuroLink stream
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-adv-providers.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import {
  diag,
  DiagLogLevel,
  SpanStatusCode,
  trace,
  type Span,
} from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

process.env.NEUROLINK_SKIP_MCP = "true";
// A shell that sets the opt-in must not change what the released-behaviour checks see.
delete process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES;

// A span left open is invisible to an exporter, so open spans are counted at
// the processor: started and not yet ended.
const openSpans = new Map<string, string>();
// V03 turns one SageMaker generation span hostile after the stream is under
// way; the processor hands that span over when it starts.
const spanWatch: { name?: string; caught?: Span } = {};
const openSpanTracker: SpanProcessor = {
  onStart: (span) => {
    openSpans.set(span.spanContext().spanId, span.name);
    if (spanWatch.name !== undefined && span.name === spanWatch.name) {
      spanWatch.caught = span;
      spanWatch.name = undefined;
    }
  },
  onEnd: (span) => {
    openSpans.delete(span.spanContext().spanId);
  },
  forceFlush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
};

const spanExporter = new InMemorySpanExporter();
const hostProvider = new NodeTracerProvider({
  spanProcessors: [openSpanTracker, new SimpleSpanProcessor(spanExporter)],
});
hostProvider.register();

const endedSpanWarnings: string[] = [];
const noteDiag = (message: string): void => {
  if (/ended span/i.test(message)) {
    endedSpanWarnings.push(message);
  }
};
diag.setLogger(
  {
    error: noteDiag,
    warn: noteDiag,
    info: () => {},
    debug: () => {},
    verbose: () => {},
  },
  DiagLogLevel.WARN,
);

const unhandled: string[] = [];
process.on("unhandledRejection", (reason) => {
  unhandled.push(reason instanceof Error ? reason.message : String(reason));
});

setFlagsFromString("--expose-gc");
const collectGarbage = runInNewContext("gc") as () => void;

const { NeuroLink } = await import("../src/lib/neurolink.js");
const { AIProviderFactory } = await import("../src/lib/core/factory.js");
const { AmazonSageMakerProvider } =
  await import("../src/lib/providers/amazonSagemaker.js");
const { createGeminiLoopAdapter } =
  await import("../src/lib/core/geminiLoopAdapter.js");
const { runAgenticLoop } = await import("../src/lib/core/loopEngine.js");
const { observeGeneration, observationLevel } =
  await import("../src/lib/telemetry/observation.js");
const { withSpan, withGeneration, withStreamSpan } =
  await import("../src/lib/telemetry/withSpan.js");
const { tracers } = await import("../src/lib/telemetry/tracers.js");
const { calculateCost } = await import("../src/lib/utils/pricing.js");
const { jsonSchema } = await import("../src/lib/utils/tool.js");
const { spanContentAttribute, withoutSpanContent } =
  await import("../src/lib/telemetry/attributes.js");
const { binaryPlaceholder } =
  await import("../src/lib/telemetry/spanSanitizer.js");

const { test, section, runSuite } = defineSuite(
  "Observability adversarial provider follow-up",
  { offline: true, perTestTimeoutMs: 60_000 },
);

function check(
  id: string,
  description: string,
  run: () => Promise<void> | void,
): Promise<void> {
  return test(`${id} ${description}`, async () => {
    try {
      await run();
    } catch (error) {
      console.log(`PROOF ${id} FAIL ${description}`);
      throw error;
    }
    console.log(`PROOF ${id} PASS ${description}`);
  });
}

// ---------------------------------------------------------------------------
// Span helpers
// ---------------------------------------------------------------------------

function pause(ms: number): Promise<void> {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function startedAtMs(span: ReadableSpan): number {
  return span.startTime[0] * 1_000 + span.startTime[1] / 1_000_000;
}

// Spans of an earlier check can end late, so a check starts from a quiet
// exporter and reads only the spans that started after it began.
async function fresh(): Promise<number> {
  await pause(150);
  await hostProvider.forceFlush();
  spanExporter.reset();
  endedSpanWarnings.length = 0;
  unhandled.length = 0;
  return Date.now();
}

async function finishedSince(startedAt: number): Promise<ReadableSpan[]> {
  await pause(100);
  await hostProvider.forceFlush();
  return spanExporter
    .getFinishedSpans()
    .filter((span) => startedAtMs(span) >= startedAt);
}

function observationType(span: ReadableSpan): string | undefined {
  const type = span.attributes["langfuse.observation.type"];
  return typeof type === "string" ? type : undefined;
}

function generations(spans: ReadableSpan[]): ReadableSpan[] {
  return spans.filter((span) => observationType(span) === "generation");
}

function text(span: ReadableSpan | undefined, key: string): string {
  const value = span?.attributes[key];
  return value === undefined ? "" : String(value);
}

function usageDetails(span: ReadableSpan): Record<string, number> {
  const raw = text(span, "langfuse.observation.usage_details");
  assert(raw !== "", `${span.name} has no usage_details`);
  return JSON.parse(raw) as Record<string, number>;
}

function costTotal(span: ReadableSpan): number {
  const raw = text(span, "langfuse.observation.cost_details");
  assert(raw !== "", `${span.name} has no cost_details`);
  return (JSON.parse(raw) as { total: number }).total;
}

function near(actual: number, expected: number, message: string): void {
  assert(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function withMissingParent(spans: ReadableSpan[]): ReadableSpan[] {
  const ids = new Set(spans.map((span) => span.spanContext().spanId));
  return spans.filter(
    (span) =>
      span.parentSpanContext !== undefined &&
      !ids.has(span.parentSpanContext.spanId),
  );
}

async function drain<T>(stream: AsyncIterable<T>): Promise<void> {
  for await (const chunk of stream) {
    void chunk;
  }
}

// ---------------------------------------------------------------------------
// Fake upstreams
// ---------------------------------------------------------------------------

type JsonBody = Record<string, unknown>;
type FakeUpstream = { baseURL: string; close: () => Promise<void> };

function readBody(req: IncomingMessage): Promise<JsonBody> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolveBody({});
      }
    });
  });
}

function listen(server: Server): Promise<number> {
  return new Promise((resolvePort) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePort(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function closeServer(server: Server, held: Set<ServerResponse>): Promise<void> {
  return new Promise((resolveClose) => {
    for (const response of held) {
      response.destroy();
    }
    server.close(() => resolveClose());
  });
}

type GeminiOptions = {
  usage?: Record<string, number>;
  toolArgs?: Record<string, unknown>;
};

// Asks for the `lookup` tool when the request declares it and carries no
// function response yet, otherwise answers in text.
async function startGemini(options: GeminiOptions = {}): Promise<FakeUpstream> {
  const usage = options.usage ?? {
    promptTokenCount: 100,
    candidatesTokenCount: 10,
    totalTokenCount: 110,
  };
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const declaresTools =
      Array.isArray(body.tools) &&
      JSON.stringify(body.tools).includes("lookup");
    const answered = JSON.stringify(body.contents ?? []).includes(
      "functionResponse",
    );
    const parts =
      declaresTools && !answered
        ? [
            {
              functionCall: {
                name: "lookup",
                args: options.toolArgs ?? { q: "needle" },
              },
            },
          ]
        : [{ text: "hello from gemini" }];
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(
      `data: ${JSON.stringify({
        candidates: [
          { content: { role: "model", parts }, finishReason: "STOP", index: 0 },
        ],
        usageMetadata: usage,
      })}\r\n\r\n`,
    );
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}`,
    close: () => closeServer(server, new Set()),
  };
}

function chatFrame(delta: object, finish: string | null): string {
  return `data: ${JSON.stringify({
    id: "chatcmpl-proof",
    object: "chat.completion.chunk",
    created: 1,
    model: "proof",
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

// Asks for the `lookup` tool when the request declares tools and carries no
// tool result yet, otherwise answers in text. SSE for a streaming request.
async function startOpenAI(toolArgs?: string): Promise<FakeUpstream> {
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const asking =
      Array.isArray(body.tools) &&
      body.tools.length > 0 &&
      !JSON.stringify(body.messages ?? []).includes('"role":"tool"');
    const toolCalls = [
      {
        index: 0,
        id: "call_1",
        type: "function",
        function: { name: "lookup", arguments: toolArgs ?? '{"q":"needle"}' },
      },
    ];
    if (body.stream === true) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        chatFrame(
          asking
            ? { role: "assistant", tool_calls: toolCalls }
            : { role: "assistant", content: "done" },
          null,
        ),
      );
      res.write(chatFrame({}, asking ? "tool_calls" : "stop"));
      res.end("data: [DONE]\n\n");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-proof",
        object: "chat.completion",
        created: 1,
        model: "proof",
        choices: [
          {
            index: 0,
            message: asking
              ? { role: "assistant", content: null, tool_calls: toolCalls }
              : { role: "assistant", content: "done" },
            finish_reason: asking ? "tool_calls" : "stop",
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      }),
    );
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => closeServer(server, new Set()),
  };
}

function anthropicEvent(name: string, data: object): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

function anthropicMessage(content: object[], stopReason: string | null) {
  return {
    id: "msg_proof",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5",
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 3 },
  };
}

async function startAnthropic(
  toolInput: Record<string, unknown>,
): Promise<FakeUpstream> {
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const answering = JSON.stringify(body.messages ?? []).includes(
      "tool_result",
    );
    const toolUse = {
      type: "tool_use",
      id: "toolu_proof",
      name: "lookup",
      input: toolInput,
    };
    const block = answering ? { type: "text", text: "done" } : toolUse;
    const stopReason = answering ? "end_turn" : "tool_use";
    if (body.stream !== true) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropicMessage([block], stopReason)));
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(
      anthropicEvent("message_start", {
        type: "message_start",
        message: anthropicMessage([], null),
      }),
    );
    res.write(
      anthropicEvent("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: answering
          ? { type: "text", text: "" }
          : { type: "tool_use", id: toolUse.id, name: toolUse.name, input: {} },
      }),
    );
    res.write(
      anthropicEvent("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: answering
          ? { type: "text_delta", text: "done" }
          : {
              type: "input_json_delta",
              partial_json: JSON.stringify(toolInput),
            },
      }),
    );
    res.write(
      anthropicEvent("content_block_stop", {
        type: "content_block_stop",
        index: 0,
      }),
    );
    res.write(
      anthropicEvent("message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: 3 },
      }),
    );
    res.end(anthropicEvent("message_stop", { type: "message_stop" }));
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}`,
    close: () => closeServer(server, new Set()),
  };
}

function lookupTools(onRun?: () => Promise<unknown>) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: { q: { type: "string" } },
        additionalProperties: true,
      }),
      execute: async () => ({ found: true, extra: await onRun?.() }),
    },
  };
}

// ---------------------------------------------------------------------------
// P01: NEUROLINK_RECORD_INPUTS=false keeps tool-call arguments out of traces
// ---------------------------------------------------------------------------

section("P01 tool-call arguments with inputs not recorded");

const ARG_MARKER = "ARGMARKER7731";
const gemini = await startGemini({ toolArgs: { q: ARG_MARKER } });
const openai = await startOpenAI(JSON.stringify({ q: ARG_MARKER }));
const anthropic = await startAnthropic({ q: ARG_MARKER });

type ToolTarget = {
  name: string;
  model: string;
  credentials: Record<string, unknown>;
};
const toolTargets: ToolTarget[] = [
  {
    name: "google-ai",
    model: "gemini-2.5-flash",
    credentials: {
      googleAiStudio: { apiKey: "proof-key", baseURL: gemini.baseURL },
    },
  },
  {
    name: "openai",
    model: "gpt-4o-mini",
    credentials: { openai: { apiKey: "proof-key", baseURL: openai.baseURL } },
  },
  {
    name: "anthropic",
    model: "claude-sonnet-4-5",
    credentials: {
      anthropic: { apiKey: "proof-key", baseURL: anthropic.baseURL },
    },
  },
];

function markerHits(spans: ReadableSpan[], marker: string): string[] {
  const hits: string[] = [];
  for (const span of spans) {
    for (const [key, value] of Object.entries(span.attributes)) {
      if (String(value).includes(marker)) {
        hits.push(`${span.name}/${observationType(span) ?? "-"} ${key}`);
      }
    }
    for (const event of span.events) {
      if (JSON.stringify(event.attributes ?? {}).includes(marker)) {
        hits.push(`${span.name} event ${event.name}`);
      }
    }
    if ((span.status.message ?? "").includes(marker)) {
      hits.push(`${span.name} status`);
    }
  }
  return hits;
}

async function toolTurn(
  target: ToolTarget,
  via: "direct" | "neurolink",
  mode: "generate" | "stream",
): Promise<ReadableSpan[]> {
  const startedAt = await fresh();
  const request = {
    input: { text: "please look it up" },
    tools: lookupTools(),
    maxSteps: 3,
  };
  if (via === "direct") {
    const provider = await AIProviderFactory.createProvider(
      target.name,
      target.model,
      false,
      undefined,
      undefined,
      target.credentials as never,
    );
    if (mode === "generate") {
      await provider.generate(request as never);
    } else {
      await drain((await provider.stream(request as never)).stream);
    }
  } else {
    const neurolink = new NeuroLink();
    const options = {
      ...request,
      provider: target.name,
      model: target.model,
      credentials: target.credentials,
      disableInternalFallback: true,
    };
    if (mode === "generate") {
      await neurolink.generate(options as never);
    } else {
      await drain((await neurolink.stream(options as never)).stream);
    }
  }
  return finishedSince(startedAt);
}

function assertArgumentsLeftOut(spans: ReadableSpan[]): void {
  assert(
    spans.some((span) => observationType(span) === "tool"),
    "the tool never ran, so the turn proves nothing",
  );
  const asked = generations(spans).filter((span) =>
    text(span, "langfuse.observation.output").includes("lookup"),
  );
  assert(
    asked.length > 0,
    "no generation output names the tool call the model made",
  );
  const hits = markerHits(spans, ARG_MARKER);
  assert(
    hits.length === 0,
    `tool-call arguments reached ${hits.length} span field(s): ${hits.join(", ")}`,
  );
}

process.env.NEUROLINK_RECORD_INPUTS = "false";
for (const target of toolTargets) {
  for (const via of ["direct", "neurolink"] as const) {
    for (const mode of ["generate", "stream"] as const) {
      await check(
        "P01",
        `${via} ${target.name} ${mode}: with inputs off, no span carries the model's tool-call arguments, and the call keeps its tool name`,
        async () => assertArgumentsLeftOut(await toolTurn(target, via, mode)),
      );
    }
  }
}

const ARGUMENT_SHAPES: Array<[string, unknown]> = [
  [
    "Anthropic tool_use content blocks",
    [
      { type: "text", text: "let me look" },
      {
        type: "tool_use",
        id: "toolu_1",
        name: "lookup",
        input: { q: ARG_MARKER },
      },
    ],
  ],
  [
    "Gemini functionCall parts",
    [{ functionCall: { name: "lookup", args: { q: ARG_MARKER } } }],
  ],
  [
    "AI SDK tool-call parts",
    [
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "lookup",
        input: { q: ARG_MARKER },
      },
    ],
  ],
  [
    "OpenAI chat messages with tool_calls",
    [
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "lookup",
              arguments: JSON.stringify({ q: ARG_MARKER }),
            },
          },
        ],
      },
    ],
  ],
];

for (const [label, output] of ARGUMENT_SHAPES) {
  await check(
    "P01",
    `a generation output of ${label} keeps the tool name but not its arguments when inputs are off`,
    async () => {
      const startedAt = await fresh();
      const span = tracers.generation.startSpan("p01-shape");
      observeGeneration(span, {
        provider: "openai",
        model: "gpt-4o-mini",
        output: output as never,
      });
      span.end();
      const [recorded] = (await finishedSince(startedAt)).filter(
        (s) => s.name === "p01-shape",
      );
      assert(recorded !== undefined, "the generation span was not exported");
      assert(
        text(recorded, "langfuse.observation.output").includes("lookup"),
        "the output lost the tool name",
      );
      const hits = markerHits([recorded], ARG_MARKER);
      assert(
        hits.length === 0,
        `tool-call arguments reached ${hits.join(", ")}`,
      );
    },
  );
}

delete process.env.NEUROLINK_RECORD_INPUTS;
await check(
  "P01",
  "control: with inputs recorded, the same direct OpenAI turn does export the tool-call arguments",
  async () => {
    const [target] = toolTargets.filter((t) => t.name === "openai");
    const spans = await toolTurn(target, "direct", "generate");
    const carrying = generations(spans).filter((span) =>
      text(span, "langfuse.observation.output").includes(ARG_MARKER),
    );
    assert(
      carrying.length > 0,
      "no generation output carries the arguments, so the scan above would see nothing",
    );
  },
);

// ---------------------------------------------------------------------------
// P02: a NeuroLink turn nested under a direct loop leaves the trace IO alone
// ---------------------------------------------------------------------------

section("P02 a NeuroLink turn inside a direct tool loop");

const geminiCredentials = {
  googleAiStudio: { apiKey: "proof-key", baseURL: gemini.baseURL },
};

async function subAgentTurn(): Promise<ReadableSpan[]> {
  const startedAt = await fresh();
  const neurolink = new NeuroLink();
  const provider = await AIProviderFactory.createProvider(
    "google-ai",
    "gemini-2.5-flash",
    false,
    undefined,
    undefined,
    geminiCredentials as never,
  );
  await provider.generate({
    input: { text: "outer prompt" },
    tools: lookupTools(async () => {
      const inner = await neurolink.generate({
        input: { text: "inner sub-agent prompt" },
        provider: "google-ai",
        model: "gemini-2.5-flash",
        credentials: geminiCredentials,
        disableTools: true,
        disableInternalFallback: true,
      } as never);
      return inner.content;
    }),
    maxSteps: 3,
  } as never);
  return finishedSince(startedAt);
}

function innerTurnTree(spans: ReadableSpan[]): {
  innerTurn?: ReadableSpan;
  under: (span: ReadableSpan) => boolean;
} {
  const byId = new Map(spans.map((span) => [span.spanContext().spanId, span]));
  const parentOf = (span: ReadableSpan): ReadableSpan | undefined =>
    span.parentSpanContext
      ? byId.get(span.parentSpanContext.spanId)
      : undefined;
  const innerTurn = spans.find((span) => {
    const parent = parentOf(span);
    return (
      span.name === "generate" &&
      observationType(span) === "agent" &&
      parent !== undefined &&
      observationType(parent) === "tool"
    );
  });
  const under = (span: ReadableSpan): boolean => {
    for (let at: ReadableSpan | undefined = span; at; at = parentOf(at)) {
      if (at === innerTurn) {
        return true;
      }
    }
    return false;
  };
  return { innerTurn, under };
}

function writesTraceIO(span: ReadableSpan): boolean {
  return (
    span.attributes["langfuse.trace.input"] !== undefined ||
    span.attributes["langfuse.trace.output"] !== undefined
  );
}

await check(
  "P02",
  "a NeuroLink turn run by a direct loop's tool: neither the turn nor its generations write the trace's input or output",
  async () => {
    const spans = await subAgentTurn();
    const { innerTurn, under } = innerTurnTree(spans);
    assert(innerTurn !== undefined, "the inner NeuroLink turn was not found");
    const writers = spans.filter((span) => under(span) && writesTraceIO(span));
    assert(
      writers.length === 0,
      `${writers.length} span(s) of the inner turn write trace IO: ${writers.map((s) => `${s.name}/${observationType(s) ?? "-"}`).join(", ")}`,
    );
  },
);

await check(
  "P02",
  "control: the direct loop's own generations still write the trace's input (M03)",
  async () => {
    const spans = await subAgentTurn();
    const { innerTurn, under } = innerTurnTree(spans);
    assert(innerTurn !== undefined, "the inner NeuroLink turn was not found");
    const outer = generations(spans).filter((span) => !under(span));
    assert(outer.length >= 2, `${outer.length} outer generations`);
    assert(
      outer.every((span) =>
        text(span, "langfuse.trace.input").includes("outer prompt"),
      ),
      "an outer generation no longer writes the trace input",
    );
  },
);

// ---------------------------------------------------------------------------
// P03: a non-string finishReason leaves the rest of the record in place
// ---------------------------------------------------------------------------

section("P03 non-string finish reasons");

async function recordWithFinish(
  finishReason: unknown,
): Promise<ReadableSpan | undefined> {
  const startedAt = await fresh();
  const span = tracers.generation.startSpan("p03-generate");
  observeGeneration(span, {
    provider: "openai",
    model: "gpt-4o-mini",
    output: "THE-ANSWER",
    usage: { inputTokens: 1000, outputTokens: 100 },
    finishReason: finishReason as never,
  });
  span.end();
  return (await finishedSince(startedAt)).find(
    (s) => s.name === "p03-generate",
  );
}

function assertWholeRecord(span: ReadableSpan | undefined): void {
  if (span === undefined) {
    throw new Error("the generation span was not exported");
  }
  assertEqual(observationType(span), "generation", "observation type");
  assert(
    text(span, "langfuse.observation.output").includes("THE-ANSWER"),
    "the output was dropped",
  );
  assert(
    text(span, "langfuse.observation.usage_details") !== "",
    "the usage was dropped",
  );
  assertEqual(
    text(span, "langfuse.observation.model.name"),
    "gpt-4o-mini",
    "model",
  );
}

await check(
  "P03",
  "an ai@6 { unified, raw } finishReason keeps the record and records the unified reason",
  async () => {
    const span = await recordWithFinish({ unified: "stop", raw: "STOP" });
    assertWholeRecord(span);
    assertEqual(
      text(span, "langfuse.observation.metadata.finishReason"),
      "stop",
      "metadata.finishReason",
    );
  },
);

await check(
  "P03",
  "a { unified: 'length' } finishReason keeps the record and marks it WARNING",
  async () => {
    const span = await recordWithFinish({ unified: "length", raw: "MAX" });
    assertWholeRecord(span);
    assertEqual(
      text(span, "langfuse.observation.level"),
      "WARNING",
      "observation level",
    );
  },
);

await check(
  "P03",
  "a { raw } finishReason without unified keeps the record and records the raw reason",
  async () => {
    const span = await recordWithFinish({ raw: "end_turn" });
    assertWholeRecord(span);
    assertEqual(
      text(span, "langfuse.observation.metadata.finishReason"),
      "end_turn",
      "metadata.finishReason",
    );
  },
);

await check(
  "P03",
  "a numeric finishReason keeps the record and writes no finishReason metadata",
  async () => {
    const span = await recordWithFinish(7);
    assertWholeRecord(span);
    assertEqual(
      span?.attributes["langfuse.observation.metadata.finishReason"],
      undefined,
      "metadata.finishReason",
    );
  },
);

await check(
  "P03",
  "observationLevel, which the turn calls outside any guard, reads an object finishReason and never throws",
  () => {
    let level: unknown;
    let threw = false;
    try {
      level = observationLevel({ unified: "length", raw: "MAX" } as never);
      observationLevel(7 as never);
      observationLevel({} as never);
    } catch {
      threw = true;
    }
    assert(!threw, "observationLevel threw on a non-string finishReason");
    assertEqual(level, "WARNING", "level for { unified: 'length' }");
  },
);

// ---------------------------------------------------------------------------
// P04: the caller always gets its own error back
// ---------------------------------------------------------------------------

section("P04 hostile thrown values");

const hostileProxy = new Proxy(
  {},
  {
    get() {
      throw new Error("proxy get trap");
    },
    ownKeys() {
      throw new Error("proxy ownKeys trap");
    },
    has() {
      throw new Error("proxy has trap");
    },
    getOwnPropertyDescriptor() {
      throw new Error("proxy gopd trap");
    },
    getPrototypeOf() {
      throw new Error("proxy getPrototypeOf trap");
    },
  },
);

const hostileErrors: Array<[string, () => unknown]> = [
  [
    "an Error whose name is undefined",
    () => {
      const error = new Error("original");
      Object.defineProperty(error, "name", { value: undefined });
      return error;
    },
  ],
  [
    "an Error whose name is a number",
    () => {
      const error = new Error("original");
      Object.defineProperty(error, "name", { value: 42 });
      return error;
    },
  ],
  [
    "an Error whose message getter throws",
    () => {
      const error = new Error("original");
      Object.defineProperty(error, "message", {
        get() {
          throw new Error("message getter");
        },
      });
      return error;
    },
  ],
  [
    "an Error whose message is an object",
    () => {
      const error = new Error("original");
      Object.defineProperty(error, "message", { value: { nested: true } });
      return error;
    },
  ],
  [
    "an object whose toString throws",
    () => ({
      toString() {
        throw new Error("toString");
      },
    }),
  ],
  ["a null-prototype object", () => Object.create(null)],
  ["a symbol", () => Symbol("thrown")],
  ["a Proxy whose every trap throws", () => hostileProxy],
];

const hostTracer = trace.getTracer("p04-host");

type Wrapper = {
  label: string;
  spanName: string;
  // A scrubbed tracer records an Error as its name and message only, so it
  // can always record one; the host SDK reads the Error itself.
  scrubbed: boolean;
  run: (thrown: unknown) => Promise<unknown>;
};

function isErrorValue(value: unknown): boolean {
  try {
    return value instanceof Error;
  } catch {
    return false;
  }
}

const wrappers: Wrapper[] = [
  {
    label: "withSpan (scrubbed tracer)",
    spanName: "p04-span",
    scrubbed: true,
    run: (thrown) =>
      withSpan({ name: "p04-span", tracer: tracers.sdk }, async () => {
        throw thrown;
      }),
  },
  {
    label: "withGeneration",
    spanName: "generate",
    scrubbed: true,
    run: (thrown) =>
      withGeneration({ provider: "openai", model: "m" }, async () => {
        throw thrown;
      }),
  },
  {
    label: "withStreamSpan when fn throws (scrubbed tracer)",
    spanName: "p04-stream-fn",
    scrubbed: true,
    run: (thrown) =>
      withStreamSpan(
        { name: "p04-stream-fn", tracer: tracers.stream },
        async () => {
          throw thrown;
        },
        (result: { s: AsyncIterable<number> }) => result.s,
        (result, wrapped) => ({ ...result, s: wrapped }),
      ),
  },
  {
    label: "withStreamSpan when next() throws (host tracer)",
    spanName: "p04-stream-next",
    scrubbed: false,
    run: async (thrown) => {
      const result = await withStreamSpan(
        { name: "p04-stream-next", tracer: hostTracer },
        async () => ({
          s: (async function* () {
            yield 1;
            throw thrown;
          })() as AsyncIterable<number>,
        }),
        (r) => r.s,
        (r, wrapped) => ({ ...r, s: wrapped }),
      );
      await drain(result.s);
    },
  },
];

for (const [label, make] of hostileErrors) {
  for (const wrapper of wrappers) {
    const recordsException = wrapper.scrubbed && isErrorValue(make());
    await check(
      "P04",
      `${wrapper.label} rethrows the caller's own error and ends the span as ERROR${recordsException ? ", recording the exception" : ""}: ${label}`,
      async () => {
        const startedAt = await fresh();
        const thrown = make();
        let got: unknown = "nothing thrown";
        try {
          await wrapper.run(thrown);
        } catch (error) {
          got = error;
        }
        assert(
          got === thrown,
          "the caller got a different error than the one its work threw",
        );
        const ended = (await finishedSince(startedAt)).filter(
          (span) => span.name === wrapper.spanName,
        );
        assertEqual(ended.length, 1, "spans ended");
        assertEqual(ended[0].status.code, SpanStatusCode.ERROR, "status code");
        if (recordsException) {
          assert(
            ended[0].events.some((event) => event.name === "exception"),
            "the exception was not recorded on the span",
          );
        }
      },
    );
  }
}

// ---------------------------------------------------------------------------
// P05: Gemini cached tokens never exceed the prompt
// ---------------------------------------------------------------------------

section("P05 Gemini usage with cache above prompt");

const P05_PROVIDER = "google-ai";
const P05_MODEL = "gemini-3-flash-preview";
const PER_MILLION = 1_000_000;
const rateOutput =
  calculateCost(P05_PROVIDER, P05_MODEL, {
    input: 0,
    output: PER_MILLION,
    total: 0,
  }) / PER_MILLION;
const rateCacheRead =
  calculateCost(P05_PROVIDER, P05_MODEL, {
    input: 0,
    output: 0,
    total: 0,
    cacheReadTokens: PER_MILLION,
  }) / PER_MILLION;
const rateInput =
  calculateCost(P05_PROVIDER, P05_MODEL, {
    input: PER_MILLION,
    output: 0,
    total: 0,
  }) / PER_MILLION;

const CACHE_ABOVE_PROMPT = {
  promptTokenCount: 10_000,
  cachedContentTokenCount: 12_000,
  candidatesTokenCount: 500,
};

async function geminiLoopStep(usageMetadata: Record<string, number>): Promise<{
  generation: ReadableSpan;
  turnUsage: Record<string, unknown>;
}> {
  const startedAt = await fresh();
  const adapter = createGeminiLoopAdapter({
    providerLabel: "ProofGemini",
    provider: P05_PROVIDER,
    maxSteps: 2,
    buildRequest: (conversation) => ({
      model: P05_MODEL,
      contents: conversation,
      config: {},
    }),
    sendStep: async () =>
      (async function* () {
        yield {
          candidates: [
            {
              content: { role: "model", parts: [{ text: "answer" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata,
        };
      })(),
    liveTools: {},
  });
  const { stream, resultPromise } = runAgenticLoop(
    adapter,
    [{ role: "user", parts: [{ text: "hi" }] }],
    {},
  );
  await drain(stream);
  const result = await resultPromise;
  const steps = generations(await finishedSince(startedAt));
  assertEqual(steps.length, 1, "generations per step");
  return {
    generation: steps[0],
    turnUsage: { ...(result.usage as object) },
  };
}

await check(
  "P05",
  "a Gemini step reporting 12000 cached of a 10000 prompt records input 0, cache_read 10000 and total 10500",
  async () => {
    const { generation } = await geminiLoopStep(CACHE_ABOVE_PROMPT);
    const usage = usageDetails(generation);
    assertEqual(usage.input, 0, "input");
    assertEqual(usage.cache_read_input_tokens, 10_000, "cache_read");
    assertEqual(usage.output, 500, "output");
    assertEqual(usage.total, 10_500, "total");
  },
);

await check(
  "P05",
  "that step costs 500 output plus 10000 cache-read tokens by hand, not 12000",
  async () => {
    const { generation } = await geminiLoopStep(CACHE_ABOVE_PROMPT);
    near(
      costTotal(generation),
      500 * rateOutput + 10_000 * rateCacheRead,
      "step cost",
    );
  },
);

await check(
  "P05",
  "the turn's own usage hands the caller the provider's counts as released (10000 prompt, 12000 cached); only the generation observation is clamped",
  async () => {
    const { turnUsage } = await geminiLoopStep(CACHE_ABOVE_PROMPT);
    assertEqual(turnUsage.inputTokens, 10_000, "turn input tokens");
    assertEqual(turnUsage.cacheReadTokens, 12_000, "turn cached tokens");
  },
);

await check(
  "P05",
  "control: a sane shape (8000 cached of 10000) keeps input 2000, cache_read 8000 and its hand-computed cost",
  async () => {
    const { generation } = await geminiLoopStep({
      promptTokenCount: 10_000,
      cachedContentTokenCount: 8_000,
      candidatesTokenCount: 500,
    });
    const usage = usageDetails(generation);
    assertEqual(usage.input, 2_000, "input");
    assertEqual(usage.cache_read_input_tokens, 8_000, "cache_read");
    assertEqual(usage.total, 10_500, "total");
    near(
      costTotal(generation),
      2_000 * rateInput + 500 * rateOutput + 8_000 * rateCacheRead,
      "step cost",
    );
  },
);

await check(
  "P05",
  "the Google AI Studio provider's turn usage for 12000 cached of a 10000 prompt is as released: total 12500, cacheReadTokens 12000",
  async () => {
    const upstream = await startGemini({
      usage: { ...CACHE_ABOVE_PROMPT, totalTokenCount: 10_500 },
    });
    try {
      const provider = await AIProviderFactory.createProvider(
        "google-ai",
        P05_MODEL,
        false,
        undefined,
        undefined,
        {
          googleAiStudio: { apiKey: "proof-key", baseURL: upstream.baseURL },
        } as never,
      );
      const result = await provider.generate({
        input: { text: "hi" },
        disableTools: true,
      } as never);
      const usage = (result?.usage ?? {}) as Record<string, unknown>;
      assertEqual(usage.total, 12_500, "turn total");
      assertEqual(usage.cacheReadTokens, 12_000, "turn cached tokens");
    } finally {
      await upstream.close();
    }
  },
);

// ---------------------------------------------------------------------------
// P06: a stream result that is dropped unread still ends its spans
// ---------------------------------------------------------------------------

section("P06 stream results that are never read");

const openaiText = await startOpenAI();

function openSince(before: Set<string>): string[] {
  return [...openSpans.entries()]
    .filter(([id]) => !before.has(id))
    .map(([, name]) => name);
}

async function dropUnread(start: () => Promise<void>): Promise<{
  stillOpen: string[];
  spans: ReadableSpan[];
}> {
  const startedAt = await fresh();
  const before = new Set(openSpans.keys());
  await start();
  await pause(300);
  for (let round = 0; round < 40 && openSince(before).length > 0; round++) {
    collectGarbage();
    await pause(25);
  }
  return {
    stillOpen: openSince(before),
    spans: await finishedSince(startedAt),
  };
}

function assertAbandonedEnded(
  run: { stillOpen: string[]; spans: ReadableSpan[] },
  names: string[],
): void {
  assert(
    run.stillOpen.length === 0,
    `spans still open after the result was dropped: ${run.stillOpen.join(", ")}`,
  );
  for (const name of names) {
    const ended = run.spans.filter(
      (span) => span.name === name && observationType(span) !== "generation",
    );
    assertEqual(ended.length, 1, `${name} spans ended`);
    assertEqual(
      text(ended[0], "langfuse.observation.level"),
      "WARNING",
      `${name} level`,
    );
  }
  const orphans = withMissingParent(run.spans);
  assert(
    orphans.length === 0,
    `exported spans whose parent was never exported: ${orphans.map((s) => s.name).join(", ")}`,
  );
}

await check(
  "P06",
  "a direct Google AI Studio provider.stream result dropped unread ends provider.stream at WARNING once collected",
  async () => {
    const run = await dropUnread(async () => {
      const provider = await AIProviderFactory.createProvider(
        "google-ai",
        "gemini-2.5-flash",
        false,
        undefined,
        undefined,
        geminiCredentials as never,
      );
      await provider.stream({
        input: { text: "hi" },
        disableTools: true,
      } as never);
    });
    assertAbandonedEnded(run, ["provider.stream"]);
  },
);

const openaiTextCredentials = {
  openai: { apiKey: "proof-key", baseURL: openaiText.baseURL },
};

function neurolinkStreamOptions() {
  return {
    input: { text: "hi" },
    provider: "openai",
    model: "gpt-4o-mini",
    credentials: openaiTextCredentials,
    disableTools: true,
    disableInternalFallback: true,
  } as never;
}

await check(
  "P06",
  "a NeuroLink.stream result dropped unread ends stream and stream.attempt at WARNING once collected",
  async () => {
    const run = await dropUnread(async () => {
      await new NeuroLink().stream(neurolinkStreamOptions());
    });
    assertAbandonedEnded(run, ["stream", "stream.attempt"]);
  },
);

await check(
  "P06",
  "control: a NeuroLink.stream read to the end leaves no span open and no exported span without its parent",
  async () => {
    const startedAt = await fresh();
    const before = new Set(openSpans.keys());
    await drain(
      (await new NeuroLink().stream(neurolinkStreamOptions())).stream,
    );
    const spans = await finishedSince(startedAt);
    assertEqual(openSince(before).length, 0, "open spans");
    assertEqual(withMissingParent(spans).length, 0, "spans without parent");
  },
);

await check(
  "P06",
  "control: a NeuroLink.stream closed after its first chunk leaves no span open and no exported span without its parent",
  async () => {
    const startedAt = await fresh();
    const before = new Set(openSpans.keys());
    const result = await new NeuroLink().stream(neurolinkStreamOptions());
    for await (const chunk of result.stream) {
      void chunk;
      break;
    }
    await pause(300);
    const spans = await finishedSince(startedAt);
    assertEqual(openSince(before).length, 0, "open spans");
    assertEqual(withMissingParent(spans).length, 0, "spans without parent");
  },
);

await check(
  "P06",
  "control: a direct Google AI Studio stream read to the end leaves no span open",
  async () => {
    const startedAt = await fresh();
    const before = new Set(openSpans.keys());
    const provider = await AIProviderFactory.createProvider(
      "google-ai",
      "gemini-2.5-flash",
      false,
      undefined,
      undefined,
      geminiCredentials as never,
    );
    await drain(
      (
        await provider.stream({
          input: { text: "hi" },
          disableTools: true,
        } as never)
      ).stream,
    );
    const spans = await finishedSince(startedAt);
    assertEqual(openSince(before).length, 0, "open spans");
    assertEqual(withMissingParent(spans).length, 0, "spans without parent");
  },
);

// ---------------------------------------------------------------------------
// P07: return() racing a pending next() that later rejects
// ---------------------------------------------------------------------------

section("P07 return() during a pending next()");

await check(
  "P07",
  "return() during a pending next() that later rejects: the span ends once, nothing writes to it after, and the consumer still gets the late error",
  async () => {
    const startedAt = await fresh();
    let rejectNext: (error: Error) => void = () => {};
    const source: AsyncIterator<number> = {
      next: () =>
        new Promise<IteratorResult<number>>((_resolve, reject) => {
          rejectNext = reject;
        }),
      return: async () => ({ done: true, value: undefined }),
    };
    const result = await withStreamSpan(
      { name: "p07-stream", tracer: tracers.stream },
      async () => ({ s: source }),
      (r) => ({ [Symbol.asyncIterator]: () => r.s }),
      (r, wrapped) => ({ ...r, s: wrapped }),
    );
    const pending = result.s.next();
    await result.s.return?.();
    rejectNext(new Error("late failure"));
    let late: unknown;
    try {
      await pending;
    } catch (error) {
      late = error;
    }
    const ended = (await finishedSince(startedAt)).filter(
      (span) => span.name === "p07-stream",
    );
    assertEqual(ended.length, 1, "spans ended");
    assert(
      late instanceof Error && late.message === "late failure",
      "the consumer did not get the late error",
    );
    assert(
      endedSpanWarnings.length === 0,
      `${endedSpanWarnings.length} write(s) to the span after it ended`,
    );
  },
);

// ---------------------------------------------------------------------------
// V03: the SageMaker pump's guard around recording is reachable
// ---------------------------------------------------------------------------

section("V03 SageMaker pump with a misbehaving span");

await check(
  "V03",
  "a SageMaker generation span whose isRecording() throws mid-stream still ends, and nothing escapes the detached pump",
  async () => {
    const startedAt = await fresh();
    const provider = new AmazonSageMakerProvider(
      "m",
      "ep",
      "us-east-1",
      undefined,
      { accessKeyId: "a", secretAccessKey: "b" },
    );
    let releaseFinish: () => void = () => {};
    const finishGate = new Promise<void>((resolveGate) => {
      releaseFinish = resolveGate;
    });
    Reflect.set(provider, "sagemakerModel", {
      doStream: async () => ({
        stream: new ReadableStream({
          async start(controller) {
            controller.enqueue({ type: "text-delta", textDelta: "hi" });
            await finishGate;
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 1 },
            });
            controller.close();
          },
        }),
        warnings: [],
      }),
    });
    const doStream = Reflect.get(provider, "doStream") as (
      options: unknown,
    ) => Promise<{ stream: AsyncIterable<{ content: string }> }>;
    spanWatch.name = "stream";
    spanWatch.caught = undefined;
    const result = await doStream.call(provider, { input: { text: "hi" } });
    // Set by the span processor while doStream ran; read past the reset above.
    const hostile = spanWatch.caught as Span | undefined;
    if (hostile === undefined) {
      throw new Error("the generation span was not seen");
    }
    hostile.isRecording = () => {
      throw new Error("hostile isRecording");
    };
    releaseFinish();
    await drain(result.stream);
    await pause(200);
    const ended = (await finishedSince(startedAt)).filter(
      (span) => span.name === "stream",
    );
    assertEqual(ended.length, 1, "generation spans ended");
    assert(
      unhandled.length === 0,
      `${unhandled.length} rejection(s) escaped the pump`,
    );
  },
);

// ---------------------------------------------------------------------------
// V04: observeGeneration's outer guard is reachable
// ---------------------------------------------------------------------------

section("V04 a generation record that cannot be read");

function hostileRecord(): Record<string, unknown> {
  return Object.defineProperty(
    { provider: "openai", model: "gpt-4o-mini", output: "x" },
    "modelParameters",
    {
      enumerable: true,
      get() {
        throw new Error("hostile modelParameters getter");
      },
    },
  );
}

await check(
  "V04",
  "observeGeneration with a record whose getter throws does not throw",
  async () => {
    await fresh();
    const span = tracers.generation.startSpan("v04-generate");
    let threw = false;
    try {
      observeGeneration(span, hostileRecord() as never);
    } catch {
      threw = true;
    } finally {
      span.end();
    }
    assert(!threw, "observeGeneration threw into the model call");
  },
);

await check(
  "V04",
  "withGeneration with a request whose getter throws still runs the model call and returns its result",
  async () => {
    await fresh();
    let got: unknown;
    try {
      got = await withGeneration(hostileRecord() as never, async () => "ok");
    } catch {
      got = "threw";
    }
    assertEqual(got, "ok", "withGeneration result");
  },
);

// ---------------------------------------------------------------------------
// BT05: a direct provider call under a host span leaves the trace's input and
// output to the host
// ---------------------------------------------------------------------------

section(
  "BT05 a direct provider call under a host span leaves the trace input and output to the host",
);

const HOST_TRACE_INPUT = "HOST-OWNED-TRACE-INPUT-BT05";
const HOST_TRACE_OUTPUT = "HOST-OWNED-TRACE-OUTPUT-BT05";

async function underHostSpan(
  call: () => Promise<void>,
): Promise<{ host: ReadableSpan; spans: ReadableSpan[] }> {
  const startedAt = await fresh();
  await trace
    .getTracer("bt05-host")
    .startActiveSpan("host.request", async (hostSpan) => {
      hostSpan.setAttribute("langfuse.trace.input", HOST_TRACE_INPUT);
      hostSpan.setAttribute("langfuse.trace.output", HOST_TRACE_OUTPUT);
      try {
        await call();
      } finally {
        hostSpan.end();
      }
    });
  const spans = await finishedSince(startedAt);
  const host = spans.find((span) => span.name === "host.request");
  if (host === undefined) {
    throw new Error("the host span was not exported");
  }
  return { host, spans };
}

function directToolRequest() {
  return {
    input: { text: "please look it up" },
    tools: lookupTools(),
    maxSteps: 3,
  } as never;
}

function directProviderFor(target: ToolTarget) {
  return AIProviderFactory.createProvider(
    target.name,
    target.model,
    false,
    undefined,
    undefined,
    target.credentials as never,
  );
}

function assertHostKeepsTraceIO(
  host: ReadableSpan,
  spans: ReadableSpan[],
): void {
  assert(
    generations(spans).length >= 2,
    `${generations(spans).length} generations: the tool loop did not run`,
  );
  const writers = spans.filter((span) => span !== host && writesTraceIO(span));
  assert(
    writers.length === 0,
    `${writers.length} span(s) wrote the trace's input or output under the host span: ${writers.map((s) => `${s.name}/${observationType(s) ?? "-"}`).join(", ")}`,
  );
  assertEqual(
    text(host, "langfuse.trace.input"),
    HOST_TRACE_INPUT,
    "host trace input",
  );
  assertEqual(
    text(host, "langfuse.trace.output"),
    HOST_TRACE_OUTPUT,
    "host trace output",
  );
}

for (const target of toolTargets) {
  await check(
    "BT05",
    `direct ${target.name} generate under a host span: no generation writes the trace input or output, and the host's own stay`,
    async () => {
      const { host, spans } = await underHostSpan(async () => {
        await (await directProviderFor(target)).generate(directToolRequest());
      });
      assertHostKeepsTraceIO(host, spans);
    },
  );
}

await check(
  "BT05",
  "direct openai stream under a host span: no generation writes the trace input or output, and the host's own stay",
  async () => {
    const [target] = toolTargets.filter((t) => t.name === "openai");
    const { host, spans } = await underHostSpan(async () => {
      const provider = await directProviderFor(target);
      await drain((await provider.stream(directToolRequest())).stream);
    });
    assertHostKeepsTraceIO(host, spans);
  },
);

await check(
  "BT05",
  "control: the same direct tool turn with no span above it still writes the trace input and output from its generations (K30 root)",
  async () => {
    const [target] = toolTargets.filter((t) => t.name === "openai");
    const spans = await toolTurn(target, "direct", "generate");
    const writers = generations(spans).filter((span) => writesTraceIO(span));
    assert(
      writers.length >= 2,
      `${writers.length} generation(s) wrote trace IO with no span above`,
    );
    assert(
      writers.every((span) =>
        text(span, "langfuse.trace.input").includes("please look it up"),
      ),
      "a generation did not write the trace input",
    );
  },
);

// ---------------------------------------------------------------------------
// BT07: native Vertex wrapper spans keep their observation input and output
// ---------------------------------------------------------------------------

section(
  "BT07 native Vertex wrapper spans keep their observation input and output",
);

const vertexCredentials = {
  vertex: { apiKey: "proof-key", baseURL: gemini.baseURL },
};
const VERTEX_ANSWER = "hello from gemini";

async function vertexTurn(
  prompt: string,
  options: { underHost: boolean },
): Promise<ReadableSpan[]> {
  const run = async (): Promise<void> => {
    const provider = await AIProviderFactory.createProvider(
      "vertex",
      "gemini-2.0-flash",
      false,
      undefined,
      undefined,
      vertexCredentials as never,
    );
    await provider.generate({
      input: { text: prompt },
      disableTools: true,
    } as never);
  };
  if (options.underHost) {
    return (await underHostSpan(run)).spans;
  }
  const startedAt = await fresh();
  await run();
  return finishedSince(startedAt);
}

function wrapper(spans: ReadableSpan[], name: string): ReadableSpan {
  const found = spans.filter((span) => span.name === name);
  assertEqual(found.length, 1, `${name} spans`);
  return found[0];
}

function assertWrapperContent(
  span: ReadableSpan,
  prompt: string,
  inputs: "present" | "absent",
  output: "present" | "absent",
): void {
  const input = text(span, "langfuse.observation.input");
  const answer = text(span, "langfuse.observation.output");
  if (inputs === "present") {
    assert(input.includes(prompt), `${span.name} input lacks the prompt`);
  } else {
    assertEqual(input, "", `${span.name} input`);
  }
  if (output === "present") {
    assert(
      answer.includes(VERTEX_ANSWER),
      `${span.name} output lacks the answer`,
    );
  } else {
    assertEqual(answer, "", `${span.name} output`);
  }
}

await check(
  "BT07",
  "a native Vertex turn under a host span: provider.generate and executeGeneration carry the prompt and the answer, and both are marked internal",
  async () => {
    const prompt = "BT07-PROMPT-under-host";
    const spans = await vertexTurn(prompt, { underHost: true });
    for (const name of ["provider.generate", "executeGeneration"]) {
      const span = wrapper(spans, name);
      assertWrapperContent(span, prompt, "present", "present");
      assertEqual(
        span.attributes["langfuse.internal"],
        true,
        `${name} marked internal`,
      );
    }
  },
);

await check(
  "BT07",
  "a native Vertex turn with no span above: provider.generate stays the exported agent root with the prompt and answer, executeGeneration is internal",
  async () => {
    const prompt = "BT07-PROMPT-no-host";
    const spans = await vertexTurn(prompt, { underHost: false });
    const root = wrapper(spans, "provider.generate");
    assertWrapperContent(root, prompt, "present", "present");
    assertEqual(observationType(root), "agent", "root observation type");
    assert(
      root.attributes["langfuse.internal"] === undefined,
      "the root the loop hangs from is marked internal, so its children would lose their parent",
    );
    const inner = wrapper(spans, "executeGeneration");
    assertWrapperContent(inner, prompt, "present", "present");
    assertEqual(inner.attributes["langfuse.internal"], true, "internal");
  },
);

await check(
  "BT07",
  "control: the generation span of a native Vertex turn still carries the prompt and the answer",
  async () => {
    const prompt = "BT07-PROMPT-generation";
    const spans = await vertexTurn(prompt, { underHost: true });
    const modelCalls = generations(spans);
    assert(modelCalls.length >= 1, "no generation span");
    assert(
      modelCalls.some(
        (span) =>
          text(span, "langfuse.observation.input").includes(prompt) &&
          text(span, "langfuse.observation.output").includes(VERTEX_ANSWER),
      ),
      "no generation carries both",
    );
  },
);

await check(
  "BT07",
  "a credential in the prompt is masked on the wrapper spans",
  async () => {
    const secret = "sk-proofBT07SECRETsecret1234567890";
    const spans = await vertexTurn(`BT07 look up api_key=${secret}`, {
      underHost: true,
    });
    for (const name of ["provider.generate", "executeGeneration"]) {
      const input = text(wrapper(spans, name), "langfuse.observation.input");
      assert(input.includes("BT07 look up"), `${name} input was dropped`);
      assert(!input.includes(secret), `${name} input carries the key`);
      assert(input.includes("[REDACTED]"), `${name} input is not masked`);
    }
  },
);

await check(
  "BT07",
  "with NEUROLINK_RECORD_INPUTS=false the wrapper spans carry the answer and no prompt",
  async () => {
    process.env.NEUROLINK_RECORD_INPUTS = "false";
    try {
      const prompt = "BT07-PROMPT-inputs-off";
      const spans = await vertexTurn(prompt, { underHost: true });
      for (const name of ["provider.generate", "executeGeneration"]) {
        assertWrapperContent(wrapper(spans, name), prompt, "absent", "present");
      }
    } finally {
      delete process.env.NEUROLINK_RECORD_INPUTS;
    }
  },
);

await check(
  "BT07",
  "inside withoutSpanContent the wrapper spans carry neither the prompt nor the answer",
  async () => {
    const prompt = "BT07-PROMPT-withheld";
    const spans = await withoutSpanContent(() =>
      vertexTurn(prompt, { underHost: true }),
    );
    for (const name of ["provider.generate", "executeGeneration"]) {
      assertWrapperContent(wrapper(spans, name), prompt, "absent", "absent");
    }
  },
);

// ---------------------------------------------------------------------------
// BT08: error and status text is recorded verbatim and not capped
// ---------------------------------------------------------------------------

section("BT08 error and status text is recorded verbatim and not capped");

const BT08_SECRET = "sk-proofBT08SECRETsecret1234567890";
const BT08_TAIL = "TAIL-MARKER-BT08";
const BT08_MESSAGE = `upstream rejected: api_key=${BT08_SECRET} Authorization: Bearer ${BT08_SECRET} ${"x".repeat(45_000)} ${BT08_TAIL}`;
const BT08_UNCAPPED_CHARS = 44_000;

async function startFailingOpenAI(message: string): Promise<FakeUpstream> {
  const server = createServer(async (req, res) => {
    await readBody(req);
    res.writeHead(400, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        error: { message, type: "invalid_request_error", code: "bad_request" },
      }),
    );
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => closeServer(server, new Set()),
  };
}

await check(
  "BT08",
  "an upstream 400 with a 45,000-character message: status message, status_message attribute and exception message record all of it as given, key included, with no truncation note",
  async () => {
    const failing = await startFailingOpenAI(BT08_MESSAGE);
    try {
      const startedAt = await fresh();
      const provider = await AIProviderFactory.createProvider(
        "openai",
        "gpt-4o-mini",
        false,
        undefined,
        undefined,
        {
          openai: { apiKey: "proof-key", baseURL: failing.baseURL },
        } as never,
      );
      let thrown = "";
      try {
        await provider.generate({ input: { text: "hi" } } as never);
      } catch (error) {
        thrown = error instanceof Error ? error.message : String(error);
      }
      assert(thrown.length > BT08_UNCAPPED_CHARS, "the call did not fail long");
      assert(
        thrown.includes(BT08_MESSAGE),
        "the thrown error does not carry the upstream message as given",
      );
      const spans = await finishedSince(startedAt);
      const failed = spans.filter((span) => span.status.message !== undefined);
      assert(failed.length > 0, "no span recorded the failure");
      for (const span of failed) {
        const message = span.status.message ?? "";
        assert(!message.includes("[truncated"), `${span.name} was truncated`);
        assert(
          !message.includes("[REDACTED]"),
          `${span.name} had text replaced`,
        );
      }
      const longest = failed.filter(
        (span) => (span.status.message ?? "").length > BT08_UNCAPPED_CHARS,
      );
      assert(
        longest.length > 0 &&
          longest.every((span) =>
            (span.status.message ?? "").includes(BT08_MESSAGE),
          ),
        `no span kept the whole message; status message lengths: ${failed.map((s) => (s.status.message ?? "").length).join(", ")}`,
      );
      const generation = generations(spans).find(
        (span) => span.status.message !== undefined,
      );
      if (generation === undefined) {
        throw new Error("no failed generation span");
      }
      const statusMessage = generation.status.message ?? "";
      assert(
        statusMessage === thrown,
        "the span status message is not the thrown message, character for character",
      );
      const statusText = text(
        generation,
        "langfuse.observation.status_message",
      );
      assert(
        statusText === thrown &&
          statusText.includes(`api_key=${BT08_SECRET}`) &&
          statusText.includes(`Bearer ${BT08_SECRET}`) &&
          statusText.includes(BT08_TAIL),
        `status_message attribute: ${statusText.length} characters, not the thrown message`,
      );
      const exception = generation.events.find(
        (event) => event.name === "exception",
      );
      const exceptionText = String(
        exception?.attributes?.["exception.message"] ?? "",
      );
      assert(
        exceptionText === thrown &&
          exceptionText.includes(`api_key=${BT08_SECRET}`) &&
          exceptionText.includes(BT08_TAIL),
        `exception message: ${exceptionText.length} characters, not the thrown message`,
      );
    } finally {
      await failing.close();
    }
  },
);

await check(
  "BT08",
  "control: content (an input or a tool result) is still capped at the attribute ceiling",
  () => {
    const capped = spanContentAttribute({ rows: "v".repeat(100_000) });
    assert(capped.length <= 40_000, `${capped.length} characters`);
    assert(capped.includes("[truncated"), "no truncation note");
  },
);

// ---------------------------------------------------------------------------
// BT10: only credential entries are masked
// ---------------------------------------------------------------------------

section(
  "BT10 { name, value } and { key, value } entries are recorded as released",
);

const NOT_CREDENTIAL_ENTRIES: Array<[string, Record<string, unknown>]> = [
  ["tokens", { name: "tokens", value: "hello" }],
  ["completion_tokens", { name: "completion_tokens", value: "7 of them" }],
  ["total_tokens", { key: "total_tokens", value: "about 19" }],
  ["max_completion_tokens", { name: "max_completion_tokens", value: "many" }],
  [
    "cache_read_input_tokens",
    { name: "cache_read_input_tokens", value: "a few hundred" },
  ],
  ["max_tokens", { name: "max_tokens", value: "4096" }],
  ["prompt_tokens", { name: "prompt_tokens", value: "12 of them" }],
  ["maxTokens (camel case)", { name: "maxTokens", value: "a few" }],
  ["credential_type", { key: "credential_type", value: "oauth" }],
  ["password_policy", { name: "password_policy", value: "min length 8" }],
  ["signature_algorithm", { name: "signature_algorithm", value: "ed25519" }],
  ["secret_count", { name: "secret_count", value: "many" }],
  ["api_key_limit", { key: "api_key_limit", value: "per minute" }],
  ["credential_count (numeric)", { name: "credential_count", value: "3" }],
  ["secret_version (numeric)", { name: "secret_version", value: "2" }],
  [
    "password_min_length (numeric)",
    { key: "password_min_length", value: "12" },
  ],
  ["tokenizer", { name: "tokenizer", value: "gpt2" }],
  ["author", { key: "author", value: "someone" }],
];

const CREDENTIAL_ENTRIES: Array<[string, Record<string, unknown>, string]> = [
  [
    "api_key",
    { name: "api_key", value: "sk-proofBT10entry1234567890" },
    "sk-proofBT10",
  ],
  ["x-api-key", { key: "x-api-key", value: "abcDEF123ghiJKL456" }, "abcDEF123"],
  [
    "OPENAI_API_KEY",
    { name: "OPENAI_API_KEY", value: "sk-proofBT10env1234567890" },
    "sk-proofBT10",
  ],
  [
    "Authorization",
    { name: "Authorization", value: "Basic dXNlcjpwYXNz" },
    "dXNlcjpwYXNz",
  ],
  ["password", { name: "password", value: "hunter2" }, "hunter2"],
  [
    "client_secret",
    { key: "client_secret", value: "s3cr3tvalue" },
    "s3cr3tvalue",
  ],
  [
    "access_token",
    { name: "access_token", value: "tok-abcdef123456" },
    "tok-abcdef",
  ],
  ["token", { name: "token", value: "abc.def.ghi" }, "abc.def.ghi"],
  [
    "access_tokens",
    { name: "access_tokens", value: "abc.def.ghi" },
    "abc.def.ghi",
  ],
  [
    "refresh_tokens",
    { name: "refresh_tokens", value: "rt-0123456789abcdef" },
    "rt-0123456789",
  ],
  [
    "session_tokens",
    { key: "session_tokens", value: "sess-9f8e7d6c5b4a" },
    "sess-9f8e7d6c",
  ],
  [
    "id_tokens",
    { name: "id_tokens", value: "eyJhbGciOi.payload" },
    "eyJhbGciOi",
  ],
  [
    "auth_tokens",
    { name: "auth_tokens", value: "a1b2c3d4e5f6" },
    "a1b2c3d4e5f6",
  ],
  ["password (numeric)", { name: "password", value: "123456" }, "123456"],
  ["api_key (numeric)", { key: "api_key", value: "9876543210" }, "9876543210"],
  [
    "pin-style secret (numeric)",
    { name: "client_secret", value: "4821" },
    "4821",
  ],
  [
    "private_key",
    { name: "private_key", value: "MIIEvQIBADANBg" },
    "MIIEvQIBADANBg",
  ],
  [
    "Set-Cookie",
    { name: "Set-Cookie", value: "session=abc123def456" },
    "abc123def456",
  ],
  ["signature", { key: "signature", value: "c2lnbmF0dXJl" }, "c2lnbmF0dXJl"],
];

for (const [label, entry] of NOT_CREDENTIAL_ENTRIES) {
  await check(
    "BT10",
    `the entry ${label} is recorded as it was, not masked`,
    () => {
      assertEqual(spanContentAttribute(entry), JSON.stringify(entry), label);
    },
  );
}

// The released masker reads keys and text, not the name of an entry: the value
// of `{ name: "password", value: "hunter2" }` is recorded as it was. What it
// does mask is a text pattern inside the value (a bare provider key, a bearer
// token, a KEY=value assignment).
for (const [label, entry, fragment] of CREDENTIAL_ENTRIES) {
  await check(
    "BT10",
    `the entry ${label} is recorded as the released build recorded it`,
    () => {
      const recorded = spanContentAttribute(entry);
      const hasTextPattern = /^(sk-|Bearer )/.test(String(entry.value));
      if (hasTextPattern) {
        assert(!recorded.includes(fragment), `${label} text pattern leaked`);
        assert(recorded.includes("[REDACTED]"), `${label} not masked`);
      } else {
        assertEqual(recorded, JSON.stringify(entry), label);
      }
    },
  );
}

// With NEUROLINK_MASK_CREDENTIAL_ENTRIES=true the entry's name decides, and
// only credentials are masked.
function withMaskEntriesOn<T>(fn: () => T): T {
  const previous = process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES;
  process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES = "true";
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES;
    } else {
      process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES = previous;
    }
  }
}

for (const [label, entry] of NOT_CREDENTIAL_ENTRIES) {
  await check(
    "BT10",
    `with the opt-in on, the entry ${label} is still recorded as it was`,
    () => {
      assertEqual(
        withMaskEntriesOn(() => spanContentAttribute(entry)),
        JSON.stringify(entry),
        label,
      );
    },
  );
}

for (const [label, entry, fragment] of CREDENTIAL_ENTRIES) {
  await check(
    "BT10",
    `with the opt-in on, the credential entry ${label} has its value masked`,
    () => {
      const recorded = withMaskEntriesOn(() => spanContentAttribute(entry));
      assert(!recorded.includes(fragment), `${label} leaked`);
      assert(recorded.includes("[REDACTED]"), `${label} not masked`);
    },
  );
}

await check(
  "BT10",
  "with the opt-in on, a 160 KB entry name is classified in linear time and its value is masked",
  () => {
    // A key comes from content (a tool argument can carry any key), so the
    // name check must not backtrack: "_max" repeated used to cost seconds.
    const hostile = `secret${"_max".repeat(40_000)}_x`;
    const started = performance.now();
    const recorded = withMaskEntriesOn(() =>
      spanContentAttribute({ name: hostile, value: "VALUE-xyz1234567" }),
    );
    const elapsedMs = performance.now() - started;
    assert(!recorded.includes("VALUE-xyz1234567"), "the value leaked");
    assert(elapsedMs < 2_000, "the name check took over two seconds");
  },
);

await check(
  "BT10",
  "in a headers list a bearer token is masked by its text pattern and every other value is recorded as it was",
  () => {
    const recorded = JSON.parse(
      spanContentAttribute([
        { name: "Authorization", value: "Bearer abcdefghijklmnop1234" },
        { name: "max_tokens", value: "4096" },
        { name: "Content-Type", value: "application/json" },
        { name: "password_policy", value: "min length 8" },
      ]),
    ) as Array<{ name: string; value: string }>;
    assert(!recorded[0].value.includes("abcdefghijklmnop"), "bearer leaked");
    assertEqual(recorded[0].value, "Bearer [REDACTED]", "bearer text pattern");
    assertEqual(recorded[1].value, "4096", "max_tokens");
    assertEqual(recorded[2].value, "application/json", "content type");
    assertEqual(recorded[3].value, "min length 8", "password_policy");
  },
);

// ---------------------------------------------------------------------------
// BT11: the binary placeholder reveals nothing the released rule hid, apart
// from prose and word lists
// ---------------------------------------------------------------------------

section(
  "BT11 the binary placeholder is as wide as the released rule, minus prose and word lists",
);

// The rule the released code applied, written out as the oracle: any string
// over the minimum made of base64 characters, `=` and whitespace.
const RELEASED_BINARY_PATTERN = /^[A-Za-z0-9+/_\-=\s]+$/;
function releasedPlaceholder(value: string): string | undefined {
  return value.length > 1_024 && RELEASED_BINARY_PATTERN.test(value)
    ? `[${Math.floor((value.length * 3) / 4)} bytes]`
    : undefined;
}

function wrapped(payload: string, width: number, lineBreak: string): string {
  const lines: string[] = [];
  for (let at = 0; at < payload.length; at += width) {
    lines.push(payload.slice(at, at + width));
  }
  return lines.join(lineBreak);
}

let lcg = 20_261_018;
function randomBase64(length: number): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < length; i++) {
    lcg = (lcg * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    out += alphabet[lcg % 64];
  }
  return out;
}

const random = randomBase64(4_000);
const pemBody = wrapped(random, 64, "\n");

// Text a person or a list wrote: not base64 in any wrapping.
const RESCUED_CASES: Array<[string, string]> = [
  ["prose", Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ")],
  [
    "words separated by a newline",
    Array.from({ length: 300 }, (_, i) => `alpha${i}`).join("\n"),
  ],
  ["a sentence repeated", "the quick brown fox ".repeat(100)],
  // A list of one short word cannot be told from base64 cut into groups of
  // four by a space; the exporter-redaction suite (K27) pins the word list.
  ["one short word repeated", "word ".repeat(300)],
  ["groups of four separated by a space", "QUJD ".repeat(400)],
  [
    "names one per line",
    Array.from({ length: 200 }, (_, i) => `name${i}`).join("\n"),
  ],
];

const KEPT_CASES: Array<[string, string]> = [
  ["plain base64", "QUJD".repeat(400)],
  ["padded base64", `${"QUJD".repeat(400)}QQ==`],
  ["url-safe base64", "QUJD-_".repeat(300)],
  ["random base64", random],
  ["hex digits", "deadbeef".repeat(300)],
  ["equals signs inside", "QUJD=".repeat(400)],
  ["length of 1 modulo 4", `${"QUJD".repeat(300)}Q`],
  ["padding in the middle", `${"QUJD".repeat(200)}==${"QUJD".repeat(200)}`],
  ["a leading space", ` ${"QUJD".repeat(400)}`],
  ["a trailing newline", `${"QUJD".repeat(400)}\n`],
  ["a trailing CRLF", `${"QUJD".repeat(400)}\r\n`],
  ["a leading newline", `\n${"QUJD".repeat(400)}`],
  [
    "groups of twenty one per line",
    Array.from({ length: 400 }, () => "QUJD".repeat(5)).join("\n"),
  ],
  ...[16, 40, 60, 64, 72, 76, 80, 100, 128, 1_000].flatMap(
    (width): Array<[string, string]> => [
      [`random base64 wrapped at ${width}`, wrapped(random, width, "\n")],
      [
        `random base64 wrapped at ${width} with CRLF`,
        wrapped(random, width, "\r\n"),
      ],
    ],
  ),
  [
    "a PEM block",
    `-----BEGIN CERTIFICATE-----\n${pemBody}\n-----END CERTIFICATE-----`,
  ],
  [
    "a PEM block with CRLF",
    `-----BEGIN PRIVATE KEY-----\r\n${wrapped(random, 64, "\r\n")}\r\n-----END PRIVATE KEY-----\r\n`,
  ],
];

await check(
  "BT11",
  `every string the released rule turned into a placeholder still is one, except ${RESCUED_CASES.length} prose and word-list shapes (${KEPT_CASES.length} kept shapes)`,
  () => {
    const changed: string[] = [];
    for (const [label, value] of [...KEPT_CASES, ...RESCUED_CASES]) {
      const released = releasedPlaceholder(value);
      assert(released !== undefined, `${label}: the oracle sees no binary`);
      if (binaryPlaceholder(value, undefined) !== released) {
        changed.push(label);
      }
    }
    assertEqual(
      JSON.stringify(changed),
      JSON.stringify(RESCUED_CASES.map(([label]) => label)),
      "the strings whose placeholder went away",
    );
  },
);

await check(
  "BT11",
  "prose and word lists under a binary key keep their text in the recorded attribute",
  () => {
    for (const [label, value] of RESCUED_CASES) {
      const recorded = spanContentAttribute({ data: value });
      assertEqual(recorded, JSON.stringify({ data: value }), label);
    }
  },
);

await check(
  "BT11",
  "everything else under a binary key is recorded as a size, never as content",
  () => {
    for (const [label, value] of KEPT_CASES) {
      const recorded = spanContentAttribute({ data: value, image: value });
      assert(
        /^\{"data":"\[\d+ bytes\]","image":"\[\d+ bytes\]"\}$/.test(recorded),
        `${label}: ${recorded.slice(0, 120)}`,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// BT12: the caller's Gemini usage is as released; only the observation is
// clamped
// ---------------------------------------------------------------------------

section(
  "BT12 Gemini usage handed to the caller is as released, the observation is clamped",
);

const BT12_USAGE = {
  promptTokenCount: 100,
  cachedContentTokenCount: 8_000,
  candidatesTokenCount: 500,
  totalTokenCount: 600,
};
const BT12_RELEASED_USAGE = {
  input: 0,
  output: 500,
  total: 8_500,
  cacheReadTokens: 8_000,
};

function bt12Options(upstream: FakeUpstream) {
  return {
    input: { text: "hi" },
    provider: "google-ai",
    model: P05_MODEL,
    credentials: {
      googleAiStudio: { apiKey: "proof-key", baseURL: upstream.baseURL },
    },
    disableTools: true,
    disableInternalFallback: true,
  } as never;
}

await check(
  "BT12",
  "generate() against a Gemini reply of 8000 cached of a 100 prompt returns usage input 0, output 500, total 8500, cacheReadTokens 8000, as released",
  async () => {
    const upstream = await startGemini({ usage: BT12_USAGE });
    try {
      const result = await new NeuroLink().generate(bt12Options(upstream));
      assertEqual(
        JSON.stringify(result.usage),
        JSON.stringify(BT12_RELEASED_USAGE),
        "generate usage",
      );
    } finally {
      await upstream.close();
    }
  },
);

await check(
  "BT12",
  "stream() against the same reply reports the same token usage in its analytics, as released",
  async () => {
    const upstream = await startGemini({ usage: BT12_USAGE });
    try {
      const result = await new NeuroLink().stream(bt12Options(upstream));
      await drain(result.stream);
      const analytics = (await Promise.resolve(result.analytics)) as
        | { tokenUsage?: unknown }
        | undefined;
      assertEqual(
        JSON.stringify(analytics?.tokenUsage),
        JSON.stringify(BT12_RELEASED_USAGE),
        "stream analytics tokenUsage",
      );
    } finally {
      await upstream.close();
    }
  },
);

await check(
  "BT12",
  "the generation observation of that same call is clamped: input 0, cache_read 100, output 500, total 600",
  async () => {
    const upstream = await startGemini({ usage: BT12_USAGE });
    try {
      const startedAt = await fresh();
      await new NeuroLink().generate(bt12Options(upstream));
      const [generation] = generations(await finishedSince(startedAt));
      assert(generation !== undefined, "no generation span");
      const usage = usageDetails(generation);
      assertEqual(usage.input, 0, "input");
      assertEqual(usage.cache_read_input_tokens, 100, "cache_read");
      assertEqual(usage.output, 500, "output");
      assertEqual(usage.total, 600, "total");
    } finally {
      await upstream.close();
    }
  },
);

await check(
  "BT12",
  "control: a reply with nothing cached keeps its observation free of a cache_read key",
  async () => {
    const upstream = await startGemini({
      usage: {
        promptTokenCount: 100,
        candidatesTokenCount: 10,
        totalTokenCount: 110,
      },
    });
    try {
      const startedAt = await fresh();
      await new NeuroLink().generate(bt12Options(upstream));
      const [generation] = generations(await finishedSince(startedAt));
      assert(generation !== undefined, "no generation span");
      assertEqual(
        JSON.stringify(Object.keys(usageDetails(generation)).sort()),
        JSON.stringify(["input", "output", "total"]),
        "usage_details keys",
      );
    } finally {
      await upstream.close();
    }
  },
);

// ---------------------------------------------------------------------------
// BT13: a SageMaker pump failure leaves the span at ERROR, aborts included
// ---------------------------------------------------------------------------

section(
  "BT13 a SageMaker pump failure leaves the generation span at status ERROR",
);

const BT13_SECRET = "sk-proofBT13SECRETsecret1234567890";

async function sagemakerPumpFailing(error: Error): Promise<ReadableSpan> {
  const startedAt = await fresh();
  const provider = new AmazonSageMakerProvider(
    "m",
    "ep",
    "us-east-1",
    undefined,
    { accessKeyId: "a", secretAccessKey: "b" },
  );
  Reflect.set(provider, "sagemakerModel", {
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-delta", textDelta: "hi" });
          controller.error(error);
        },
      }),
      warnings: [],
    }),
  });
  const doStream = Reflect.get(provider, "doStream") as (
    options: unknown,
  ) => Promise<{ stream: AsyncIterable<{ content: string }> }>;
  const result = await doStream.call(provider, { input: { text: "hi" } });
  try {
    await drain(result.stream);
  } catch {
    // The consumer is handed the pump's error.
  }
  await pause(200);
  const ended = (await finishedSince(startedAt)).filter(
    (span) => span.name === "stream",
  );
  assertEqual(ended.length, 1, "generation spans ended");
  return ended[0];
}

await check(
  "BT13",
  "a pump that fails with an abort-class error ends its span with status ERROR and the error message unchanged, as released",
  async () => {
    const raw = `stream aborted api_key=${BT13_SECRET}`;
    const aborted = Object.assign(new Error(raw), { name: "AbortError" });
    const span = await sagemakerPumpFailing(aborted);
    assertEqual(span.status.code, SpanStatusCode.ERROR, "status code");
    assertEqual(
      span.status.message,
      raw,
      "the status message is not the error message, character for character",
    );
  },
);

await check(
  "BT13",
  "a pump that fails with an ordinary error ends its span at ERROR with the error message unchanged and the ERROR level",
  async () => {
    const raw = `pump broke api_key=${BT13_SECRET}`;
    const span = await sagemakerPumpFailing(new Error(raw));
    assertEqual(span.status.code, SpanStatusCode.ERROR, "status code");
    assertEqual(
      span.status.message,
      raw,
      "the status message is not the error message, character for character",
    );
    assertEqual(
      text(span, "langfuse.observation.status_message"),
      raw,
      "the status_message attribute is not the error message",
    );
    assertEqual(text(span, "langfuse.observation.level"), "ERROR", "level");
  },
);

// ---------------------------------------------------------------------------
// BT17: a consumer throw() into a NeuroLink stream keeps the model on the root
// ---------------------------------------------------------------------------

section(
  "BT17 a consumer throw() into a NeuroLink stream keeps the model on the root span",
);

function modelMetadata(span: ReadableSpan | undefined): string {
  return text(span, "langfuse.observation.metadata.model");
}

// The stream root after the consumer did `act` to the stream once its first
// chunk had been read.
async function streamRootAfter(
  act: (iterator: AsyncIterator<unknown>) => Promise<void>,
): Promise<ReadableSpan> {
  const startedAt = await fresh();
  const result = await new NeuroLink().stream(neurolinkStreamOptions());
  const iterator = result.stream[Symbol.asyncIterator]();
  await iterator.next();
  await act(iterator);
  const roots = (await finishedSince(startedAt)).filter(
    (span) => span.name === "stream" && observationType(span) === "agent",
  );
  assertEqual(roots.length, 1, "stream roots");
  return roots[0];
}

await check(
  "BT17",
  "throw() after the first chunk: the caller gets the thrown error back and the stream root keeps the metadata.model a return() leaves, as released",
  async () => {
    const closed = await streamRootAfter(async (iterator) => {
      await iterator.return?.();
    });
    const expectedModel = modelMetadata(closed);
    assert(expectedModel !== "", "the return() control carries no model");

    let rejection = "";
    const thrown = await streamRootAfter(async (iterator) => {
      try {
        await iterator.throw?.(new Error("injected-bt17"));
      } catch (error) {
        rejection = error instanceof Error ? error.message : String(error);
      }
    });
    assertEqual(rejection, "injected-bt17", "the caller's rejection");
    assertEqual(modelMetadata(thrown), expectedModel, "metadata.model");
  },
);

await check(
  "BT17",
  "control: closing the stream early with return() still ends the root at WARNING",
  async () => {
    const root = await streamRootAfter(async (iterator) => {
      await iterator.return?.();
    });
    assertEqual(
      text(root, "langfuse.observation.level"),
      "WARNING",
      "level after return()",
    );
  },
);

await gemini.close();
await openai.close();
await anthropic.close();
await openaiText.close();

await runSuite();
