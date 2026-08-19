#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — agentic-loop engine primitives (Plan 08, rule 15
 * determinism exception).
 *
 * ALL-SRC module graph (rule 15): every import below resolves to
 * `../src/...`. This is the deliberate, documented exception to rule 15's
 * "one module graph per suite, end-to-end tests only" mandate. The three
 * modules under test — `src/lib/core/streamChannel.ts`,
 * `src/lib/core/nativeToolFormat.ts` (added by Task 2), and
 * `src/lib/core/loopEngine.ts` (added by Task 3) — have no exported surface
 * at all: none of them is reachable through package.json's `exports` map
 * (`.`, `./client`, `./types`, `./cli`, `./server`, `./browser`, ... — no
 * entry resolves into `src/lib/core/`), and as of this PR nothing outside
 * their own tests imports them either — no provider is migrated onto the
 * engine yet (that is Tasks 4-9, later PRs). Concretely, this suite asserts
 * facts no live or mocked `generate()`/`stream()` call can deterministically
 * produce:
 *
 *   - `streamChannel`'s exact push/drain/close/error ordering, including
 *     producer-ahead-of-consumer and consumer-ahead-of-producer interleaving
 *     — an internal queue/backpressure contract, not an HTTP response shape.
 *   - `nativeToolFormat`'s two wire-format branches (`input_schema` vs.
 *     `functionDeclarations`) compared directly against each other for the
 *     same input tool set — a conversion-function contract, not something
 *     any single provider response exposes.
 *   - `loopEngine`'s per-step retry-call counts against a hand-written fake
 *     adapter, and — most importantly — `PostEmissionStepError`'s
 *     unwrap-in-both-directions behavior (a retryable error before any chunk
 *     is emitted DOES retry; the identical error after a chunk has already
 *     been pushed to the channel does NOT retry and surfaces the original,
 *     unwrapped error). No provider is wired to the engine yet, so there is
 *     no live call that could exercise this at all.
 *
 * No API keys, no network, no LLM.
 *
 * Run: npx tsx test/continuous-test-suite-loop-engine.ts
 *      pnpm run test:loop-engine
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { createStreamChannel } from "../src/lib/core/streamChannel.js";
import { toNativeToolDeclarations } from "../src/lib/core/nativeToolFormat.js";
import { runAgenticLoop } from "../src/lib/core/loopEngine.js";
import type {
  AgenticLoopAdapter,
  AgenticLoopStepResult,
  Tool,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Agentic loop engine primitives");

function mkTool(
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
  extra: { cacheControl?: boolean } = {},
): Tool {
  return {
    description,
    inputSchema: {
      type: "object",
      properties,
      required,
    } as unknown as Tool["inputSchema"],
    ...(extra.cacheControl
      ? {
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        }
      : {}),
  } as unknown as Tool;
}

async function drain<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const value of iterable) {
    out.push(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Section 1: streamChannel — push/drain ordering
// ---------------------------------------------------------------------------

await test("streamChannel delivers pushed values in order then closes", async () => {
  const channel = createStreamChannel<{ content: string }>();
  channel.push({ content: "a" });
  channel.push({ content: "b" });
  channel.close();
  const values = await drain(channel.iterable);
  assertEqual(
    values.map((v) => v.content).join(","),
    "a,b",
    "push order preserved",
  );
});

await test("streamChannel supports interleaved push-then-drain (consumer ahead of producer)", async () => {
  const channel = createStreamChannel<{ content: string }>();
  const collected: string[] = [];
  const consumerDone = (async () => {
    for await (const value of channel.iterable) {
      collected.push(value.content);
    }
  })();
  channel.push({ content: "first" });
  await new Promise((r) => setTimeout(r, 5));
  channel.push({ content: "second" });
  channel.close();
  await consumerDone;
  assertEqual(
    collected.join(","),
    "first,second",
    "consumer-ahead-of-producer delivery",
  );
});

await test("streamChannel.error() propagates as a thrown error to the consumer", async () => {
  const channel = createStreamChannel<{ content: string }>();
  channel.push({ content: "before-error" });
  channel.error(new Error("boom"));
  let threw = false;
  try {
    await drain(channel.iterable);
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message === "boom",
      "error propagated with original message",
    );
  }
  assert(threw, "consumer observed the error");
});

await test("streamChannel with zero pushes and an immediate close drains empty", async () => {
  const channel = createStreamChannel<{ content: string }>();
  channel.close();
  const values = await drain(channel.iterable);
  assertEqual(values.length, 0, "no values delivered");
});

// ---------------------------------------------------------------------------
// Section 2: nativeToolFormat — toNativeToolDeclarations wire-format branches
// ---------------------------------------------------------------------------

await test("toNativeToolDeclarations: input_schema and functionDeclarations agree on tool names for the same input", async () => {
  const tools: Record<string, Tool> = {
    get_weather: mkTool("Get the weather", {
      city: { type: "string" },
    }),
    search_docs: mkTool("Search documents", {
      query: { type: "string" },
    }),
  };

  const anthropicDecls = toNativeToolDeclarations(tools, "input_schema");
  const geminiResult = toNativeToolDeclarations(tools, "functionDeclarations");

  assert(!!anthropicDecls, "input_schema branch returns declarations");
  assertEqual(
    (anthropicDecls ?? [])
      .map((d) => d.name)
      .sort()
      .join(","),
    "get_weather,search_docs",
    "input_schema declares both tool names",
  );
  assertEqual(
    geminiResult.toolsConfig[0].functionDeclarations
      .map((d) => d.name)
      .sort()
      .join(","),
    "get_weather,search_docs",
    "functionDeclarations declares both tool names (safe names, unchanged for already-safe input)",
  );
});

await test("toNativeToolDeclarations: input_schema converts the JSON-schema shape (properties + required preserved)", async () => {
  const tools: Record<string, Tool> = {
    get_weather: mkTool("Get the weather", { city: { type: "string" } }, [
      "city",
    ]),
  };
  const decls = toNativeToolDeclarations(tools, "input_schema");
  const decl = (decls ?? [])[0];
  assert(!!decl, "declaration produced");
  assertEqual(decl.name, "get_weather", "name preserved");
  assertEqual(decl.input_schema.type, "object", "input_schema.type preserved");
  const props = decl.input_schema.properties as Record<string, unknown>;
  assert(!!props?.city, "input_schema.properties.city preserved");
  assertEqual(
    (decl.input_schema.required as string[])?.[0],
    "city",
    "input_schema.required preserved",
  );
});

await test("toNativeToolDeclarations: input_schema honors an ephemeral cache_control breakpoint", async () => {
  const tools: Record<string, Tool> = {
    last_tool: mkTool(
      "Last tool in the request",
      { q: { type: "string" } },
      [],
      { cacheControl: true },
    ),
  };
  const decls = toNativeToolDeclarations(tools, "input_schema");
  const decl = (decls ?? [])[0];
  assert(!!decl, "declaration produced");
  assertEqual(
    decl.cache_control?.type,
    "ephemeral",
    "cache_control breakpoint carried through to the native declaration",
  );
});

await test("toNativeToolDeclarations: input_schema returns undefined for an empty tool record", async () => {
  const decls = toNativeToolDeclarations({}, "input_schema");
  assertEqual(decls, undefined, "no declarations for an empty record");
});

await test("toNativeToolDeclarations: functionDeclarations returns a well-formed empty result for an empty tool record", async () => {
  const result = toNativeToolDeclarations({}, "functionDeclarations");
  assertEqual(
    result.toolsConfig[0].functionDeclarations.length,
    0,
    "empty functionDeclarations array",
  );
  assertEqual(result.executeMap.size, 0, "empty executeMap");
  assertEqual(result.originalNameMap.size, 0, "empty originalNameMap");
});

// ---------------------------------------------------------------------------
// Section 3: loopEngine — runAgenticLoop driven by a fake adapter
// ---------------------------------------------------------------------------

type FakeConversation = { turns: string[] };

function fakeAdapter(
  steps: Array<AgenticLoopStepResult<unknown>>,
  overrides: Partial<AgenticLoopAdapter<FakeConversation>> = {},
): AgenticLoopAdapter<FakeConversation> {
  let stepIndex = 0;
  return {
    providerLabel: "fake",
    maxSteps: 10,
    buildStepRequest: (conversation) => ({ raw: conversation }),
    executeStep: async (_request, channel) => {
      const result = steps[Math.min(stepIndex, steps.length - 1)];
      stepIndex++;
      if (result.text) {
        channel.push({ content: result.text });
      }
      return result;
    },
    buildToolResultMessages: (conversation, _stepResult, toolResults) => ({
      turns: [
        ...conversation.turns,
        // JSON.stringify, not String(): tool outputs from the not-found and
        // breaker-tripped paths are plain objects (e.g. {error, status,
        // do_not_retry}), and String({...}) collapses to the useless
        // "[object Object]" — losing exactly the "permanently_failed" /
        // "TOOL_NOT_FOUND" text the breaker tests below assert on.
        ...toolResults.map((r) => `tool:${r.name}=${JSON.stringify(r.output)}`),
      ],
    }),
    mapFinishReason: (raw, hadToolCalls) =>
      hadToolCalls ? "tool-calls" : raw === "MAX_TOKENS" ? "length" : "stop",
    ...overrides,
  };
}

async function drainChunks(
  iterable: AsyncIterable<{ content: string }>,
): Promise<string> {
  let out = "";
  for await (const chunk of iterable) {
    out += chunk.content;
  }
  return out;
}

await test("runAgenticLoop: single step, no tool calls, resolves immediately", async () => {
  const adapter = fakeAdapter([
    {
      text: "hello world",
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 2 },
      rawStopReason: "end_turn",
      raw: undefined,
    },
  ]);
  const { stream, resultPromise } = runAgenticLoop(adapter, { turns: [] }, {});
  const text = await drainChunks(stream);
  const result = await resultPromise;
  assertEqual(
    text,
    "hello world",
    "streamed text matches the single step's output",
  );
  assertEqual(
    result.finishReason,
    "stop",
    "finishReason resolved via adapter.mapFinishReason",
  );
  assertEqual(result.usage.inputTokens, 5, "usage accumulated from the step");
});

await test("runAgenticLoop: tool-call round trip across two steps", async () => {
  const tools = {
    add_numbers: {
      description: "add",
      execute: async (args: { a: number; b: number }) => args.a + args.b,
    },
  };
  const adapter = fakeAdapter([
    {
      text: "",
      toolCalls: [{ id: "call_1", name: "add_numbers", args: { a: 2, b: 3 } }],
      usage: { inputTokens: 10, outputTokens: 4 },
      rawStopReason: "tool_use",
      raw: undefined,
    },
    {
      text: "the answer is 5",
      toolCalls: [],
      usage: { inputTokens: 12, outputTokens: 6 },
      rawStopReason: "end_turn",
      raw: undefined,
    },
  ]);
  const { stream, resultPromise } = runAgenticLoop(
    adapter,
    { turns: [] },
    { tools },
  );
  const text = await drainChunks(stream);
  const result = await resultPromise;
  assertEqual(text, "the answer is 5", "final step's text streamed through");
  assertEqual(result.toolCalls.length, 1, "one tool call recorded");
  assertEqual(result.toolCalls[0].name, "add_numbers", "tool name recorded");
  assertEqual(
    result.toolExecutions[0].output,
    5,
    "tool actually executed (2+3=5)",
  );
  assertEqual(
    result.usage.inputTokens,
    22,
    "usage summed across both steps (10+12)",
  );
  assertEqual(
    result.usage.outputTokens,
    10,
    "output usage summed across both steps (4+6)",
  );
});

await test("runAgenticLoop: TOOL_NOT_FOUND without a breaker produces one error result and continues (Anthropic/Bedrock semantics)", async () => {
  const adapter = fakeAdapter([
    {
      text: "",
      toolCalls: [{ id: "call_1", name: "missing_tool", args: {} }],
      usage: { inputTokens: 1, outputTokens: 1 },
      rawStopReason: "tool_use",
      raw: undefined,
    },
    {
      text: "done",
      toolCalls: [],
      usage: { inputTokens: 1, outputTokens: 1 },
      rawStopReason: "end_turn",
      raw: undefined,
    },
  ]);
  const { resultPromise } = runAgenticLoop(
    adapter,
    { turns: [] },
    { tools: {} },
  );
  const result = await resultPromise;
  const toolTurn = result.conversation.turns.find((t) =>
    t.startsWith("tool:missing_tool="),
  );
  assert(
    toolTurn !== undefined,
    "a single error tool-result turn was appended, no breaker without adapter.toolFailureBreaker",
  );
});

await test("runAgenticLoop: TOOL_NOT_FOUND without a breaker never trips the breaker's count-based branch (missing-tool path can't reach it)", async () => {
  // failedTools is only incremented in the tool-execution catch block, and
  // the missing-tool path returns before ever reaching it — so a breaker
  // config alone proves nothing about maxRetries unless the tool actually
  // exists and its execute() fails. See the test below for that case.
  const stepWithMissingTool: AgenticLoopStepResult<unknown> = {
    text: "",
    toolCalls: [{ id: "call_x", name: "missing_tool", args: {} }],
    usage: { inputTokens: 1, outputTokens: 1 },
    rawStopReason: "tool_use" as const,
    raw: undefined,
  };
  const finalStep: AgenticLoopStepResult<unknown> = {
    text: "gave up",
    toolCalls: [],
    usage: { inputTokens: 1, outputTokens: 1 },
    rawStopReason: "end_turn" as const,
    raw: undefined,
  };
  const adapter = fakeAdapter([stepWithMissingTool, finalStep], {
    toolFailureBreaker: { maxRetries: 1 },
  });
  const { resultPromise } = runAgenticLoop(
    adapter,
    { turns: [] },
    { tools: {} },
  );
  const result = await resultPromise;
  const notFoundTurn = result.conversation.turns.find((t) =>
    t.includes("TOOL_NOT_FOUND"),
  );
  assert(
    notFoundTurn !== undefined,
    "missing tool reported TOOL_NOT_FOUND on the very first call, before any breaker count is consulted",
  );
});

await test("runAgenticLoop: tool failure breaker trips after maxRetries and stops re-invoking the failing tool (Gemini semantics)", async () => {
  // Unlike TOOL_NOT_FOUND, a real registered tool whose execute() throws
  // DOES increment failedTools, so this is the only path that can actually
  // exercise the maxRetries count. With maxRetries: 1, the tool must run
  // exactly once (the attempt that trips the breaker) — every subsequent
  // call is short-circuited to permanently_failed without invoking execute
  // again.
  let executeAttempts = 0;
  const tools = {
    flaky_tool: {
      description: "always fails",
      execute: async () => {
        executeAttempts++;
        throw new Error("boom");
      },
    },
  };
  const callFlakyTool: AgenticLoopStepResult<unknown> = {
    text: "",
    toolCalls: [{ id: "call_flaky", name: "flaky_tool", args: {} }],
    usage: { inputTokens: 1, outputTokens: 1 },
    rawStopReason: "tool_use" as const,
    raw: undefined,
  };
  const finalStep: AgenticLoopStepResult<unknown> = {
    text: "gave up",
    toolCalls: [],
    usage: { inputTokens: 1, outputTokens: 1 },
    rawStopReason: "end_turn" as const,
    raw: undefined,
  };
  const adapter = fakeAdapter(
    [callFlakyTool, callFlakyTool, callFlakyTool, finalStep],
    { toolFailureBreaker: { maxRetries: 1 } },
  );
  const { resultPromise } = runAgenticLoop(adapter, { turns: [] }, { tools });
  const result = await resultPromise;
  const permanentlyFailedTurns = result.conversation.turns.filter((t) =>
    t.includes("TOOL_PERMANENTLY_FAILED"),
  );
  assertEqual(
    executeAttempts,
    1,
    "flaky_tool.execute ran exactly once — the breaker short-circuited every call after the cap was hit",
  );
  assertEqual(
    permanentlyFailedTurns.length,
    2,
    "the two calls after the cap were both marked permanently_failed",
  );
  assert(
    permanentlyFailedTurns.every((t) =>
      t.includes('"status":"permanently_failed"'),
    ),
    "permanently_failed turns carry the permanently_failed status",
  );
});

await test("runAgenticLoop: respects maxSteps and stops without a final answer", async () => {
  const alwaysToolCall: AgenticLoopStepResult<unknown> = {
    text: "",
    toolCalls: [{ id: "call_loop", name: "noop", args: {} }],
    usage: { inputTokens: 1, outputTokens: 1 },
    rawStopReason: "tool_use" as const,
    raw: undefined,
  };
  const tools = { noop: { description: "noop", execute: async () => "ok" } };
  const adapter: AgenticLoopAdapter<FakeConversation> = {
    ...fakeAdapter([alwaysToolCall]),
    maxSteps: 3,
  };
  const { resultPromise } = runAgenticLoop(adapter, { turns: [] }, { tools });
  const result = await resultPromise;
  assertEqual(
    result.finishReason,
    "tool-calls",
    "step-cap exit maps to tool-calls, mirroring today's providers",
  );
});

await test("runAgenticLoop: retries a pre-first-chunk 429 once and succeeds on the second attempt", async () => {
  let calls = 0;
  const finalStep: AgenticLoopStepResult<unknown> = {
    text: "recovered",
    toolCalls: [],
    usage: { inputTokens: 3, outputTokens: 2 },
    rawStopReason: "end_turn",
    raw: undefined,
  };
  const adapter: AgenticLoopAdapter<FakeConversation> = {
    ...fakeAdapter([finalStep]),
    executeStep: async (_request, channel) => {
      calls++;
      if (calls === 1) {
        // retryAfterMs:0 keeps withProviderRetry's backoff sleep at 0ms so
        // this test doesn't actually wait out its floor delay.
        throw Object.assign(new Error("rate limited"), {
          statusCode: 429,
          retryAfterMs: 0,
        });
      }
      // Unlike the default fakeAdapter's executeStep, this override must
      // push the successful step's text itself — the assertion below reads
      // from the stream (drainChunks), not from result.text.
      channel.push({ content: finalStep.text });
      return finalStep;
    },
  };
  const { stream, resultPromise } = runAgenticLoop(adapter, { turns: [] }, {});
  const text = await drainChunks(stream);
  const result = await resultPromise;
  assertEqual(
    calls,
    2,
    "executeStep was retried exactly once after the pre-first-chunk 429",
  );
  assertEqual(
    text,
    "recovered",
    "the successful retry's text streamed through",
  );
  assertEqual(
    result.finishReason,
    "stop",
    "loop completed normally after the retry",
  );
});

await test("runAgenticLoop: does NOT retry a 429 that arrives after this step already streamed a chunk", async () => {
  let calls = 0;
  const adapter: AgenticLoopAdapter<FakeConversation> = {
    ...fakeAdapter([]),
    executeStep: async (_request, channel) => {
      calls++;
      channel.push({ content: "partial" });
      throw Object.assign(new Error("rate limited mid-step"), {
        statusCode: 429,
        retryAfterMs: 0,
      });
    },
  };
  const { stream, resultPromise } = runAgenticLoop(adapter, { turns: [] }, {});
  const drainOutcome = drainChunks(stream).catch((err) => err);
  let rejected = false;
  let rejectionMessage = "";
  try {
    await resultPromise;
  } catch (err) {
    rejected = true;
    rejectionMessage = err instanceof Error ? err.message : String(err);
  }
  await drainOutcome;
  assert(
    rejected,
    "resultPromise rejects instead of silently retrying past already-streamed content",
  );
  assertEqual(
    calls,
    1,
    "executeStep was called exactly once — no retry once a chunk had already reached the consumer",
  );
  assertEqual(
    rejectionMessage,
    "rate limited mid-step",
    "the original error surfaces unwrapped, not the internal PostEmissionStepError sentinel",
  );
});

await test("runAgenticLoop: a stream-only consumer observes the failure — the stream iteration itself rejects, not just resultPromise (regression pin: close-before-error ordering)", async () => {
  // A caller that only cares about tokens (e.g. piping to a UI) may never
  // await resultPromise at all. This pins the bug where `finally` closed
  // the channel before the `.catch` marked it as errored, so a consumer
  // parked on `stream` alone would resume on close(), see done===true with
  // no fatalError yet set, and return normally — silently truncating a
  // failed turn into what looked like a successful one.
  const adapter: AgenticLoopAdapter<FakeConversation> = {
    ...fakeAdapter([]),
    executeStep: async (_request, channel) => {
      channel.push({ content: "partial-before-failure" });
      throw new Error("step failed after emitting a chunk");
    },
  };
  const { stream, resultPromise } = runAgenticLoop(adapter, { turns: [] }, {});

  // Not part of what's under test (that's the `stream` iteration below) —
  // attached only so this test doesn't crash the process on an unhandled
  // rejection while resultPromise settles in the background.
  resultPromise.catch(() => {});

  let streamThrew = false;
  let streamErrorMessage = "";
  try {
    await drainChunks(stream);
  } catch (err) {
    streamThrew = true;
    streamErrorMessage = err instanceof Error ? err.message : String(err);
  }
  assert(
    streamThrew,
    "a consumer iterating only `stream` observed the failure instead of a clean end of stream",
  );
  assertEqual(
    streamErrorMessage,
    "step failed after emitting a chunk",
    "the stream-only consumer sees the original error",
  );

  // Both consumers must learn of the same failure — confirm resultPromise
  // still rejects too, independent of whether anything reads the stream.
  let resultRejected = false;
  try {
    await resultPromise;
  } catch {
    resultRejected = true;
  }
  assert(resultRejected, "resultPromise also rejects for the same failure");
});

await runSuite();
