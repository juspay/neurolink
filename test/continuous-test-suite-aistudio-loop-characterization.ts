#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Google AI Studio native-loop characterization
 * (Plan 08, Task 9).
 *
 * AI Studio has TWO hand-rolled turn loops sharing one shape: the streaming
 * one (`client.ts:1032`) and a near-duplicate inside `generate()`
 * (`client.ts:1500`). Both are `while (step < maxSteps)` over
 * `models.generateContentStream`. This pins what they do before either moves
 * onto `runAgenticLoop`.
 *
 * Everything drives the shipped surface: `NeuroLink` from `../dist/index.js`,
 * no imports out of `src/`, nothing stubbed. The real @google/genai SDK is
 * redirected at a local server through the public
 * `credentials.googleAiStudio.baseURL` option, which the provider threads into
 * the SDK's own `httpOptions.baseUrl` (client.ts:124). No rule-15 exception.
 *
 * Three things are deliberate and load-bearing:
 *
 *  - `disableInternalFallback` on every case. Without it a turn that ends
 *    unsuccessfully makes NeuroLink retry on a DIFFERENT provider, and whether
 *    that succeeds depends on which unrelated credentials sit in the
 *    environment. That is exactly how the Anthropic suite came to pass locally
 *    and fail in CI.
 *  - Env is snapshotted and restored per case, with GOOGLE_AI_BASE_URL cleared
 *    so an ambient value cannot redirect the SDK somewhere else.
 *  - No provider wording in assertion messages. The harness downgrades a
 *    failure matching `isExpectedProviderError()` to a SKIP, so a real
 *    regression would read as green.
 *
 * Run: npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
 *      pnpm run test:aistudio-loop-characterization
 */

import { createServer, type Server } from "node:http";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { jsonSchema } from "ai";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { Tool } from "../src/lib/types/index.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "AI Studio loop characterization",
);

// Registered BEFORE NeuroLink is imported so its tracers bind to this
// provider. Only the step-numbering case reads the exporter; everywhere else
// it is an inert extra span processor.
const spanExporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
}).register();

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";

const TOUCHED_ENV_VARS = [
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
] as const;

function withAiStudioEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.GOOGLE_AI_API_KEY = "test-key";
  delete process.env.GOOGLE_AI_BASE_URL;
  return () => {
    for (const key of TOUCHED_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

type GeminiPart = Record<string, unknown>;

/** One streamed candidate chunk in the SSE framing the SDK expects. */
function sse(parts: GeminiPart[], finishReason?: string): string {
  const payload = {
    candidates: [
      {
        content: { parts, role: "model" },
        ...(finishReason ? { finishReason } : {}),
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

function textTurn(text: string): string {
  return sse([{ text }], "STOP");
}

function toolTurn(name: string, args: Record<string, unknown>): string {
  return sse([{ functionCall: { name, args } }], "STOP");
}

type StandInCall = { body: Record<string, unknown> };

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** Names of the function declarations sent to the model on a given request. */
function declaredToolNames(call: StandInCall | undefined): string[] {
  const tools = (call?.body?.tools ?? []) as Array<{
    functionDeclarations?: Array<{ name?: string }>;
  }>;
  return tools
    .flatMap((t) => t.functionDeclarations ?? [])
    .map((d) => d.name)
    .filter((n): n is string => typeof n === "string");
}

/** functionResponse parts carried back to the model on a given request. */
function functionResponses(call: StandInCall | undefined): string[] {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ functionResponse?: { name?: string } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .map((p) => p.functionResponse?.name)
    .filter((n): n is string => typeof n === "string");
}

/** functionResponse parts with their payloads, for a given request. */
function functionResponsePayloads(
  call: StandInCall | undefined,
): Array<{ name?: string; response?: unknown }> {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ functionResponse?: { name?: string; response?: unknown } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .map((p) => p.functionResponse)
    .filter((r): r is { name?: string; response?: unknown } => r !== undefined);
}

async function startStandIn(
  reply: (callIndex: number) => string,
): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const parseBody = (): Record<string, unknown> => {
        try {
          return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          return {};
        }
      };
      calls.push({ body: parseBody() });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(reply(calls.length - 1));
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function credentialsFor(port: number) {
  return {
    googleAiStudio: {
      apiKey: "test-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

function customTool(counter: { calls: number }): Record<string, Tool> {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: true,
      }),
      execute: async () => {
        counter.calls++;
        return { found: true };
      },
    },
  };
}

section("streaming loop");

await test("a text-only turn streams its text and stops after one call", async () => {
  const server = await startStandIn(() => textTurn("hello from ai studio"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(
      text.includes("hello from ai studio"),
      "the streamed text was not surfaced to the consumer",
    );
    assert(
      server.calls.length === 1,
      `a text-only turn should take exactly one call, took ${server.calls.length}`,
    );
  } finally {
    restore();
    await server.close();
  }
});

section("caller-supplied tools");

await test("a caller's own tool is declared, executed, and its result returns to the model", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("done"),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(
      declaredToolNames(server.calls[0]).includes("lookup"),
      "the caller's tool was not declared to the model",
    );
    assert(
      server.calls.length === 2,
      `a tool round trip should take exactly two calls, took ${server.calls.length}`,
    );
    assert(counter.calls === 1, "the caller's tool did not execute once");
    assert(
      functionResponses(server.calls[1]).includes("lookup"),
      "the tool result was not carried back to the model",
    );
    assert(text.includes("done"), "the final turn's text was not surfaced");
  } finally {
    restore();
    await server.close();
  }
});

section("generate loop");

await test("the generate path declares and executes a caller's tools", async () => {
  // AI Studio's generate() has a second, near-duplicate hand-rolled loop.
  // Pinning it separately matters because Task 9 migrates BOTH onto one
  // adapter, and a regression in either would otherwise be invisible.
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", {}) : textTurn("generated done"),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "look something up" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    // The inverted form of what the characterization pass pinned, now that
    // the cause is fixed.
    //
    // The generate path gated its tool-declaration branch on
    // `!exclusionInForce` alone. `isToolsSchemaExclusionInForce` reports
    // whether the Gemini tools/schema exclusion APPLIES to this provider and
    // model, and it is true for any Gemini request that carries tools at all
    // — so that branch was reachable only when there were no tools to
    // declare, and every caller-supplied tool was dropped whether or not
    // structured output was ever requested. The gate now takes both
    // conjuncts, matching the warning immediately above it and the stream
    // path's own gate.
    assert(
      declaredToolNames(server.calls[0]).includes("lookup"),
      "the generate path did not declare the caller's tool",
    );
    assert(counter.calls === 1, "the caller's tool did not execute once");
    assert(
      functionResponses(server.calls[1]).includes("lookup"),
      "the tool result was not carried back to the model",
    );
    assert(
      server.calls.length === 2,
      `the loop should still take two turns, took ${server.calls.length}`,
    );
    assert(
      typeof result?.content === "string" &&
        result.content.includes("generated done"),
      "the final turn's text was not returned",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("repeatedly failing tool");

await test("a tool that always throws is reported to the model and does not run unbounded", async () => {
  // Pins the failure-breaker behaviour before Task 9 moves this loop onto
  // runAgenticLoop. The two dispatchers differ in one respect that is easy to
  // lose: executeNativeToolCalls clears a tool's accrued strikes whenever it
  // resolves that tool live (utils.ts `failedTools.delete`), while the engine
  // only ever increments them. Whatever the observable consequence is, it is
  // recorded here so the migration has to reproduce it or justify changing it.
  const server = await startStandIn(() => toolTurn("flaky", {}));
  const restore = withAiStudioEnv();
  let attempts = 0;
  try {
    const nl = new NeuroLink();
    await nl
      .stream({
        input: { text: "keep trying" },
        provider: "google-ai",
        model: MODEL,
        maxTokens: 32,
        maxSteps: 4,
        disableTools: false,
        disableInternalFallback: true,
        tools: {
          flaky: {
            description: "always fails",
            inputSchema: jsonSchema({
              type: "object",
              properties: {},
              additionalProperties: true,
            }),
            execute: async () => {
              attempts++;
              throw new Error("synthetic tool failure");
            },
          },
        } satisfies Record<string, Tool>,
        credentials: credentialsFor(server.port),
      })
      .then(async (result) => {
        for await (const chunk of result.stream) {
          void chunk;
        }
      });
  } catch {
    // The turn's outcome is not what is being pinned; the dispatch count and
    // what the model was told are.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] failing-tool turn: attempts=${attempts} calls=${server.calls.length}`,
  );
  // The observed numbers, pinned exactly rather than loosely: the breaker
  // stops DISPATCHING after two failures while the turn keeps running to its
  // step cap. A loose `attempts > 0` would still pass if the migration made
  // the breaker stop tripping and dispatched all four times, which is the
  // regression most worth catching here.
  assert(
    attempts === 2,
    `the failing tool was dispatched ${attempts} times, not the 2 this loop performs`,
  );
  assert(
    server.calls.length === 4,
    `a maxSteps=4 turn made ${server.calls.length} calls, not the 4 this loop performs`,
  );
  // Structural, not a substring scan of the whole request body.
  //
  // The first version of this assertion searched the serialized body for the
  // tool's name, which can never fail: the name is in the function
  // DECLARATIONS on every single request, whether or not any result came
  // back. Mutation-testing proved it — replacing every functionResponse with
  // a stub broke two other cases in this file and left this one green.
  //
  // What actually matters is that each failed dispatch is answered: a
  // functionResponse under the tool's own name, carrying a failure rather
  // than a result.
  const failureResponses = functionResponsePayloads(server.calls[3]).filter(
    (entry) => entry.name === "flaky",
  );
  assert(
    failureResponses.length > 0,
    "the failed dispatch was never answered back to the model",
  );
  assert(
    failureResponses.every((entry) =>
      JSON.stringify(entry.response ?? {}).includes("error"),
    ),
    "the dispatch was answered, but not as a failure",
  );
});

section("step cap without a final answer");

await test("a turn that hits the step cap still delivers text to the consumer", async () => {
  // The loop does NOT end silently when the model never stops calling tools.
  // handleMaxStepsTermination substitutes the last step's accumulated text,
  // or a built cap message when there was none, and that string is pushed to
  // the consumer. A migration that simply lets the engine return at the cap
  // would deliver an empty stream instead — the failure mode is silence, so
  // nothing else would notice.
  //
  // The model emits text alongside its tool call here so the substituted
  // "text from the last step" branch is the one exercised.
  const server = await startStandIn(() =>
    sse(
      [
        { text: "still working on it" },
        { functionCall: { name: "lookup", args: {} } },
      ],
      "STOP",
    ),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  let streamed = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        streamed += chunk.content;
      }
    }
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] step-cap turn: calls=${server.calls.length} chars=${streamed.length}`,
  );
  assert(
    server.calls.length === 2,
    `a maxSteps=2 turn made ${server.calls.length} calls, not the 2 this loop performs`,
  );
  // Counted, not merely present. Each step streams its own text live, so
  // `streamed.includes(...)` is true whether or not the cap fallback fires —
  // that assertion was written first and mutation-testing showed it passing
  // with the fallback deleted. The fallback's observable effect is that the
  // last step's text is delivered ONE MORE TIME as the turn's answer, so two
  // steps plus the fallback is three occurrences.
  const occurrences = streamed.split("still working on it").length - 1;
  assert(
    occurrences === 3,
    `the last step's text appeared ${occurrences} times, not the 3 this loop produces`,
  );
});

await test("the generate path hitting the step cap still returns the last step's text", async () => {
  // The generate loop's step-cap behaviour had no coverage. It routes through
  // the same handleMaxStepsTermination as the streaming twin, but returns the
  // text in the result rather than pushing it to a channel — so the failure
  // mode is an empty `content`, which nothing else would notice.
  const server = await startStandIn(() =>
    sse(
      [
        { text: "partial progress" },
        { functionCall: { name: "lookup", args: {} } },
      ],
      "STOP",
    ),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "keep going" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    console.log(
      `    [diagnostic] generate step-cap: calls=${server.calls.length} content=${JSON.stringify(result?.content ?? "").slice(0, 60)}`,
    );
    assert(
      server.calls.length === 2,
      `a maxSteps=2 turn made ${server.calls.length} calls, not the 2 this loop performs`,
    );
    assert(
      typeof result?.content === "string" &&
        result.content.includes("partial progress"),
      "the last step's text was not returned when the cap was reached",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("repeated identical tool calls");

// BZ-3327: Gemini re-emits a tool call with identical arguments across
// agentic steps even though the prior result is already in the conversation
// history. Re-executing means duplicate side effects and duplicate reports
// for the user, so the per-turn executeMap (DedupExecuteMap) caches by
// {name + stable-stringified args} and serves the repeat from the cache.
//
// Both AI Studio loops are covered because both had the dedup and both were
// migrated onto the shared engine.

await test("the streaming loop runs an identical repeated call only once", async () => {
  const server = await startStandIn(() => toolTurn("repeatable", { q: "x" }));
  const restore = withAiStudioEnv();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call the same tool repeatedly" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: {
        repeatable: {
          description: "records how often it really ran",
          inputSchema: jsonSchema({
            type: "object",
            properties: { q: { type: "string" } },
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            return { ran: dispatched };
          },
        },
      } satisfies Record<string, Tool>,
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned, not the turn's outcome.
  } finally {
    restore();
    await server.close();
  }
  const responses = functionResponsePayloads(
    server.calls[server.calls.length - 1],
  );
  console.log(
    `    [diagnostic] aistudio dedup stream: dispatched=${dispatched} responses=${responses.length}`,
  );
  assert(
    dispatched === 1,
    `the repeated identical call executed ${dispatched} times instead of being served from the per-turn cache`,
  );
  // Both halves matter: the dispatch count alone would also be 1 if the loop
  // had simply stopped after the first step.
  assert(
    responses.length === 4,
    `the model was answered ${responses.length} times, so the turn did not keep running on cached results`,
  );
});

await test("the generate loop runs an identical repeated call only once", async () => {
  const server = await startStandIn(() => toolTurn("repeatable", { q: "x" }));
  const restore = withAiStudioEnv();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "call the same tool repeatedly" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      tools: {
        repeatable: {
          description: "records how often it really ran",
          inputSchema: jsonSchema({
            type: "object",
            properties: { q: { type: "string" } },
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            return { ran: dispatched };
          },
        },
      } satisfies Record<string, Tool>,
      credentials: credentialsFor(server.port),
    });
  } catch {
    // The dispatch count is what is pinned, not the turn's outcome.
  } finally {
    restore();
    await server.close();
  }
  const responses = functionResponsePayloads(
    server.calls[server.calls.length - 1],
  );
  console.log(
    `    [diagnostic] aistudio dedup generate: dispatched=${dispatched} responses=${responses.length}`,
  );
  assert(
    dispatched === 1,
    `the repeated identical call executed ${dispatched} times instead of being served from the per-turn cache`,
  );
  assert(
    responses.length === 4,
    `the model was answered ${responses.length} times, so the turn did not keep running on cached results`,
  );
});

section("abort between tool executions");

await test("an abort mid-step stops the loop from dispatching the rest of the batch", async () => {
  // A step can carry several tool calls. When the turn is aborted — caller
  // cancel, turn deadline, stall watchdog — the remaining calls in that batch
  // must not be started: each one costs up to a full tool timeout, so a wide
  // batch keeps running long past the moment the turn was cancelled.
  //
  // The abort is raised from inside the FIRST tool, which is the realistic
  // shape (a deadline trips while a tool is running) and makes the test
  // deterministic without any timing assumptions.
  const server = await startStandIn(() =>
    sse(
      [
        { functionCall: { name: "first", args: {} } },
        { functionCall: { name: "second", args: {} } },
      ],
      "STOP",
    ),
  );
  const restore = withAiStudioEnv();
  const controller = new AbortController();
  let firstCalls = 0;
  let secondCalls = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call both tools" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      abortSignal: controller.signal,
      credentials: credentialsFor(server.port),
      tools: {
        first: {
          description: "aborts the turn",
          inputSchema: jsonSchema({
            type: "object",
            properties: {},
            additionalProperties: true,
          }),
          execute: async () => {
            firstCalls++;
            controller.abort();
            return { ok: true };
          },
        },
        second: {
          description: "must not run once the turn is aborted",
          inputSchema: jsonSchema({
            type: "object",
            properties: {},
            additionalProperties: true,
          }),
          execute: async () => {
            secondCalls++;
            return { ok: true };
          },
        },
      } satisfies Record<string, Tool>,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // An aborted turn may surface as a throw; the dispatch counts are pinned.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] aistudio abort-mid-batch: first=${firstCalls} second=${secondCalls} calls=${server.calls.length}`,
  );
  assert(firstCalls === 1, "the first tool did not run exactly once");
  assert(
    secondCalls === 0,
    "the rest of the batch was dispatched after the turn was aborted",
  );
  // And the turn stopped rather than issuing another request: a partial
  // tool-result turn must never be written back, since an unanswered tool
  // call in history is rejected outright by Anthropic and carried forward by
  // Gemini.
  assert(
    server.calls.length === 1,
    `the loop issued ${server.calls.length} requests, so it continued past the abort`,
  );
});

section("step numbering");

await test("tool activity is numbered by the turn's steps, one per step", async () => {
  // Each step's tool activity is recorded with a step number — on the
  // `gen_ai.tool_call` span event as `tool.step`, and on the conversation
  // memory rows as `stepIndex`. The numbering has to come from the loop's own
  // step, not from a count of how many times the recording hook ran: a
  // malformed-call retry re-enters the loop without reaching that hook and
  // still consumes a step, so a self-incrementing counter drifts by exactly
  // the number of retries and mislabels every row after the first.
  //
  // AI Studio enables no such retry today, so this pins the numbering as it
  // stands and fails if it is ever renumbered.
  const server = await startStandIn((i) =>
    i < 2 ? toolTurn("count", { n: i }) : textTurn("done"),
  );
  const restore = withAiStudioEnv();
  spanExporter.reset();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "use the tool twice" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 4,
      disableTools: false,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
      tools: {
        count: {
          description: "counts",
          inputSchema: jsonSchema({
            type: "object",
            properties: { n: { type: "number" } },
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            return { ok: true };
          },
        },
      } satisfies Record<string, Tool>,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } finally {
    restore();
    await server.close();
  }
  const steps = spanExporter
    .getFinishedSpans()
    .flatMap((span: ReadableSpan) => span.events)
    .filter((event) => event.name === "gen_ai.tool_call")
    .map((event) => event.attributes?.["tool.step"]);
  console.log(
    `    [diagnostic] aistudio step numbering: dispatched=${dispatched} steps=${steps.join(",")}`,
  );
  assert(dispatched === 2, "the tool did not run once per tool-calling step");
  // One event per tool call, numbered from 1, in order. Asserting the exact
  // sequence rather than the count is what catches a renumbering that still
  // produces the right number of events.
  assert(
    steps.length === 2 && steps[0] === 1 && steps[1] === 2,
    "tool activity was not numbered 1,2 across the turn's two tool steps",
  );
});

await runSuite();
