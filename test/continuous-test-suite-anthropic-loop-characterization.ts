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
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Anthropic loop characterization",
);

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

function customTool(counter: { calls: number }) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
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
      text += chunk?.content ?? "";
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
      text += chunk?.content ?? "";
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
      streamed += chunk?.content ?? "";
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

await runSuite();
