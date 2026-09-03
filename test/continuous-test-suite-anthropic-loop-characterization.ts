#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — direct Anthropic native-loop characterization
 * (Plan 08, Task 8).
 *
 * Pins the observable behaviour of Anthropic's hand-rolled turn loop before it
 * moves onto `runAgenticLoop`, so the migration can be shown to change only
 * what it means to change.
 *
 * Everything drives the shipped surface: `new NeuroLink().stream()` from
 * `../dist/index.js`, no imports out of `src/`, nothing stubbed. The real
 * Anthropic SDK is redirected at a local server via `ANTHROPIC_BASE_URL` and
 * answered with genuine SSE framing, so the SDK's own event parsing runs.
 *
 * Every case sets `disableInternalFallback`. Without it this suite does not
 * characterize Anthropic's loop at all: when a turn ends unsuccessfully
 * NeuroLink falls back to another provider, and whether that fallback
 * succeeds depends entirely on which OTHER providers' credentials happen to
 * be in the environment. That is exactly how the step-cap case came to pass
 * here and fail in CI — locally the fallback to Vertex succeeded on ambient
 * credentials and hid the outcome; in CI it failed with a Vertex
 * configuration error that had nothing to do with Anthropic.
 *
 * Three things are deliberate and load-bearing:
 *
 *  - Env is snapshotted and restored around every case, and `api_key` auth is
 *    pinned with the OAuth variables cleared. An ambient dev-machine OAuth
 *    token would otherwise route construction down a different branch and
 *    silently invalidate the case. The same class of ambient leak turned a
 *    SageMaker suite green locally while it failed in CI.
 *  - The throttle fixture says "synthetic throttle fixture" rather than
 *    anything resembling a real rate-limit message, because the harness
 *    downgrades a failure whose text matches `isExpectedProviderError()` to a
 *    SKIP, which would let a genuine regression pass as green.
 *
 * Run: npx tsx test/continuous-test-suite-anthropic-loop-characterization.ts
 *      pnpm run test:anthropic-loop-characterization
 */

import { createServer, type Server } from "node:http";
import { z } from "zod";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { jsonSchema } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { Tool } from "../src/lib/types/index.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Anthropic loop characterization",
);

// Registered BEFORE NeuroLink is imported, so its tracers bind to this
// provider. Only the span-attribute case below reads the exporter; for every
// other case it is an inert extra span processor.
const spanExporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
}).register();

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "claude-3-5-sonnet-20241022";

const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

function withAnthropicEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
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

function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** A turn that emits text and stops. */
function textTurn(text: string): string[] {
  return [
    sse("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text },
    }),
    sse("content_block_stop", { index: 0 }),
    sse("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 4 },
    }),
    sse("message_stop", {}),
  ];
}

/** A turn that asks for one tool call. */
function toolTurn(
  name: string,
  input: Record<string, unknown>,
  id = "toolu_1",
  leadingText?: string,
): string[] {
  const frames: string[] = [
    sse("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
  ];
  let index = 0;
  if (leadingText !== undefined) {
    frames.push(
      sse("content_block_start", {
        index,
        content_block: { type: "text", text: "" },
      }),
      sse("content_block_delta", {
        index,
        delta: { type: "text_delta", text: leadingText },
      }),
      sse("content_block_stop", { index }),
    );
    index++;
  }
  frames.push(
    sse("content_block_start", {
      index,
      content_block: { type: "tool_use", id, name, input: {} },
    }),
    sse("content_block_delta", {
      index,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    }),
    sse("content_block_stop", { index }),
    sse("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    sse("message_stop", {}),
  );
  return frames;
}

type StandInCall = { body: Record<string, unknown> };

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** Tool names declared to the model on a given request. */
function declaredToolNames(call: StandInCall | undefined): string[] {
  const tools = (call?.body?.tools ?? []) as Array<{ name?: string }>;
  return tools
    .map((t) => t.name)
    .filter((n): n is string => typeof n === "string");
}

/** tool_result blocks carried back to the model on a given request. */
function toolResults(
  call: StandInCall | undefined,
): Array<{ is_error?: boolean; content?: unknown }> {
  const messages = (call?.body?.messages ?? []) as Array<{
    content?: unknown;
  }>;
  const blocks: Array<{ is_error?: boolean; content?: unknown }> = [];
  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const block of message.content as Array<Record<string, unknown>>) {
      if (block?.type === "tool_result") {
        blocks.push(block as { is_error?: boolean; content?: unknown });
      }
    }
  }
  return blocks;
}

async function startStandIn(
  reply: (callIndex: number) => string[],
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
      for (const frame of reply(calls.length - 1)) {
        res.write(frame);
      }
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

section("streaming turn shape");

await test("a text-only turn streams its text and stops after one call", async () => {
  const server = await startStandIn(() => textTurn("hello from anthropic"));
  const restore = withAnthropicEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(
      text.includes("hello from anthropic"),
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

await test("a caller's own tool is declared and executed, and its result returns to the model", async () => {
  // Bedrock advertised caller tools and then failed every call to them,
  // because declaration and execution resolved from different sources. This
  // pins that Anthropic does not share that split.
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("done"),
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
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
    assert(
      counter.calls === 1,
      "the caller's tool did not execute exactly once",
    );
    const results = toolResults(server.calls[1]);
    assert(
      results.length === 1 && results[0]?.is_error !== true,
      "a successful tool result was not carried back to the model",
    );
    assert(text.includes("done"), "the final turn's text was not surfaced");
  } finally {
    restore();
    await server.close();
  }
});

section("assistant text preceding a tool call");

await test("text emitted before a tool call survives into the next request", async () => {
  // The same defect found in Bedrock's adapter: text that arrives before the
  // tool_use block must still reach the assistant turn replayed on the next
  // step, or the model stops seeing its own reasoning mid-turn.
  const server = await startStandIn((i) =>
    i === 0
      ? toolTurn("lookup", {}, "toolu_1", "let me check")
      : textTurn("done"),
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
    });
    let streamed = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        streamed += chunk.content;
      }
    }
    assert(
      streamed.includes("let me check"),
      "the pre-tool-call text never reached the consumer",
    );
    const replayed = JSON.stringify(server.calls[1]?.body ?? {});
    assert(
      replayed.includes("let me check"),
      "the pre-tool-call text was dropped from the conversation sent back to the model",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("step cap");

await test("a model that never stops calling tools is bounded by maxSteps", async () => {
  const server = await startStandIn((i) =>
    toolTurn("lookup", { n: i }, `toolu_${i}`),
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    let failed = false;
    try {
      const result = await nl.stream({
        input: { text: "keep going" },
        provider: "anthropic",
        disableInternalFallback: true,
        model: MODEL,
        maxTokens: 32,
        maxSteps: 3,
        disableTools: false,
        tools: customTool(counter),
      });
      for await (const chunk of result.stream) {
        void chunk;
      }
    } catch (error) {
      failed = true;
      // Printed, never interpolated into an assertion message: the harness
      // downgrades a failure whose text matches isExpectedProviderError() to
      // a SKIP, so provider wording must not reach an assert. This turn is
      // bounded identically everywhere, but whether reaching the bound throws
      // has differed between this machine and CI, and the name is what tells
      // them apart.
      const name = error instanceof Error ? error.constructor.name : "unknown";
      const message = error instanceof Error ? error.message : String(error);
      // The message goes to stdout, never into an assertion. Only assertion
      // text is matched by isExpectedProviderError(), so printing it cannot
      // downgrade a real failure to a skip — and the first round's coarse
      // classifier ("tool-resolution" vs "other") returned "other", which
      // ruled out the leading theory without naming the actual cause.
      console.log(`    [diagnostic] step-cap turn threw: kind=${name}`);
      console.log(`    [diagnostic] message: ${message.slice(0, 300)}`);
      const cause = (error as { cause?: unknown })?.cause;
      if (cause !== undefined) {
        const causeMessage =
          cause instanceof Error ? cause.message : String(cause);
        console.log(`    [diagnostic] cause: ${causeMessage.slice(0, 200)}`);
      }
    }
    // Both numbers are recorded rather than asserted against an assumed
    // value: the point of characterizing is to learn what this loop does,
    // and the migration must then reproduce it or say why it differs.
    assert(
      server.calls.length > 0 && server.calls.length <= 5,
      `a maxSteps=3 turn made ${server.calls.length} calls, outside the plausible 1..5 range`,
    );
    assert(
      server.calls.length === 3,
      `maxSteps=3 should bound the turn at 3 calls, but it made ${server.calls.length}`,
    );
    console.log(
      `    [diagnostic] step-cap turn: calls=${server.calls.length} threw=${failed}`,
    );
    assert(!failed, "reaching the step cap should not fail the turn");
  } finally {
    restore();
    await server.close();
  }
});

section("structured output");

await test("a truncated final_result payload survives verbatim instead of collapsing to an empty object", async () => {
  // Load-bearing, and the reason it is pinned here: the loop extracts the
  // terminal structured-output call with `stringifyFinalResultInput`, which
  // returns the RAW accumulated input_json when it does not parse. A payload
  // cut off by the token cap therefore reaches the caller's coercion layer
  // intact and can be repaired into a partial object.
  //
  // The obvious-looking alternative — parse the arguments, then re-stringify
  // them — turns exactly this case into "{}" and loses the whole answer,
  // because a truncated JSON string parses to nothing. Anything that migrates
  // this loop must keep the verbatim path.
  const truncated = '{"title":"a very long answer that was cut off mid-str';
  const server = await startStandIn(() => [
    sse("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_f",
        name: "final_result",
        input: {},
      },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: truncated },
    }),
    sse("content_block_stop", { index: 0 }),
    sse("message_delta", {
      delta: { stop_reason: "max_tokens" },
      usage: { output_tokens: 64 },
    }),
    sse("message_stop", {}),
  ]);
  const restore = withAnthropicEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "answer in json" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      schema: z.object({ title: z.string() }),
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    console.log(
      `    [diagnostic] structured stream produced: ${text.slice(0, 120)}`,
    );
    assert(
      text.includes("a very long answer that was cut off"),
      "the truncated structured payload did not survive to the consumer",
    );
    assert(
      text.trim() !== "{}",
      "the truncated structured payload collapsed to an empty object",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("retry telemetry");

await test("a native loop turn records the provider attempt count on the active span", async () => {
  // Before this loop moved onto the shared engine it called
  //   withProviderRetry(fn, trace.getActiveSpan() ?? undefined, label)
  // and withProviderRetry writes gen_ai.provider.total_attempts on that span
  // after every completed attempt, retried or not. The engine passed
  // `undefined` in its place, so the attribute stopped being emitted for
  // every native Anthropic turn — invisibly, because nothing asserted on it.
  //
  // One tool step so the turn actually runs on the agentic loop rather than a
  // single-shot call.
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("done"),
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  spanExporter.reset();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } finally {
    restore();
    await server.close();
  }
  const ATTR = "gen_ai.provider.total_attempts";
  const carrying = spanExporter
    .getFinishedSpans()
    .filter((span: ReadableSpan) => span.attributes[ATTR] !== undefined);
  console.log(
    `    [diagnostic] anthropic retry telemetry: toolCalls=${counter.calls} spansWithAttr=${carrying.length} names=${carrying.map((s2: ReadableSpan) => s2.name).join("|")} values=${carrying
      .map((span: ReadableSpan) => String(span.attributes[ATTR]))
      .join(",")}`,
  );
  assert(
    counter.calls === 1,
    "the turn did not run a tool step, so it never reached the agentic loop",
  );
  assert(
    carrying.length > 0,
    "no span carries the provider attempt count, so the loop is not passing one",
  );
  // Named, not merely present. The attribute lands on the turn's own
  // `neurolink.stream` span — the one the SDK opens around the request, which
  // is what `trace.getActiveSpan()` resolves to when the client hands its span
  // to the loop. Pinning the name is what stops this passing on an attribute
  // some unrelated provider path wrote on a different span.
  //
  // It cannot be pinned by wrapping this call in the test's own
  // `startActiveSpan` and asserting on that wrapper: the SDK opens
  // `neurolink.stream` beneath it, so the attribute lands on the child and the
  // wrapper stays bare. Verified by printing the carrying span's name rather
  // than assumed.
  assert(
    carrying.every((span: ReadableSpan) => span.name === "neurolink.stream"),
    "the attempt count was recorded on some span other than the turn's own",
  );
  // Every step of a clean turn succeeds first try, so each recorded count is 1.
  // Asserting the VALUE and not merely the key's presence keeps a broken
  // attempt counter from passing.
  assert(
    carrying.every((span: ReadableSpan) => span.attributes[ATTR] === 1),
    "a step reported an attempt count other than the single attempt it made",
  );
});

section("step cap vs internal fallback");

await test("fallbackOnMaxSteps: false surfaces a capped turn instead of retrying it", async () => {
  // A step-capped turn produces no text, so the SDK's no-output gate would
  // retry the whole request on the fallback route — spending a second turn
  // to exceed a budget the caller set deliberately. fallbackOnMaxSteps:
  // false marks the cap as the caller's own bound and keeps the turn.
  //
  // The fallback route is pinned back at this same stand-in, so a fired
  // fallback is directly visible as a SECOND capped turn: exactly 3 calls
  // proves the gate never fired (removing the gate clause flips this to 6).
  const server = await startStandIn((i) =>
    toolTurn("lookup", { n: i }, `toolu_${i}`),
  );
  const restore = withAnthropicEnv(server.port);
  // The per-call route below outranks these, but clear them anyway so a
  // developer .env cannot change what a *fired* fallback would do.
  const savedFallbackEnv = {
    provider: process.env.FALLBACK_PROVIDER,
    model: process.env.FALLBACK_MODEL,
  };
  delete process.env.FALLBACK_PROVIDER;
  delete process.env.FALLBACK_MODEL;
  const counter = { calls: 0 };
  let resolvedStopReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "anthropic",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
      fallbackOnMaxSteps: false,
      // Deterministic route: if the gate fires anyway, the retry lands back
      // on this stand-in and doubles the call count.
      fallbackProvider: "anthropic",
      fallbackModel: MODEL,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    // metadata is the mutable-reference contract: the loop resolves
    // stopReason onto this same object by the time the stream is drained.
    resolvedStopReason = result.metadata?.stopReason;
  } catch {
    // The call count is what is pinned.
  } finally {
    restore();
    if (savedFallbackEnv.provider !== undefined) {
      process.env.FALLBACK_PROVIDER = savedFallbackEnv.provider;
    }
    if (savedFallbackEnv.model !== undefined) {
      process.env.FALLBACK_MODEL = savedFallbackEnv.model;
    }
    await server.close();
  }
  console.log(
    `    [diagnostic] capped-no-fallback: calls=${server.calls.length} toolExecs=${counter.calls} stopReason=${String(resolvedStopReason)}`,
  );
  assert(
    server.calls.length === 3,
    `a capped turn with fallbackOnMaxSteps:false should stop at 3 calls, made ${server.calls.length}`,
  );
  assert(
    resolvedStopReason === "step-cap",
    "the capped turn should surface stopReason step-cap to the caller",
  );
});

// ---------------------------------------------------------------------------
// generate-path turn-budget semantics (non-streaming doGenerate)
//
// Pins the 2026-09-01 curator/yama incident class: `timeout` alone used to
// bound the ENTIRE multi-step generate loop, so a caller passing
// `{ timeout: 300s, turnTimeoutMs: 40min }` was killed at 300s flat, and the
// kill surfaced as the SDK's generic cancel ("Request was aborted.") logged
// as a provider failure. The three cases below pin the repaired contract:
// turnTimeoutMs owns the whole-turn cap, `timeout` bounds each model call,
// an internal timer's kill carries the timer's own identity, and a genuine
// caller cancel never consults the fallback callback.
// ---------------------------------------------------------------------------

type JsonTurn = {
  delayMs: number;
  message: Record<string, unknown>;
};

/** Non-streaming Messages response that asks for one tool call. */
function jsonToolTurn(name: string, id: string): Record<string, unknown> {
  return {
    id,
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "tool_use", id: `${id}_use`, name, input: {} }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 6 },
  };
}

/** Non-streaming Messages response that answers with text and stops. */
function jsonTextTurn(text: string): Record<string, unknown> {
  return {
    id: "msg_final",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 4 },
  };
}

/** JSON stand-in for the non-streaming generate path, with per-call delay. */
async function startJsonStandIn(
  reply: (callIndex: number) => JsonTurn,
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
      const turn = reply(calls.length - 1);
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(turn.message));
      }, turn.delayMs);
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

section("generate-path turn budget semantics");

await test("an explicit turnTimeoutMs owns the whole-turn cap; timeout stays per-call", async () => {
  // Three model calls of ~1s each under a per-call `timeout` of 2.5s and a
  // turn cap of 30s. The pre-fix behavior armed the 2.5s value over the
  // WHOLE loop and killed the turn mid-call 3.
  const server = await startJsonStandIn((i) =>
    i === 0
      ? { delayMs: 1_000, message: jsonToolTurn("lookup", "msg_1") }
      : i === 1
        ? { delayMs: 1_000, message: jsonToolTurn("lookup", "msg_2") }
        : { delayMs: 1_000, message: jsonTextTurn("budget respected") },
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "do the slow thing" },
      provider: "anthropic",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      tools: customTool(counter),
      timeout: 2_500,
      turnTimeoutMs: 30_000,
    });
    assert(
      (result.content ?? "").includes("budget respected"),
      "the turn did not run to completion under an explicit turn cap",
    );
    assert(
      server.calls.length === 3,
      `the tool loop should take exactly three calls, took ${server.calls.length}`,
    );
    assert(counter.calls === 2, "the tool did not execute exactly twice");
  } finally {
    restore();
    await server.close();
  }
});

await test("a per-call timeout kill carries the timer's identity, not the SDK cancel shape", async () => {
  // One call that outlives `timeout`. The surfaced error must say what
  // actually happened (the timer fired) — the pre-fix behavior surfaced the
  // Anthropic SDK's generic cancel wording, which reads as a caller abort.
  const server = await startJsonStandIn(() => ({
    delayMs: 3_000,
    message: jsonTextTurn("too late"),
  }));
  const restore = withAnthropicEnv(server.port);
  let thrown: Error | undefined;
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "hang" },
      provider: "anthropic",
      model: MODEL,
      maxTokens: 32,
      timeout: 1_000,
    });
  } catch (error) {
    thrown = error instanceof Error ? error : new Error("non-error thrown");
  } finally {
    restore();
    await server.close();
  }
  assert(thrown !== undefined, "the timer did not end the call at all");
  const text = thrown?.message ?? "";
  assert(
    text.includes("timed out"),
    "the timer's own identity did not surface on the thrown error",
  );
  assert(
    !text.includes("Request was aborted"),
    "the SDK's generic cancel shape leaked through instead of the timer identity",
  );
});

await test("a caller abort never consults the providerFallback callback", async () => {
  // A genuine cancel (the caller's own signal) must bubble as an abort —
  // pre-fix, the SDK's cancel wording was not classified as an abort, so
  // the fallback callback was consulted and the turn re-ran elsewhere.
  const server = await startJsonStandIn(() => ({
    delayMs: 2_500,
    message: jsonTextTurn("should never arrive"),
  }));
  const restore = withAnthropicEnv(server.port);
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 250);
  let fallbackConsulted = 0;
  let thrown = false;
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "cancel me" },
      provider: "anthropic",
      model: MODEL,
      maxTokens: 32,
      timeout: 10_000,
      abortSignal: controller.signal,
      providerFallback: async () => {
        fallbackConsulted++;
        return null;
      },
    });
  } catch {
    thrown = true;
  } finally {
    clearTimeout(abortTimer);
    restore();
    await server.close();
  }
  assert(thrown, "the caller's cancel did not end the turn");
  assert(
    fallbackConsulted === 0,
    `a caller cancel must not consult the fallback callback, consulted ${fallbackConsulted} time(s)`,
  );
});

await runSuite();
