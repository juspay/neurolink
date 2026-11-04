#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Anthropic message threads (beta), in-turn.
 *
 * A turn with tools makes several requests, each carrying the whole
 * conversation so far. With `messageThreads: true` the first request creates a
 * thread and each later one sends only the messages since the last response.
 * The thread lives on the server for minutes and is best-effort, so the loop
 * must also notice when it cannot be continued and resend everything.
 *
 * Everything drives the shipped surface: `new NeuroLink().stream()` from
 * `../dist/index.js`, nothing imported from `src/`, nothing stubbed. The real
 * Anthropic SDK is redirected at a local server through `ANTHROPIC_BASE_URL`
 * and answered with genuine SSE framing (or an Anthropic-shaped error body),
 * so what is asserted is the wire: the `thread` field, the beta header, and
 * which of `system`, `tools` and the earlier messages each request carries.
 *
 * Every case sets `disableInternalFallback`, so a failed Anthropic turn is
 * reported as one instead of being answered by another provider.
 *
 * Offline: a 127.0.0.1 stand-in only. No key, no network.
 *
 * Run: pnpm run build && pnpm run test:anthropic-message-threads
 */

import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { jsonSchema } from "../dist/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { Tool } from "../src/lib/types/index.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Anthropic message threads", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "claude-3-5-sonnet-20241022";
const THREAD_BETA = "message-threads-2026-08-12";
const TOUCHED = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

function withAnthropicEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED) {
    saved[key] = process.env[key];
  }
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
  return () => {
    for (const key of TOUCHED) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

const sse = (event: string, payload: Record<string, unknown>): string =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;

const textTurn = (text: string, id: string, complete = true): string[] => [
  sse("message_start", {
    message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
  }),
  sse("content_block_start", {
    index: 0,
    content_block: { type: "text", text: "" },
  }),
  sse("content_block_delta", { index: 0, delta: { type: "text_delta", text } }),
  sse("content_block_stop", { index: 0 }),
  sse("message_delta", {
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 4 },
  }),
  ...(complete ? [sse("message_stop", {})] : []),
];

const toolTurn = (id: string, toolUseId: string, complete = true): string[] => [
  sse("message_start", {
    message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
  }),
  sse("content_block_start", {
    index: 0,
    content_block: {
      type: "tool_use",
      id: toolUseId,
      name: "lookup",
      input: {},
    },
  }),
  sse("content_block_delta", {
    index: 0,
    delta: { type: "input_json_delta", partial_json: "{}" },
  }),
  sse("content_block_stop", { index: 0 }),
  sse("message_delta", {
    delta: { stop_reason: "tool_use" },
    usage: { output_tokens: 6 },
  }),
  ...(complete ? [sse("message_stop", {})] : []),
];

/** An Anthropic-shaped error body, as the API answers a refused thread request. */
const threadError = (status: number, errorCode: string) => ({
  status,
  json: {
    type: "error",
    error: {
      type: status === 404 ? "not_found_error" : "invalid_request_error",
      message: "synthetic thread fixture",
      details: { error_code: errorCode },
    },
  },
});

type Reply = { frames: string[] } | { status: number; json: unknown };
type Call = { body: Record<string, unknown>; headers: IncomingHttpHeaders };
type StandIn = { calls: Call[]; port: number; close: () => Promise<void> };

async function startStandIn(reply: (index: number) => Reply): Promise<StandIn> {
  const calls: Call[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      calls.push({ body, headers: req.headers });
      const answer = reply(calls.length - 1);
      if ("frames" in answer) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const frame of answer.frames) {
          res.write(frame);
        }
        res.end();
        return;
      }
      res.writeHead(answer.status, { "content-type": "application/json" });
      res.end(JSON.stringify(answer.json));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const lookupTool = (): Record<string, Tool> => ({
  lookup: {
    description: "look a value up",
    inputSchema: jsonSchema({
      type: "object",
      properties: {},
      additionalProperties: true,
    }),
    execute: async () => ({ found: true }),
  },
});

async function runTurn(
  port: number,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const restore = withAnthropicEnv(port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look it up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 64,
      tools: lookupTool(),
      ...extra,
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    return text;
  } finally {
    restore();
  }
}

const betaOf = (call: Call): string =>
  String(call.headers["anthropic-beta"] ?? "");
const messagesOf = (call: Call): unknown[] =>
  Array.isArray(call.body.messages) ? call.body.messages : [];
const hasThread = (call: Call): boolean => "thread" in call.body;

await test("off by default: every step resends the conversation and carries no thread", async () => {
  const server = await startStandIn((i) => ({
    frames: i === 0 ? toolTurn("msg_1", "toolu_1") : textTurn("done", "msg_2"),
  }));
  try {
    const text = await runTurn(server.port);
    assert(text.includes("done"), "the turn did not finish");
    assertEqual(server.calls.length, 2, "request count");
    assert(!server.calls.some(hasThread), "a thread field was sent unasked");
    assert(
      !server.calls.some((c) => betaOf(c).includes(THREAD_BETA)),
      "the thread beta was sent unasked",
    );
    assertEqual(messagesOf(server.calls[1]).length, 3, "step 2 messages");
    assert(server.calls[1].body.tools !== undefined, "step 2 lost its tools");
  } finally {
    await server.close();
  }
});

await test("on: the first step creates a thread and the next sends only the new message", async () => {
  const server = await startStandIn((i) => ({
    frames: i === 0 ? toolTurn("msg_1", "toolu_1") : textTurn("done", "msg_2"),
  }));
  try {
    const text = await runTurn(server.port, { messageThreads: true });
    assert(text.includes("done"), "the turn did not finish");
    assertEqual(server.calls.length, 2, "request count");
    const [create, next] = server.calls;
    assertEqual(
      JSON.stringify(create.body.thread),
      '{"type":"create"}',
      "step 1 thread",
    );
    assert(
      betaOf(create).includes(THREAD_BETA),
      "step 1 lacks the thread beta",
    );
    assertEqual(messagesOf(create).length, 1, "step 1 messages");
    assert(create.body.tools !== undefined, "step 1 should declare its tools");
    assertEqual(
      JSON.stringify(next.body.thread),
      '{"type":"continue","previous_message_id":"msg_1"}',
      "step 2 thread",
    );
    assert(!("system" in next.body), "a continue request must not send system");
    assert(!("tools" in next.body), "a continue request must not send tools");
    assertEqual(
      messagesOf(next).length,
      1,
      "step 2 sends only the new message",
    );
    assertEqual(
      next.body.model,
      create.body.model,
      "model is fixed for a thread",
    );
    assertEqual(
      betaOf(next),
      betaOf(create),
      "the beta set is fixed for a thread",
    );
  } finally {
    await server.close();
  }
});

await test("thread_not_found on a continue: the same step is resent once, in full, as a new thread", async () => {
  const server = await startStandIn((i) => {
    if (i === 0) {
      return { frames: toolTurn("msg_1", "toolu_1") };
    }
    if (i === 1) {
      return threadError(404, "thread_not_found");
    }
    return { frames: textTurn("done", "msg_3") };
  });
  try {
    const text = await runTurn(server.port, { messageThreads: true });
    assert(text.includes("done"), "the turn did not finish after the replay");
    assertEqual(server.calls.length, 3, "request count");
    const replay = server.calls[2];
    assertEqual(
      JSON.stringify(replay.body.thread),
      '{"type":"create"}',
      "replay thread",
    );
    assertEqual(
      messagesOf(replay).length,
      3,
      "the replay carries the whole conversation",
    );
    assert(
      replay.body.tools !== undefined,
      "the replay must declare tools again",
    );
  } finally {
    await server.close();
  }
});

await test("thread_unsupported_request: the step is resent without a thread and the turn stays unthreaded", async () => {
  const server = await startStandIn((i) => {
    if (i === 0) {
      return threadError(400, "thread_unsupported_request");
    }
    if (i === 1) {
      return { frames: toolTurn("msg_2", "toolu_1") };
    }
    return { frames: textTurn("done", "msg_3") };
  });
  try {
    const text = await runTurn(server.port, { messageThreads: true });
    assert(text.includes("done"), "the turn did not finish unthreaded");
    assertEqual(server.calls.length, 3, "request count");
    assert(!hasThread(server.calls[1]), "the retry must carry no thread");
    assert(!hasThread(server.calls[2]), "later steps must stay unthreaded");
    assert(
      !betaOf(server.calls[2]).includes(THREAD_BETA),
      "an unthreaded step must not send the thread beta",
    );
    assertEqual(
      messagesOf(server.calls[2]).length,
      3,
      "the last step resends everything",
    );
  } finally {
    await server.close();
  }
});

await test("a change of tool choice between steps starts a new thread", async () => {
  const server = await startStandIn((i) => ({
    frames: i === 0 ? toolTurn("msg_1", "toolu_1") : textTurn("done", "msg_2"),
  }));
  try {
    // Forced for the first step only, so step 2 sends a different tool_choice.
    await runTurn(server.port, {
      messageThreads: true,
      toolChoice: "required",
      toolChoiceSteps: 1,
    });
    assertEqual(server.calls.length, 2, "request count");
    assert(
      server.calls[0].body.tool_choice !== undefined,
      "step 1 should force a tool",
    );
    assertEqual(
      JSON.stringify(server.calls[1].body.thread),
      '{"type":"create"}',
      "step 2 must be a new thread",
    );
    assertEqual(
      messagesOf(server.calls[1]).length,
      3,
      "step 2 resends the conversation",
    );
  } finally {
    await server.close();
  }
});

await test("a response that ended without message_stop is not continued", async () => {
  const server = await startStandIn((i) => ({
    frames:
      i === 0 ? toolTurn("msg_1", "toolu_1", false) : textTurn("done", "msg_2"),
  }));
  try {
    await runTurn(server.port, { messageThreads: true });
    assertEqual(server.calls.length, 2, "request count");
    assertEqual(
      JSON.stringify(server.calls[1].body.thread),
      '{"type":"create"}',
      "step 2 must not continue a cut-off response",
    );
  } finally {
    await server.close();
  }
});

await runSuite();
