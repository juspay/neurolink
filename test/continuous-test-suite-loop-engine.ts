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
 * `src/lib/core/nativeToolFormat.ts` (added by Task 2),
 * `src/lib/core/loopEngine.ts` (added by Task 3), and `BaseProvider`'s
 * default `executeStream` (added by Task 5) — have no exported surface
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
 *   - `BaseProvider`'s default `executeStream`, which only exists for
 *     subclasses that implement the optional `doStream` hook. `BaseProvider`
 *     is abstract and never constructed by callers, so there is no shipped
 *     surface that reaches the default at all until a provider adopts it
 *     (Task 6, SageMaker). This suite builds minimal fake subclasses so the
 *     contract is pinned before anything depends on it.
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
import { BaseProvider } from "../src/lib/core/baseProvider.js";
import type { AIProviderName } from "../src/lib/constants/enums.js";
import type { StreamOptions } from "../src/lib/types/index.js";
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

// ---------------------------------------------------------------------------
// BaseProvider's default executeStream (Plan 08, Task 5)
// ---------------------------------------------------------------------------

/** The smallest subclass that satisfies BaseProvider's remaining abstracts. */
abstract class FakeProviderBase extends BaseProvider {
  protected getProviderName(): AIProviderName {
    return "fake" as AIProviderName;
  }
  protected getDefaultModel(): string {
    return "fake-model";
  }
  public getAISDKModel(): never {
    throw new Error("not used by these cases");
  }
  protected formatProviderError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}

class WorkingDoStreamProvider extends FakeProviderBase {
  protected async doStream(_options: StreamOptions) {
    async function* chunks() {
      yield { content: "hello " };
      yield { content: "world" };
    }
    return {
      stream: chunks(),
      finishReason: Promise.resolve("stop"),
      usage: Promise.resolve({ inputTokens: 3, outputTokens: 2 }),
      warnings: [],
    };
  }
}

class ThrowingDoStreamProvider extends FakeProviderBase {
  protected async doStream(_options: StreamOptions): Promise<never> {
    throw new Error("synthetic doStream failure");
  }
}

/** Implements neither doStream nor an executeStream override. */
class NoStreamProvider extends FakeProviderBase {}

await test("the default executeStream streams a doStream provider's chunks", async () => {
  const provider = new WorkingDoStreamProvider("fake-model");
  const result = await provider.stream({ input: { text: "hi there" } });
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.content ?? "";
  }
  assertEqual(
    text,
    "hello world",
    "streamed text did not match doStream's chunks",
  );
});

await test("the default executeStream reports finishReason and usage from doStream's promises", async () => {
  const provider = new WorkingDoStreamProvider("fake-model");
  const result = await provider.stream({ input: { text: "hi there" } });
  for await (const chunk of result.stream) {
    void chunk;
  }
  const analytics = await result.analytics;
  assertEqual(
    analytics?.tokenUsage?.output,
    2,
    "usage was not the value doStream's promise resolved to",
  );
  assertEqual(
    result.metadata?.finishReason,
    "stop",
    "finishReason was not the value doStream's promise resolved to",
  );
});

await test("analytics settles even when the consumer never drains the stream", async () => {
  // Binding analytics to the stream iterator's finally block is the natural
  // shape and the wrong one: a generator body does not run until iterated, so
  // a caller that awaits analytics without consuming the stream waits
  // forever. That exact bug shipped in the Bedrock provider and is pinned
  // here so the shared default cannot reintroduce it.
  const provider = new WorkingDoStreamProvider("fake-model");
  const result = await provider.stream({ input: { text: "hi there" } });
  // The timer is cleared rather than left pending: an uncleared timeout keeps
  // the event loop alive and holds the suite open for its full duration after
  // the assertion has already passed.
  let timer: NodeJS.Timeout | undefined;
  const settled = await Promise.race([
    Promise.resolve(result.analytics).then(() => "SETTLED"),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve("TIMED_OUT"), 10_000);
    }),
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
  assertEqual(settled, "SETTLED", "analytics never settled without a drain");
});

await test("a doStream rejection propagates instead of being swallowed", async () => {
  const provider = new ThrowingDoStreamProvider("fake-model");
  let threw = false;
  try {
    const result = await provider.stream({ input: { text: "hi" } });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    threw = true;
  }
  assert(
    threw,
    "a doStream rejection must propagate, not be silently swallowed",
  );
});

await test("a provider with neither doStream nor an override never yields a silent empty stream", async () => {
  // The default's throw is deliberately not asserted on here. `stream()`
  // re-throws only a small allowlist (abort/timeout/401/403/quota/rate
  // limit/authentication) and falls back to fake streaming for everything
  // else, so this provider degrades through generate() rather than
  // surfacing the configuration error — which is the intended behaviour,
  // and why the default's message shows up in logs rather than to the
  // caller. What must never happen is the third outcome: a clean, empty,
  // apparently-successful stream that silently produces nothing.
  const provider = new NoStreamProvider("fake-model");
  let failed = false;
  let chunkCount = 0;
  try {
    const result = await provider.stream({ input: { text: "hi" } });
    for await (const chunk of result.stream) {
      chunkCount++;
      void chunk;
    }
  } catch {
    failed = true;
  }
  assert(
    failed || chunkCount > 0,
    "a provider that cannot stream produced a silent empty success",
  );
});

// ---------------------------------------------------------------------------
// resolveToolOnMiss hydration hook (Plan 08, Task 7)
// ---------------------------------------------------------------------------

function makeHydrationAdapter(config: {
  toolCallsByStep: Array<
    Array<{ id: string; name: string; args: Record<string, unknown> }>
  >;
  resolveToolOnMiss?: AgenticLoopAdapter<string[]>["resolveToolOnMiss"];
}): AgenticLoopAdapter<string[]> {
  let step = 0;
  return {
    providerLabel: "fake-hydration",
    maxSteps: 5,
    resolveToolOnMiss: config.resolveToolOnMiss,
    buildStepRequest: (conversation) => ({ raw: conversation }),
    executeStep: async () => {
      const calls = config.toolCallsByStep[step] ?? [];
      step++;
      return {
        text: calls.length === 0 ? "final answer" : "",
        toolCalls: calls,
        usage: { inputTokens: 1, outputTokens: 1 },
        rawStopReason: calls.length === 0 ? "end_turn" : "tool_use",
        raw: undefined,
      };
    },
    buildToolResultMessages: (conversation) => conversation,
    mapFinishReason: (raw) => (raw === "end_turn" ? "stop" : "tool-calls"),
  };
}

await test("a tool call absent from options.tools is hydrated rather than failing as TOOL_NOT_FOUND", async () => {
  let hydratedArgs: Record<string, unknown> | undefined;
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [
      [{ id: "call_1", name: "discovered_tool", args: { q: "x" } }],
      [],
    ],
    resolveToolOnMiss: (name) =>
      name === "discovered_tool"
        ? {
            execute: async (args) => {
              hydratedArgs = args;
              return { ok: true };
            },
          }
        : undefined,
  });
  const { resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
  const result = await resultPromise;
  assertEqual(hydratedArgs?.q, "x", "hydrated execute got the call's args");
  const executed = result.toolExecutions.find(
    (e) => e.name === "discovered_tool",
  );
  assert(
    executed !== undefined &&
      !("error" in ((executed.output ?? {}) as Record<string, unknown>)),
    "a hydrated tool call must not be recorded as a failed execution",
  );
});

await test("resolveToolOnMiss is not consulted when the name is already executable", async () => {
  let consulted = false;
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [[{ id: "call_1", name: "known_tool", args: {} }], []],
    resolveToolOnMiss: () => {
      consulted = true;
      return undefined;
    },
  });
  const { resultPromise } = runAgenticLoop(adapter, [], {
    tools: { known_tool: { execute: async () => ({ ok: true }) } },
  });
  await resultPromise;
  assert(
    !consulted,
    "resolveToolOnMiss must only be consulted on a miss, not for an executable tool",
  );
});

await test("a declared-but-unexecutable tool is treated as a miss and hydrated", async () => {
  // A deferred-catalog placeholder is present under its name but carries no
  // execute. The engine's own guard already treats that as absent, so
  // hydration has to reach it too, or the very shape this hook exists for
  // would fall straight through to TOOL_NOT_FOUND.
  let hydrated = false;
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [[{ id: "call_1", name: "deferred_tool", args: {} }], []],
    resolveToolOnMiss: (name) =>
      name === "deferred_tool"
        ? {
            execute: async () => {
              hydrated = true;
              return { ok: true };
            },
          }
        : undefined,
  });
  const { resultPromise } = runAgenticLoop(adapter, [], {
    // Declared, but with nothing to run — the deferred-catalog shape.
    tools: { deferred_tool: {} },
  });
  await resultPromise;
  assert(hydrated, "a declared-but-unexecutable tool was not hydrated");
});

// ---------------------------------------------------------------------------
// Terminal tool-call pattern needs no engine change (Task 7 proof)
// ---------------------------------------------------------------------------

await test("an adapter that omits a terminal call from toolCalls ends the turn via the existing zero-toolCalls path", async () => {
  // Proves a design decision rather than new production code: Tasks 8 and 11
  // mark a detected `final_result` terminal by leaving it out of `toolCalls`
  // and putting its parsed payload in `text`. If that works against the
  // engine as it stands, those tasks need no contract change.
  const adapter: AgenticLoopAdapter<string[]> = {
    providerLabel: "fake-terminal",
    maxSteps: 5,
    buildStepRequest: (conversation) => ({ raw: conversation }),
    executeStep: async () => ({
      text: JSON.stringify({ answer: 42 }),
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
      rawStopReason: "tool_use",
      raw: undefined,
    }),
    buildToolResultMessages: (conversation) => conversation,
    mapFinishReason: () => "stop",
  };
  const { resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
  const result = await resultPromise;
  assertEqual(
    result.text,
    JSON.stringify({ answer: 42 }),
    "a terminal step's parsed text became the turn's final text",
  );
  assertEqual(
    result.toolCalls.length,
    0,
    "a terminal call must not appear in the turn's toolCalls",
  );
  assertEqual(
    result.toolExecutions.length,
    0,
    "a terminal call must not be dispatched or recorded as an execution",
  );
});

// ---------------------------------------------------------------------------
// Reasoning chunks survive the engine's channel
// ---------------------------------------------------------------------------

await test("a reasoning delta pushed by an adapter reaches the consumer", async () => {
  // Extended-thinking providers (direct Anthropic, AI Studio, Vertex) emit a
  // chunk whose `content` is empty and whose thinking delta rides in
  // `reasoning`. A channel typed `{ content: string }` drops that field
  // silently — the text path keeps working, so the loss would only show up as
  // missing thinking output for every one of those providers at once, which
  // is exactly what Tasks 8-11 would have shipped.
  const adapter: AgenticLoopAdapter<string[]> = {
    providerLabel: "fake-reasoning",
    maxSteps: 2,
    buildStepRequest: (conversation) => ({ raw: conversation }),
    executeStep: async (_request, channel) => {
      channel.push({ content: "", reasoning: "thinking out loud" });
      channel.push({ content: "the answer" });
      return {
        text: "the answer",
        reasoning: "thinking out loud",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1 },
        rawStopReason: "end_turn",
        raw: undefined,
      };
    },
    buildToolResultMessages: (conversation) => conversation,
    mapFinishReason: () => "stop",
  };
  const { stream, resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
  const chunks: Array<{ content: string; reasoning?: string }> = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  await resultPromise;
  assert(
    chunks.some((c) => c.reasoning === "thinking out loud"),
    "the reasoning delta was dropped on its way through the engine channel",
  );
  assert(
    chunks.some((c) => c.content === "the answer"),
    "the text chunk did not survive alongside the reasoning chunk",
  );
});

await test("a successful execution records the call id and no error", async () => {
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [
      [{ id: "call_abc", name: "ok_tool", args: { q: 1 } }],
      [],
    ],
  });
  const { resultPromise } = runAgenticLoop(adapter, [], {
    tools: {
      ok_tool: {
        execute: async () => ({ ok: true }),
      },
    },
  });
  const result = await resultPromise;
  const record = result.toolExecutions.find((e) => e.name === "ok_tool");
  assertEqual(
    record?.id,
    "call_abc",
    "a successful execution must carry the provider's tool-call id",
  );
  assertEqual(
    record?.error,
    undefined,
    "a successful execution must not be recorded with an error",
  );
});

await test("a throwing tool records the call id and its error message", async () => {
  // Providers store a failed tool result differently from a successful one,
  // so the engine has to say which it was. Without `error` a migrated loop
  // would persist every failure as if it had succeeded.
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [[{ id: "call_bad", name: "bad_tool", args: {} }], []],
  });
  const { resultPromise } = runAgenticLoop(adapter, [], {
    tools: {
      bad_tool: {
        execute: async () => {
          throw new Error("upstream unavailable");
        },
      },
    },
  });
  const result = await resultPromise;
  const record = result.toolExecutions.find((e) => e.name === "bad_tool");
  assertEqual(
    record?.id,
    "call_bad",
    "a failed execution must still carry the tool-call id",
  );
  assert(
    typeof record?.error === "string" && record.error.length > 0,
    "a failed execution must be recorded with an error message",
  );
});

await test("an unresolvable tool name is recorded with an id and an error", async () => {
  const adapter = makeHydrationAdapter({
    toolCallsByStep: [
      [{ id: "call_missing", name: "nowhere_tool", args: {} }],
      [],
    ],
  });
  const { resultPromise } = runAgenticLoop(adapter, [], { tools: {} });
  const result = await resultPromise;
  const record = result.toolExecutions.find((e) => e.name === "nowhere_tool");
  assertEqual(
    record?.id,
    "call_missing",
    "an unresolved call must still carry the tool-call id",
  );
  assert(
    typeof record?.error === "string" && record.error.length > 0,
    "an unresolved call must be recorded with an error message",
  );
});

await test("the engine's breaker dispatches an always-failing tool exactly twice at maxRetries 2", async () => {
  // Task 9 prerequisite, proven rather than assumed. AI Studio's own
  // dispatcher stops after DEFAULT_TOOL_MAX_RETRIES (2) failures, which the
  // characterization suite measured end-to-end as attempts=2 across 4 model
  // calls. Migrating that loop onto this engine is only safe if the engine
  // reproduces the same count from the same threshold.
  let attempts = 0;
  const adapter: AgenticLoopAdapter<string[]> = {
    ...makeHydrationAdapter({
      toolCallsByStep: [
        [{ id: "c1", name: "flaky", args: {} }],
        [{ id: "c2", name: "flaky", args: {} }],
        [{ id: "c3", name: "flaky", args: {} }],
        [{ id: "c4", name: "flaky", args: {} }],
        [],
      ],
    }),
    toolFailureBreaker: { maxRetries: 2 },
  };
  const { resultPromise } = runAgenticLoop(adapter, [], {
    tools: {
      flaky: {
        execute: async () => {
          attempts++;
          throw new Error("synthetic tool failure");
        },
      },
    },
  });
  const result = await resultPromise;
  assertEqual(
    attempts,
    2,
    "the breaker must stop dispatching after maxRetries failures",
  );
  // Every call is still ANSWERED — the model is told the tool is permanently
  // failed rather than the turn stalling. Four calls, two dispatches.
  const answered = result.toolExecutions.filter((e) => e.name === "flaky");
  assertEqual(
    answered.length,
    4,
    "every call must be answered even once the breaker has tripped",
  );
});

await runSuite();
