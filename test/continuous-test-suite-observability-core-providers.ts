#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, core and providers follow-up
 *
 * Proof for the PR #2002 follow-up findings K15, K23, K29, K30, K31 and K33.
 * Every check prints exactly one `PROOF <id> PASS|FAIL <description>` line and
 * the suite exits non-zero if any check fails.
 *
 * Determinism exception (CLAUDE.md rule 15). This suite imports from `src/`,
 * never from `dist/`, and is listed in the `neurolink/e2e-tests-only` allow
 * list. What determinism buys, per finding:
 *   K15  an exact Gemini `usageMetadata` (10,000 prompt tokens of which 8,000
 *        cached, 500 output, 300 thinking) whose per-step cost can be computed
 *        by hand; `createGeminiLoopAdapter` and `runAgenticLoop` are not root
 *        exports, so the adapter and engine are driven directly. A fake Gemini
 *        SSE server then drives the real Google AI Studio provider to prove
 *        the turn-level totals still agree with the per-step observation.
 *   K29/K33  a stream that is closed or thrown into before its first chunk,
 *        and one held open after its first chunk, against a fake OpenAI
 *        server, so the settle point of `stream.attempt` is reached by a
 *        deterministic interleaving no live provider would produce on demand.
 *   K30  a multi-step tool loop against a direct provider with no NeuroLink
 *        instance and no ambient span, then the same loop under NeuroLink and
 *        under a host span as controls.
 *   K31  a site-stamped decision call in a process with no decision provider.
 *   K23  a static scan of the shipped source (comments cannot be observed at
 *        run time).
 * No keys and no network beyond loopback servers are used.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-core-providers.ts
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { EventEmitter } from "node:events";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

process.env.NEUROLINK_SKIP_MCP = "true";

const spanExporter = new InMemorySpanExporter();
const hostProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});
hostProvider.register();

const { NeuroLink } = await import("../src/lib/neurolink.js");
const { AIProviderFactory } = await import("../src/lib/core/factory.js");
const { createGeminiLoopAdapter } =
  await import("../src/lib/core/geminiLoopAdapter.js");
const { runAgenticLoop } = await import("../src/lib/core/loopEngine.js");
const { observeGeneration } =
  await import("../src/lib/telemetry/observation.js");
const { withStreamSpan } = await import("../src/lib/telemetry/withSpan.js");
const { tracers } = await import("../src/lib/telemetry/tracers.js");
const { calculateCost } = await import("../src/lib/utils/pricing.js");
const { jsonSchema } = await import("../src/lib/utils/tool.js");
const { getMetricsAggregator } =
  await import("../src/lib/observability/metricsAggregator.js");
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
} from "../src/lib/types/index.js";

const { test, section, runSuite } = defineSuite(
  "Observability core and providers",
  { offline: true, perTestTimeoutMs: 60_000 },
);

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(TEST_DIR, "..", "src", "lib");

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

async function finished(): Promise<ReadableSpan[]> {
  await hostProvider.forceFlush();
  return spanExporter.getFinishedSpans();
}

function reset(): void {
  spanExporter.reset();
}

function startedAtMs(span: ReadableSpan): number {
  return span.startTime[0] * 1_000 + span.startTime[1] / 1_000_000;
}

// Spans from an earlier check can end late (a held stream tearing down, a
// loop's final step), so a check that counts spans starts from a quiet
// exporter and reads only spans that started after it began.
async function fresh(): Promise<number> {
  await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  await hostProvider.forceFlush();
  spanExporter.reset();
  return Date.now();
}

async function finishedSince(startedAt: number): Promise<ReadableSpan[]> {
  await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  return (await finished()).filter((span) => startedAtMs(span) >= startedAt);
}

// Generations are excluded: a model call is named after its API (`stream`,
// `generate`), the same as the root observation that wraps it.
function named(spans: ReadableSpan[], name: string): ReadableSpan[] {
  return spans.filter(
    (span) =>
      span.name === name &&
      span.attributes["langfuse.observation.type"] !== "generation",
  );
}

function generations(spans: ReadableSpan[]): ReadableSpan[] {
  return spans.filter(
    (span) => span.attributes["langfuse.observation.type"] === "generation",
  );
}

function traceIdsOf(spans: ReadableSpan[]): string[] {
  return [...new Set(spans.map((span) => span.spanContext().traceId))];
}

// Only observations reach an exporter; the exporter skips every other span
// (`tools.getAll`, `executeGeneration`). Those helpers may sit in a trace of
// their own without splitting anything an exporter shows, so the "one trace"
// checks count the traces of the observations alone.
function exportedTraceIds(spans: ReadableSpan[]): string[] {
  return traceIdsOf(
    spans.filter(
      (span) =>
        span.attributes["langfuse.observation.type"] !== undefined ||
        span.attributes["gen_ai.observation.type"] !== undefined,
    ),
  );
}

function usageDetails(span: ReadableSpan): Record<string, number> {
  const raw = span.attributes["langfuse.observation.usage_details"];
  assert(typeof raw === "string", `${span.name} has no usage_details`);
  return JSON.parse(raw as string) as Record<string, number>;
}

function costTotal(span: ReadableSpan): number {
  const raw = span.attributes["langfuse.observation.cost_details"];
  assert(typeof raw === "string", `${span.name} has no cost_details`);
  return (JSON.parse(raw as string) as { total: number }).total;
}

function describeTree(spans: ReadableSpan[]): string {
  return spans
    .map(
      (span) =>
        `${span.name} id=${span.spanContext().spanId.slice(0, 6)} parent=${(span.parentSpanContext?.spanId ?? "-").slice(0, 6)} trace=${span.spanContext().traceId.slice(0, 6)} type=${String(span.attributes["langfuse.observation.type"] ?? "-")}`,
    )
    .join("\n");
}

function near(actual: number, expected: number, message: string): void {
  assert(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, got ${actual}`,
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

function chatFrame(delta: object, finish: string | null): string {
  return `data: ${JSON.stringify({
    id: "chatcmpl-proof",
    object: "chat.completion.chunk",
    created: 1,
    model: "proof",
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

async function startOpenAI(): Promise<FakeUpstream> {
  const held = new Set<ServerResponse>();
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const model = String(body.model ?? "gpt-4o-mini");
    if (body.stream !== true) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-proof",
          object: "chat.completion",
          created: 1,
          model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "hello there" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        }),
      );
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(chatFrame({ role: "assistant", content: "hel" }, null));
    if (model === "hold-model") {
      held.add(res);
      res.on("close", () => held.delete(res));
      return;
    }
    setTimeout(() => {
      res.write(chatFrame({ content: "lo" }, null));
      res.write(chatFrame({}, "stop"));
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-proof",
          object: "chat.completion.chunk",
          created: 1,
          model,
          choices: [],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        })}\n\n`,
      );
      res.end("data: [DONE]\n\n");
    }, 10);
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () => closeServer(server, held),
  };
}

const GEMINI_USAGE = {
  promptTokenCount: 10_000,
  cachedContentTokenCount: 8_000,
  candidatesTokenCount: 500,
  thoughtsTokenCount: 300,
  totalTokenCount: 10_800,
};

function geminiFrame(parts: object[], finishReason: string): string {
  return `data: ${JSON.stringify({
    candidates: [{ content: { role: "model", parts }, finishReason, index: 0 }],
    usageMetadata: GEMINI_USAGE,
  })}\r\n\r\n`;
}

function hasFunctionResponse(body: JsonBody): boolean {
  return JSON.stringify(body.contents ?? []).includes("functionResponse");
}

async function startGemini(): Promise<FakeUpstream> {
  const held = new Set<ServerResponse>();
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const declaresTools =
      Array.isArray(body.tools) &&
      JSON.stringify(body.tools).includes("lookup");
    res.writeHead(200, { "content-type": "text/event-stream" });
    if (req.url?.includes("hold-model")) {
      // One text chunk with no finish reason, then the response stays open:
      // the consumer holds a live stream after its first chunk.
      res.write(
        `data: ${JSON.stringify({
          candidates: [
            { content: { role: "model", parts: [{ text: "hel" }] }, index: 0 },
          ],
        })}\r\n\r\n`,
      );
      held.add(res);
      res.on("close", () => held.delete(res));
      return;
    }
    if (declaresTools && !hasFunctionResponse(body)) {
      res.end(
        geminiFrame(
          [{ functionCall: { name: "lookup", args: { q: "needle" } } }],
          "STOP",
        ),
      );
      return;
    }
    res.end(geminiFrame([{ text: "hello from gemini" }], "STOP"));
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}`,
    close: () => closeServer(server, held),
  };
}

function hasToolResult(body: JsonBody): boolean {
  const serialized = JSON.stringify(body.messages ?? []);
  return (
    serialized.includes('"role":"tool"') || serialized.includes("tool_result")
  );
}

// A tool-calling OpenAI upstream: the first request of a turn asks for the
// `lookup` tool, the request that carries its result answers in text. Sends
// SSE for a streaming request and one JSON body otherwise.
async function startOpenAITools(): Promise<FakeUpstream> {
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const toolCalls = [
      {
        index: 0,
        id: "call_1",
        type: "function",
        function: { name: "lookup", arguments: '{"q":"needle"}' },
      },
    ];
    const answering = hasToolResult(body);
    if (body.stream === true) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        chatFrame(
          answering
            ? { role: "assistant", content: "done" }
            : { role: "assistant", tool_calls: toolCalls },
          null,
        ),
      );
      res.write(chatFrame({}, answering ? "stop" : "tool_calls"));
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
            message: answering
              ? { role: "assistant", content: "done" }
              : { role: "assistant", content: null, tool_calls: toolCalls },
            finish_reason: answering ? "stop" : "tool_calls",
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

// A tool-calling Anthropic upstream with the same two-request shape.
async function startAnthropicTools(): Promise<FakeUpstream> {
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    const answering = hasToolResult(body);
    const toolUse = {
      type: "tool_use",
      id: "toolu_proof",
      name: "lookup",
      input: { q: "needle" },
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
              partial_json: JSON.stringify(toolUse.input),
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

const openai = await startOpenAI();
const gemini = await startGemini();
const openaiTools = await startOpenAITools();
const anthropicTools = await startAnthropicTools();
const openaiCredentials = {
  openai: { apiKey: "test-key", baseURL: openai.baseURL },
};
const geminiCredentials = {
  googleAiStudio: { apiKey: "test-key", baseURL: gemini.baseURL },
};
const openaiToolCredentials = {
  openai: { apiKey: "test-key", baseURL: openaiTools.baseURL },
};
const anthropicCredentials = {
  anthropic: { apiKey: "test-key", baseURL: anthropicTools.baseURL },
};

function lookupTools(calls: { count: number }) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: { q: { type: "string" } },
        additionalProperties: true,
      }),
      execute: async () => {
        calls.count++;
        return { found: true };
      },
    },
  };
}

// ---------------------------------------------------------------------------
// K15: Gemini loop step usage and cost
// ---------------------------------------------------------------------------

section("K15 Gemini loop adapter usage");

const PROVIDER = "google-ai";
const MODEL = "gemini-3-flash-preview";
const PER_MILLION = 1_000_000;
const rateInput =
  calculateCost(PROVIDER, MODEL, { input: PER_MILLION, output: 0, total: 0 }) /
  PER_MILLION;
const rateOutput =
  calculateCost(PROVIDER, MODEL, { input: 0, output: PER_MILLION, total: 0 }) /
  PER_MILLION;
const rateCacheRead =
  calculateCost(PROVIDER, MODEL, {
    input: 0,
    output: 0,
    total: 0,
    cacheReadTokens: PER_MILLION,
  }) / PER_MILLION;

type GeminiUsageMetadata = Record<string, number>;

async function geminiLoopGeneration(
  usageMetadata: GeminiUsageMetadata,
): Promise<ReadableSpan> {
  reset();
  const adapter = createGeminiLoopAdapter({
    providerLabel: "ProofGemini",
    provider: PROVIDER,
    maxSteps: 2,
    buildRequest: (conversation) => ({
      model: MODEL,
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
  await resultPromise;
  const steps = generations(await finished());
  assertEqual(steps.length, 1, "expected exactly one generation per step");
  return steps[0];
}

await check(
  "K15",
  "pricing fixture: rates are 0.5 / 3.0 / 0.125 dollars per million tokens",
  () => {
    near(rateInput * PER_MILLION, 0.5, "input rate");
    near(rateOutput * PER_MILLION, 3.0, "output rate");
    near(rateCacheRead * PER_MILLION, 0.125, "cache read rate");
  },
);

await check(
  "K15",
  "a Gemini step reports cached prompt tokens once: input 2000 beside cache_read 8000",
  async () => {
    const step = await geminiLoopGeneration({
      ...GEMINI_USAGE,
      thoughtsTokenCount: 0,
    });
    const usage = usageDetails(step);
    assertEqual(usage.input, 2_000, "input must exclude the cached 8000");
    assertEqual(
      usage.cache_read_input_tokens,
      8_000,
      "cache_read_input_tokens",
    );
  },
);

await check(
  "K15",
  "a Gemini step with cached tokens costs 0.0035, not the double-counted 0.0075",
  async () => {
    const step = await geminiLoopGeneration({
      ...GEMINI_USAGE,
      thoughtsTokenCount: 0,
    });
    const expected =
      2_000 * rateInput + 500 * rateOutput + 8_000 * rateCacheRead;
    near(expected, 0.0035, "hand-computed cost");
    near(costTotal(step), expected, "step cost");
  },
);

await check(
  "K15",
  "thinking tokens are priced at the output rate and reported as reasoning",
  async () => {
    const step = await geminiLoopGeneration(GEMINI_USAGE);
    const usage = usageDetails(step);
    assertEqual(usage.output, 800, "output folds the 300 thinking tokens");
    assertEqual(usage.reasoning, 300, "reasoning is the thinking subset");
    const expected =
      2_000 * rateInput + 800 * rateOutput + 8_000 * rateCacheRead;
    near(expected, 0.0044, "hand-computed cost");
    near(costTotal(step), expected, "step cost with thinking");
  },
);

await check(
  "K15",
  "control: the OpenAI overlapping shape still rebases input to 2000 and costs 0.0035",
  async () => {
    reset();
    const span = tracers.sdk.startSpan("control.openai");
    observeGeneration(span, {
      provider: PROVIDER,
      model: MODEL,
      usage: {
        promptTokens: 10_000,
        completionTokens: 500,
        totalTokens: 10_500,
        prompt_tokens_details: { cached_tokens: 8_000 },
      },
    });
    span.end();
    const [recorded] = generations(await finished());
    if (process.env.PROOF_DEBUG) {
      console.log(describeTree([recorded]));
    }
    const usage = usageDetails(recorded);
    assertEqual(usage.input, 2_000, "overlapping input rebased");
    assertEqual(usage.cache_read_input_tokens, 8_000, "cache read");
    near(costTotal(recorded), 0.0035, "overlapping shape cost");
  },
);

await check(
  "K15",
  "control: an Anthropic style step (input 2000, cacheRead 8000) keeps its usage and costs 0.0035",
  async () => {
    reset();
    let served = false;
    const adapter: AgenticLoopAdapter<string[]> = {
      providerLabel: "ProofAnthropic",
      maxSteps: 2,
      buildStepRequest: (conversation) => ({
        raw: conversation,
        generation: { provider: PROVIDER, model: MODEL },
      }),
      executeStep: async (_request, channel) => {
        served = true;
        channel.push({ content: "answer" });
        const result: AgenticLoopStepResult<undefined> = {
          text: "answer",
          toolCalls: [],
          usage: {
            inputTokens: 2_000,
            outputTokens: 500,
            cacheReadTokens: 8_000,
          },
          rawStopReason: "end_turn",
          raw: undefined,
        };
        return result;
      },
      buildToolResultMessages: (conversation) => conversation,
      mapFinishReason: () => "stop",
    };
    const { stream, resultPromise } = runAgenticLoop(adapter, [], {});
    await drain(stream);
    await resultPromise;
    assert(served, "the fake adapter never ran");
    const [recorded] = generations(await finished());
    const usage = usageDetails(recorded);
    assertEqual(usage.input, 2_000, "non-overlapping input unchanged");
    assertEqual(usage.cache_read_input_tokens, 8_000, "cache read unchanged");
    near(costTotal(recorded), 0.0035, "non-overlapping shape cost");
  },
);

await check(
  "K15",
  "Google AI Studio end to end: the step observation and the turn totals agree",
  async () => {
    reset();
    const provider = await AIProviderFactory.createProvider(
      PROVIDER,
      MODEL,
      false,
      undefined,
      undefined,
      geminiCredentials,
    );
    const result = await provider.generate({
      input: { text: "hi" },
      disableTools: true,
    } as never);
    const [step] = generations(await finished());
    assert(step !== undefined, "no generation observation was recorded");
    const usage = usageDetails(step);
    assertEqual(usage.input, 2_000, "step input");
    assertEqual(usage.cache_read_input_tokens, 8_000, "step cache read");
    assertEqual(usage.output, 800, "step output includes thinking");
    const turn = result?.usage;
    assert(turn !== undefined, "generate returned no usage");
    assertEqual(turn?.input, usage.input, "turn input equals the step input");
    assertEqual(
      turn?.output,
      usage.output,
      "turn output equals the step output",
    );
    assertEqual(
      turn?.cacheReadTokens,
      usage.cache_read_input_tokens,
      "turn cache read equals the step cache read",
    );
    assertEqual(turn?.total, 10_800, "turn total conserves every token");
    near(costTotal(step), 0.0044, "end to end step cost");
  },
);

// ---------------------------------------------------------------------------
// K29 and K33: early close and throw()
// ---------------------------------------------------------------------------

section("K29 / K33 stream close and throw");

const nl = new NeuroLink();
const emitter = nl.getEventEmitter();

function listenerTotal(): number {
  // The typed emitter hides `eventNames`; the object is a Node EventEmitter.
  const node = emitter as unknown as EventEmitter;
  return node
    .eventNames()
    .reduce((sum, name) => sum + node.listenerCount(name), 0);
}

function openaiRequest(model: string) {
  return {
    input: { text: "hi" },
    provider: "openai",
    model,
    credentials: openaiCredentials,
    disableTools: true,
    disableInternalFallback: true,
  } as never;
}

const warm = await nl.stream(openaiRequest("gpt-4o-mini"));
await drain(warm.stream);

await check(
  "K29",
  "a stream closed before its first chunk ends stream.attempt",
  async () => {
    const startedAt = await fresh();
    const result = await nl.stream(openaiRequest("gpt-4o-mini"));
    await result.stream[Symbol.asyncIterator]().return?.();
    const attempts = named(await finishedSince(startedAt), "stream.attempt");
    assertEqual(attempts.length, 1, "stream.attempt was never ended");
  },
);

await check(
  "K29",
  "a stream closed before its first chunk removes its emitter listeners",
  async () => {
    const before = listenerTotal();
    const result = await nl.stream(openaiRequest("gpt-4o-mini"));
    await result.stream[Symbol.asyncIterator]().return?.();
    assertEqual(
      listenerTotal(),
      before,
      "listeners leaked after an early close",
    );
  },
);

await check(
  "K29",
  "control: the root stream span still ends at WARNING for a stream closed before its first chunk",
  async () => {
    const startedAt = await fresh();
    const result = await nl.stream(openaiRequest("gpt-4o-mini"));
    await result.stream[Symbol.asyncIterator]().return?.();
    const all = await finishedSince(startedAt);
    if (process.env.PROOF_DEBUG) {
      console.log(describeTree(all));
    }
    const roots = named(all, "stream");
    assertEqual(roots.length, 1, "root stream span was never ended");
    assertEqual(
      roots[0].attributes["langfuse.observation.level"],
      "WARNING",
      "root level",
    );
  },
);

async function heldStream() {
  const result = await nl.stream(openaiRequest("hold-model"));
  const iterator = result.stream[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert(first.done !== true, "the held stream produced no first chunk");
  return iterator;
}

async function thrownBy(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return undefined;
}

await check(
  "K33",
  "throw() on a live stream rejects with the injected error and reaches the producer as an error",
  async () => {
    const startedAt = await fresh();
    const streamErrors: unknown[] = [];
    const record = (event: unknown) => streamErrors.push(event);
    emitter.on("stream:error", record);
    try {
      const iterator = await heldStream();
      const injected = new Error("injected-by-consumer");
      const rejected = await thrownBy(() => iterator.throw!(injected));
      assert(
        rejected === injected,
        "throw() did not reject with the injected error",
      );
      assertEqual(
        streamErrors.length,
        1,
        "the producer never saw the injected error (no stream:error event)",
      );
      assert(
        JSON.stringify(streamErrors[0]).includes("injected-by-consumer"),
        "stream:error did not carry the injected error",
      );
    } finally {
      emitter.off("stream:error", record);
    }
  },
);

await check(
  "K33",
  "throw() on a live stream ends stream.attempt and the root stream span as errors",
  async () => {
    const startedAt = await fresh();
    const iterator = await heldStream();
    await thrownBy(() => iterator.throw!(new Error("injected-by-consumer")));
    const spans = await finishedSince(startedAt);
    const attempts = named(spans, "stream.attempt");
    assertEqual(attempts.length, 1, "stream.attempt was never ended");
    assertEqual(
      attempts[0].status.code,
      SpanStatusCode.ERROR,
      "stream.attempt status",
    );
    const roots = named(spans, "stream");
    assertEqual(roots.length, 1, "root stream span was never ended");
    assertEqual(
      roots[0].attributes["langfuse.observation.level"],
      "ERROR",
      "root level",
    );
  },
);

await check(
  "K33",
  "throw() before the first chunk rejects with the injected error and settles the drain",
  async () => {
    const startedAt = await fresh();
    const before = listenerTotal();
    const result = await nl.stream(openaiRequest("gpt-4o-mini"));
    const iterator = result.stream[Symbol.asyncIterator]();
    const injected = new Error("injected-before-start");
    const rejected = await thrownBy(() => iterator.throw!(injected));
    assert(
      rejected === injected,
      "throw() did not reject with the injected error",
    );
    const attempts = named(await finishedSince(startedAt), "stream.attempt");
    assertEqual(attempts.length, 1, "stream.attempt was never ended");
    assertEqual(listenerTotal(), before, "listeners leaked after throw()");
  },
);

// withStreamSpan sits under BaseProvider.stream's fallback generator, which
// turns a consumer's throw() into return() before it can reach the span
// wrapper. No provider reaches withStreamSpan.throw() today, so the wrapper
// is driven directly with a source that tells throw() and return() apart.
type ThrowProbe = {
  seen: string[];
  wrapped: AsyncIterator<{ content: string }>;
};

async function wrappedThrowProbe(name: string): Promise<ThrowProbe> {
  const seen: string[] = [];
  async function* source(): AsyncGenerator<{ content: string }> {
    try {
      yield { content: "a" };
      yield { content: "b" };
    } catch (error) {
      seen.push(`caught ${(error as Error).message}`);
      throw error;
    } finally {
      seen.push("finalized");
    }
  }
  const result = await withStreamSpan(
    { name, tracer: trace.getTracer("proof-stream-span") },
    async () => ({ stream: source() as AsyncIterable<{ content: string }> }),
    (produced) => produced.stream,
    (produced, wrapped) => ({ ...produced, stream: wrapped }),
  );
  const wrapped = result.stream[Symbol.asyncIterator]();
  const first = await wrapped.next();
  assert(first.done !== true, "the source produced no first chunk");
  return { seen, wrapped };
}

await check(
  "K33",
  "withStreamSpan forwards throw() to the source and ends its span as an error",
  async () => {
    const startedAt = await fresh();
    const { seen, wrapped } = await wrappedThrowProbe("proof.stream.throw");
    const injected = new Error("injected-into-span-wrapper");
    const rejected = await thrownBy(() => wrapped.throw!(injected));
    assert(
      rejected === injected,
      "throw() did not reject with the injected error",
    );
    assert(
      seen.includes("caught injected-into-span-wrapper"),
      "the source never saw the injected error (throw() became return())",
    );
    const spans = named(await finishedSince(startedAt), "proof.stream.throw");
    assertEqual(spans.length, 1, "the span was never ended");
    assertEqual(spans[0].status.code, SpanStatusCode.ERROR, "span status");
  },
);

await check(
  "K33",
  "control: withStreamSpan return() still closes the source and ends its span at WARNING",
  async () => {
    const startedAt = await fresh();
    const { seen, wrapped } = await wrappedThrowProbe("proof.stream.return");
    await wrapped.return!();
    assert(seen.includes("finalized"), "return() did not close the source");
    assert(
      !seen.some((entry) => entry.startsWith("caught")),
      "return() was delivered to the source as an error",
    );
    const spans = named(await finishedSince(startedAt), "proof.stream.return");
    assertEqual(spans.length, 1, "the span was never ended");
    assertEqual(
      spans[0].attributes["langfuse.observation.level"],
      "WARNING",
      "span level",
    );
  },
);

await check(
  "K33",
  "control: throw() into a direct provider.stream rejects with the injected error and still ends provider.stream",
  async () => {
    const provider = await AIProviderFactory.createProvider(
      PROVIDER,
      "hold-model",
      false,
      undefined,
      undefined,
      geminiCredentials,
    );
    const startedAt = await fresh();
    const result = await provider.stream({
      input: { text: "hi" },
      disableTools: true,
    } as never);
    const iterator = result.stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    assert(first.done !== true, "the held stream produced no first chunk");
    const injected = new Error("injected-into-provider-stream");
    const rejected = await thrownBy(() => iterator.throw!(injected));
    assert(
      rejected === injected,
      "throw() did not reject with the injected error",
    );
    const roots = named(await finishedSince(startedAt), "provider.stream");
    assertEqual(roots.length, 1, "provider.stream was never ended");
  },
);

// ---------------------------------------------------------------------------
// K30: direct provider calls keep one trace
// ---------------------------------------------------------------------------

section("K30 direct provider trace");

const TOOL_MODEL = "gemini-2.5-flash";

async function directGeminiProvider() {
  return AIProviderFactory.createProvider(
    PROVIDER,
    TOOL_MODEL,
    false,
    undefined,
    undefined,
    geminiCredentials,
  );
}

await check(
  "K30",
  "a direct provider.generate tool loop with no ambient span stays in one trace",
  async () => {
    const provider = await directGeminiProvider();
    const startedAt = await fresh();
    const calls = { count: 0 };
    await provider.generate({
      input: { text: "look it up" },
      tools: lookupTools(calls),
      maxSteps: 3,
    } as never);
    assertEqual(calls.count, 1, "the tool did not run once");
    const spans = await finishedSince(startedAt);
    assert(named(spans, "step").length >= 2, "the loop did not take two steps");
    assertEqual(
      exportedTraceIds(spans).length,
      1,
      `loop steps were spread over ${exportedTraceIds(spans).length} traces`,
    );
  },
);

await check(
  "K30",
  "a direct provider.stream tool loop with no ambient span stays in one trace",
  async () => {
    const provider = await directGeminiProvider();
    const startedAt = await fresh();
    const calls = { count: 0 };
    const result = await provider.stream({
      input: { text: "look it up" },
      tools: lookupTools(calls),
      maxSteps: 3,
    } as never);
    await drain(result.stream);
    const spans = await finishedSince(startedAt);
    assert(named(spans, "step").length >= 2, "the loop did not take two steps");
    assertEqual(
      exportedTraceIds(spans).length,
      1,
      `loop steps were spread over ${exportedTraceIds(spans).length} traces`,
    );
  },
);

await check(
  "K30",
  "control: under a NeuroLink generate the steps still nest under generate.attempt",
  async () => {
    const startedAt = await fresh();
    const calls = { count: 0 };
    await nl.generate({
      input: { text: "look it up" },
      provider: PROVIDER,
      model: TOOL_MODEL,
      credentials: geminiCredentials,
      tools: lookupTools(calls),
      maxSteps: 3,
      disableInternalFallback: true,
    } as never);
    const spans = await finishedSince(startedAt);
    if (process.env.PROOF_DEBUG) {
      console.log(describeTree(spans));
    }
    const attempts = named(spans, "generate.attempt");
    assertEqual(attempts.length, 1, "expected one generate.attempt");
    const steps = named(spans, "step");
    assert(steps.length >= 2, "the loop did not take two steps");
    for (const step of steps) {
      assertEqual(
        step.parentSpanContext?.spanId,
        attempts[0].spanContext().spanId,
        "a step is not a child of generate.attempt",
      );
    }
    assertEqual(traceIdsOf(spans).length, 1, "NeuroLink split the trace");
  },
);

await check(
  "K30",
  "control: under a host span the steps are children of that span",
  async () => {
    const provider = await directGeminiProvider();
    const startedAt = await fresh();
    const calls = { count: 0 };
    const hostTracer = trace.getTracer("proof-host");
    await hostTracer.startActiveSpan("host.request", async (hostSpan) => {
      try {
        await provider.generate({
          input: { text: "look it up" },
          tools: lookupTools(calls),
          maxSteps: 3,
        } as never);
      } finally {
        hostSpan.end();
      }
    });
    const spans = await finishedSince(startedAt);
    const [host] = named(spans, "host.request");
    const steps = named(spans, "step");
    assert(steps.length >= 2, "the loop did not take two steps");
    for (const step of steps) {
      assertEqual(
        step.parentSpanContext?.spanId,
        host.spanContext().spanId,
        "a step is not a child of the host span",
      );
    }
  },
);

type DirectLoopProvider = {
  name: string;
  model: string;
  credentials: object;
};

const DIRECT_LOOP_PROVIDERS: DirectLoopProvider[] = [
  { name: "openai", model: "gpt-4o-mini", credentials: openaiToolCredentials },
  {
    name: "anthropic",
    model: "claude-sonnet-4-5",
    credentials: anthropicCredentials,
  },
];

async function directLoop(
  target: DirectLoopProvider,
  mode: "generate" | "stream",
  startedAt: () => Promise<number>,
): Promise<{ spans: ReadableSpan[]; toolRuns: number }> {
  const provider = await AIProviderFactory.createProvider(
    target.name,
    target.model,
    false,
    undefined,
    undefined,
    target.credentials as never,
  );
  const since = await startedAt();
  const calls = { count: 0 };
  const request = {
    input: { text: "look it up" },
    tools: lookupTools(calls),
    maxSteps: 3,
  } as never;
  if (mode === "generate") {
    await provider.generate(request);
  } else {
    const result = await provider.stream(request);
    await drain(result.stream);
  }
  return { spans: await finishedSince(since), toolRuns: calls.count };
}

for (const target of DIRECT_LOOP_PROVIDERS) {
  for (const mode of ["generate", "stream"] as const) {
    await check(
      "K30",
      `a direct ${target.name} ${mode} tool loop with no ambient span stays in one trace`,
      async () => {
        const { spans, toolRuns } = await directLoop(target, mode, fresh);
        assertEqual(toolRuns, 1, "the tool did not run once");
        assert(
          named(spans, "step").length >= 2,
          "the loop did not take two steps",
        );
        if (process.env.PROOF_DEBUG) {
          console.log(describeTree(spans));
        }
        assertEqual(
          exportedTraceIds(spans).length,
          1,
          `loop steps were spread over ${exportedTraceIds(spans).length} traces`,
        );
      },
    );

    await check(
      "K30",
      `a direct ${target.name} ${mode} tool loop is rooted at one ${mode} observation that parents every step`,
      async () => {
        const { spans } = await directLoop(target, mode, fresh);
        const roots = named(spans, mode).filter(
          (span) => span.parentSpanContext === undefined,
        );
        assertEqual(roots.length, 1, `expected one ${mode} root`);
        for (const step of named(spans, "step")) {
          assertEqual(
            step.parentSpanContext?.spanId,
            roots[0].spanContext().spanId,
            "a step is not a child of the root",
          );
        }
        for (const model of generations(spans)) {
          assertEqual(model.name, mode, "a model call is named after the call");
        }
      },
    );
  }
}

await check(
  "K30",
  "control: under a NeuroLink generate a direct-loop provider's steps still nest under generate.attempt",
  async () => {
    const startedAt = await fresh();
    const calls = { count: 0 };
    await nl.generate({
      input: { text: "look it up" },
      provider: "openai",
      model: "gpt-4o-mini",
      credentials: openaiToolCredentials,
      tools: lookupTools(calls),
      maxSteps: 3,
      disableInternalFallback: true,
    } as never);
    const spans = await finishedSince(startedAt);
    const attempts = named(spans, "generate.attempt");
    assertEqual(attempts.length, 1, "expected one generate.attempt");
    const steps = named(spans, "step");
    assert(steps.length >= 2, "the loop did not take two steps");
    for (const step of steps) {
      assertEqual(
        step.parentSpanContext?.spanId,
        attempts[0].spanContext().spanId,
        "a step is not a child of generate.attempt",
      );
    }
    assertEqual(exportedTraceIds(spans).length, 1, "NeuroLink split the trace");
  },
);

await check(
  "K30",
  "control: under a host span a direct-loop provider's steps are children of that span",
  async () => {
    const provider = await AIProviderFactory.createProvider(
      "openai",
      "gpt-4o-mini",
      false,
      undefined,
      undefined,
      openaiToolCredentials as never,
    );
    const startedAt = await fresh();
    const calls = { count: 0 };
    await trace
      .getTracer("proof-host")
      .startActiveSpan("host.request", async (hostSpan) => {
        try {
          await provider.generate({
            input: { text: "look it up" },
            tools: lookupTools(calls),
            maxSteps: 3,
          } as never);
        } finally {
          hostSpan.end();
        }
      });
    const spans = await finishedSince(startedAt);
    const [host] = named(spans, "host.request");
    const steps = named(spans, "step");
    assert(steps.length >= 2, "the loop did not take two steps");
    for (const step of steps) {
      assertEqual(
        step.parentSpanContext?.spanId,
        host.spanContext().spanId,
        "a step is not a child of the host span",
      );
    }
    assertEqual(
      named(spans, "generate").filter((span) => !span.parentSpanContext).length,
      0,
      "an orphan root was added under a host span",
    );
  },
);

// ---------------------------------------------------------------------------
// K31: site decision calls without a decision provider
// ---------------------------------------------------------------------------

section("K31 site decisions without a provider");

const QUESTIONS = {
  urgent: { type: "boolean", instructions: "Urgent?" },
} as never;

await check(
  "K31",
  "a site-stamped decision call without a decision provider returns null and reaches decide() once, as in the released build",
  async () => {
    reset();
    const decider = new NeuroLink();
    let decideCalls = 0;
    const realDecide = decider.decide.bind(decider);
    decider.decide = ((options: Parameters<typeof realDecide>[0]) => {
      decideCalls++;
      return realDecide(options);
    }) as typeof decider.decide;
    const answer = await decider.tryDecide({
      site: "routing",
      state: "ticket text",
      questions: QUESTIONS,
    } as never);
    assertEqual(answer, null, "the site call must fail open");
    assertEqual(decideCalls, 1, "decide() was not reached once");
  },
);

await check(
  "K31",
  "a site-stamped decision call without a decision provider records the WARNING decide observation, as in the released build",
  async () => {
    reset();
    const decider = new NeuroLink();
    await decider.tryDecide({
      site: "toolRouting",
      state: "ticket text",
      questions: QUESTIONS,
    } as never);
    const decisions = generations(await finished()).filter(
      (span) => span.name === "decide",
    );
    assertEqual(decisions.length, 1, "expected one decide generation");
    assertEqual(
      decisions[0].attributes["langfuse.observation.level"],
      "WARNING",
      "decide level",
    );
  },
);

await check(
  "K31",
  "a site-stamped decision call without a decision provider runs no host hook and emits no decision event",
  async () => {
    reset();
    let hookCalls = 0;
    const events: string[] = [];
    const decider = new NeuroLink({
      decisionHooks: {
        extendQuestions: () => {
          hookCalls++;
          return undefined;
        },
        onAnswers: () => {
          hookCalls++;
        },
      },
    });
    for (const name of ["decision:before", "decision:after"]) {
      decider.getEventEmitter().on(name, () => events.push(name));
    }
    const answer = await decider.tryDecide({
      site: "routing",
      state: "ticket text",
      questions: QUESTIONS,
    } as never);
    assertEqual(answer, null, "the site call must fail open");
    assertEqual(hookCalls, 0, "a host hook ran for a call with no provider");
    assertEqual(events.length, 0, "a decision event was emitted");
  },
);

await check(
  "K31",
  "control: an unstamped decision call without a provider is still a WARNING decide generation",
  async () => {
    reset();
    const decider = new NeuroLink();
    let decideCalls = 0;
    const realDecide = decider.decide.bind(decider);
    decider.decide = ((options: Parameters<typeof realDecide>[0]) => {
      decideCalls++;
      return realDecide(options);
    }) as typeof decider.decide;
    const answer = await decider.tryDecide({
      state: "ticket text",
      questions: QUESTIONS,
    } as never);
    assertEqual(answer, null, "tryDecide should fail open");
    assertEqual(decideCalls, 1, "decide() was not reached");
    const decisions = generations(await finished()).filter(
      (span) => span.name === "decide",
    );
    assertEqual(decisions.length, 1, "expected one decide generation");
    assertEqual(
      decisions[0].attributes["langfuse.observation.level"],
      "WARNING",
      "decide level",
    );
  },
);

// ---------------------------------------------------------------------------
// K23: stale comments about the in-process span store
// ---------------------------------------------------------------------------

section("K23 stale comments");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return sourceFiles(full);
    }
    return full.endsWith(".ts") ? [full] : [];
  });
}

function commentBlocks(source: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(/^\s*(?:\/\/|\*|\/\*\*?)\s?(.*)$/);
    if (match) {
      current.push(match[1].replace(/\*\/\s*$/, "").trim());
    } else if (current.length > 0) {
      blocks.push(current.join(" ").replace(/\s+/g, " "));
      current = [];
    }
  }
  if (current.length > 0) {
    blocks.push(current.join(" ").replace(/\s+/g, " "));
  }
  return blocks;
}

const STALE_STORE_CLAIMS: RegExp[] = [
  /the global one is what the exporters drain/i,
  /Pipeline B spans\s+land in the same Langfuse trace/i,
  /Pipeline B spans are linked to Pipeline A traces/i,
  /Pipeline B \(Langfuse\) creates a GENERATION/i,
  /for\s+Pipeline B \(Langfuse\)/i,
  /Langfuse \/ Pipeline B exporters/i,
];

await check(
  "K23",
  "no shipped comment says the in-process span store reaches Langfuse or the exporters",
  () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      for (const block of commentBlocks(readFileSync(file, "utf8"))) {
        const claim = STALE_STORE_CLAIMS.find((pattern) => pattern.test(block));
        if (claim) {
          offenders.push(
            `${file.slice(SRC_DIR.length + 1)}: ${block.slice(0, 80)}`,
          );
        }
      }
    }
    assertEqual(
      offenders.length,
      0,
      `stale comments remain: ${offenders.join(" | ")}`,
    );
  },
);

await check(
  "K23",
  "the dual recordSpan in decide() says the store is in-process and not exported",
  () => {
    const source = readFileSync(join(SRC_DIR, "neurolink.ts"), "utf8");
    const at = source.indexOf("getMetricsAggregator().recordSpan(ended);");
    assert(at > 0, "the dual recordSpan call was not found");
    const comment = source.slice(Math.max(0, at - 900), at);
    assert(
      /in-process/i.test(comment) &&
        /not exported|never exported/i.test(comment),
      "the comment above the dual recordSpan does not describe an in-process, unexported store",
    );
  },
);

await check(
  "K23",
  "control: the in-process store is still written (instance and global aggregators see a generation)",
  async () => {
    const recorder = new NeuroLink();
    await recorder.generate(openaiRequest("gpt-4o-mini"));
    assert(
      recorder.getSpans().length > 0,
      "the instance aggregator recorded nothing",
    );
    assert(
      getMetricsAggregator().getSpans().length > 0,
      "the global aggregator recorded nothing",
    );
  },
);

await openai.close();
await gemini.close();
await openaiTools.close();
await anthropicTools.close();
await runSuite();
