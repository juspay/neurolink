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

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { z } from "zod";
import { jsonSchema } from "../dist/index.js";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
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
  "STORAGE_TYPE",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

function withAnthropicEnv(port: number, storage = "memory"): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED) {
    saved[key] = process.env[key];
  }
  // An ambient STORAGE_TYPE=redis would point these cases at a real database.
  process.env.STORAGE_TYPE = storage;
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

async function startStandIn(
  reply: (index: number, body: Record<string, unknown>) => Reply,
  gate?: Promise<void>,
): Promise<StandIn> {
  const calls: Call[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", async () => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      calls.push({ body, headers: req.headers });
      const answer = reply(calls.length - 1, body);
      if (gate) {
        await gate;
      }
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

type SessionClient = {
  nl: InstanceType<typeof NeuroLink>;
  restore: () => void;
};

/** One NeuroLink with conversation memory on, for several calls of a session. */
function sessionClient(port: number): SessionClient {
  const restore = withAnthropicEnv(port);
  return {
    nl: new NeuroLink({ conversationMemory: { enabled: true } }),
    restore,
  };
}

async function sessionTurn(
  client: SessionClient,
  text: string,
  extra: Record<string, unknown> = {},
  sessionId = "s1",
): Promise<string> {
  const result = await client.nl.stream({
    input: { text },
    provider: "anthropic",
    disableInternalFallback: true,
    model: MODEL,
    maxTokens: 64,
    messageThreads: "session",
    context: { sessionId, userId: "u1" },
    ...extra,
  });
  let out = "";
  for await (const chunk of result.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      out += chunk.content;
    }
  }
  return out;
}

const threadOf = (call: Call): string => JSON.stringify(call.body.thread);

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

await test("session scope: the next call of the session continues the thread with only its new message", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question");
    await sessionTurn(client, "second question");
    assertEqual(server.calls.length, 2, "request count");
    assertEqual(
      threadOf(server.calls[0]),
      '{"type":"create"}',
      "call 1 thread",
    );
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "call 2 thread",
    );
    assertEqual(
      messagesOf(server.calls[1]).length,
      1,
      "call 2 sends only its new message",
    );
    assert(
      !("system" in server.calls[1].body),
      "a continue must not send system",
    );
    assert(
      !("tools" in server.calls[1].body),
      "a continue must not send tools",
    );
    assertEqual(
      server.calls[1].body.model,
      server.calls[0].body.model,
      "model is fixed",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: a call after a tool turn continues from the last response, with the tool blocks only the thread holds", async () => {
  const server = await startStandIn((i) => ({
    frames:
      i === 0
        ? toolTurn("msg_0", "toolu_0")
        : textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "look it up", { tools: lookupTool() });
    await sessionTurn(client, "and again", { tools: lookupTool() });
    assertEqual(server.calls.length, 3, "request count");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "step 2 of call 1 continues in-turn",
    );
    assertEqual(
      threadOf(server.calls[2]),
      '{"type":"continue","previous_message_id":"msg_1"}',
      "call 2 continues from the last response of call 1",
    );
    assertEqual(
      messagesOf(server.calls[2]).length,
      1,
      "call 2 sends only its new message",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope is opt-in: messageThreads true keeps a thread inside one call only", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question", { messageThreads: true });
    await sessionTurn(client, "second question", { messageThreads: true });
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "call 2 thread",
    );
    assertEqual(
      messagesOf(server.calls[1]).length,
      3,
      "call 2 resends the history",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: another session, a changed model or tool set never continues the thread", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question", {}, "alpha");
    await sessionTurn(client, "other session", {}, "beta");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "another session",
    );
    await sessionTurn(
      client,
      "same session, new model",
      { model: "claude-3-5-haiku-20241022" },
      "alpha",
    );
    assertEqual(
      threadOf(server.calls[2]),
      '{"type":"create"}',
      "another model",
    );
    await sessionTurn(
      client,
      "same session, new tools",
      { tools: lookupTool() },
      "alpha",
    );
    assertEqual(
      threadOf(server.calls[3]),
      '{"type":"create"}',
      "another tool set",
    );
    assert(
      messagesOf(server.calls[3]).length > 1,
      "a new thread resends the history",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: clearing the conversation forgets the thread locally", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question");
    assert(
      client.nl.anthropicThreadStore.size === 1,
      "a thread was left for the session",
    );
    await client.nl.clearConversationSession("s1");
    assert(
      client.nl.anthropicThreadStore.size === 0,
      "the thread was forgotten",
    );
    await sessionTurn(client, "after clearing");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "call 2 thread",
    );
    assertEqual(
      messagesOf(server.calls[1]).length,
      1,
      "the history is gone too",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: a thread the server no longer has is recreated from the full history", async () => {
  const server = await startStandIn((i) => {
    if (i === 1) {
      return threadError(404, "thread_not_found");
    }
    return { frames: textTurn(`answer ${i}`, `msg_${i}`) };
  });
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question");
    const text = await sessionTurn(client, "second question");
    assert(
      text.includes("answer 2"),
      "the call did not finish after the replay",
    );
    assertEqual(server.calls.length, 3, "request count");
    assertEqual(
      threadOf(server.calls[2]),
      '{"type":"create"}',
      "replay thread",
    );
    assertEqual(
      messagesOf(server.calls[2]).length,
      3,
      "the replay carries the whole history",
    );
    assert(
      server.calls[2].body.system !== undefined,
      "the replay declares system again",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

const carryOf = (id = "msg_x") => ({
  previousMessageId: id,
  fingerprint: "fp",
  anchor: ["a"],
});

await test("store: a call that started before a clear cannot leave its thread afterwards", async () => {
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  const store = nl.anthropicThreadStore;
  const epoch = store.epochOf("s1");
  store.forget("s1");
  store.put("k", "s1", carryOf(), epoch);
  assertEqual(store.size, 0, "a stale call left a thread");
  store.put("k", "s1", carryOf(), store.epochOf("s1"));
  assertEqual(
    store.size,
    1,
    "a call that started after the clear should keep one",
  );
  const other = store.epochOf("s2");
  store.forget("s1");
  store.put("k2", "s2", carryOf(), other);
  assertEqual(store.size, 1, "clearing s1 must not fence s2");
  const before = store.epochOf("s3");
  store.forget();
  store.put("k3", "s3", carryOf(), before);
  assertEqual(store.size, 0, "clearing everything fences every call");
  await nl.dispose();
});

await test("store: entries expire without another call, and forget() empties it", async () => {
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  const store = nl.anthropicThreadStore;
  store.put("k", "s1", carryOf(), store.epochOf("s1"), 1_000);
  store.sweep(1_000 + 10 * 60 * 1000);
  assertEqual(store.size, 0, "an expired entry survived the sweep");
  assertEqual(store.take("k"), undefined, "an expired entry was handed out");
  store.put("k", "s1", carryOf(), store.epochOf("s1"));
  store.forget();
  assertEqual(store.size, 0, "forget() should empty the store");
  await nl.dispose();
});

// generate() is non-streaming: the stand-in answers with a message object.
const jsonText = (text: string, id: string) => ({
  status: 200,
  json: {
    id,
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 4 },
  },
});
const jsonTool = (id: string, toolUseId: string) => ({
  status: 200,
  json: {
    id,
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "tool_use", id: toolUseId, name: "lookup", input: {} }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 6 },
  },
});

async function sessionGenerate(
  client: SessionClient,
  text: string,
  extra: Record<string, unknown> = {},
  sessionId = "s1",
): Promise<string> {
  const result = await client.nl.generate({
    input: { text },
    provider: "anthropic",
    disableInternalFallback: true,
    model: MODEL,
    maxTokens: 64,
    messageThreads: "session",
    context: { sessionId, userId: "u1" },
    ...extra,
  });
  return result.content;
}

await test("generate: messageThreads true threads the steps of a tool turn", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? jsonTool("msg_0", "toolu_0") : jsonText("done", `msg_${i}`),
  );
  const restore = withAnthropicEnv(server.port);
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const out = await nl.generate({
      input: { text: "look it up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 64,
      messageThreads: true,
      tools: lookupTool(),
    });
    assert(out.content.includes("done"), "the turn did not finish");
    assertEqual(server.calls.length, 2, "request count");
    assertEqual(threadOf(server.calls[0]), '{"type":"create"}', "step 1");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "step 2",
    );
    assert(
      !("system" in server.calls[1].body),
      "a continue must not send system",
    );
    assert(
      !("tools" in server.calls[1].body),
      "a continue must not send tools",
    );
    assert(
      String(server.calls[1].headers["anthropic-beta"]).includes(
        "message-threads-2026-08-12",
      ),
      "the thread beta header is missing",
    );
    assert(
      !("stream" in server.calls[0].body) ||
        server.calls[0].body.stream === false,
      "generate must stay non-streaming",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("generate: without messageThreads nothing carries a thread", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? jsonTool("msg_0", "toolu_0") : jsonText("done", `msg_${i}`),
  );
  const restore = withAnthropicEnv(server.port);
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    await nl.generate({
      input: { text: "look it up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 64,
      tools: lookupTool(),
    });
    for (const call of server.calls) {
      assert(!("thread" in call.body), "an unthreaded call sent a thread");
    }
  } finally {
    restore();
    await server.close();
  }
});

await test("generate: a session continues across generate() calls, and a stream() call can continue it too", async () => {
  const server = await startStandIn((i) =>
    i === 2
      ? { frames: textTurn("streamed", "msg_2") }
      : jsonText(`answer ${i}`, `msg_${i}`),
  );
  const client = sessionClient(server.port);
  try {
    await sessionGenerate(client, "first question");
    await sessionGenerate(client, "second question");
    assertEqual(threadOf(server.calls[0]), '{"type":"create"}', "call 1");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "call 2",
    );
    assertEqual(
      messagesOf(server.calls[1]).length,
      1,
      "call 2 sends only its new message",
    );
    await sessionTurn(client, "third question");
    assertEqual(
      threadOf(server.calls[2]),
      '{"type":"continue","previous_message_id":"msg_1"}',
      "a stream() call after generate() calls",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("generate: a thread the server no longer has is recreated from the full history", async () => {
  const server = await startStandIn((i) =>
    i === 1
      ? threadError(404, "thread_not_found")
      : jsonText(`answer ${i}`, `msg_${i}`),
  );
  const client = sessionClient(server.port);
  try {
    await sessionGenerate(client, "first question");
    const out = await sessionGenerate(client, "second question");
    assert(
      out.includes("answer 2"),
      "the call did not finish after the replay",
    );
    assertEqual(server.calls.length, 3, "request count");
    assertEqual(threadOf(server.calls[2]), '{"type":"create"}', "replay");
    assertEqual(
      messagesOf(server.calls[2]).length,
      3,
      "the replay carries the whole history",
    );
    client.nl.anthropicThreadStore.forget();
  } finally {
    client.restore();
    await server.close();
  }
});

await test("generate: a request the API cannot thread is sent again without a thread and the call still finishes", async () => {
  const server = await startStandIn((i) =>
    i === 0
      ? threadError(400, "thread_unsupported_request")
      : jsonText(`answer ${i}`, `msg_${i}`),
  );
  const restore = withAnthropicEnv(server.port);
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const out = await nl.generate({
      input: { text: "hello" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 64,
      messageThreads: true,
    });
    assert(out.content.includes("answer 1"), "the call did not finish");
    assertEqual(server.calls.length, 2, "request count");
    assertEqual(
      threadOf(server.calls[0]),
      '{"type":"create"}',
      "first request",
    );
    assert(
      !("thread" in server.calls[1].body),
      "the retry must carry no thread",
    );
  } finally {
    restore();
    await server.close();
  }
});

// ── Redis conversation memory ──────────────────────────────────────────────
// A throwaway redis-server on a free loopback port, so no ambient Redis is
// touched. Skipped (not failed) when no redis-server binary is installed.
const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => (port ? resolve(port) : reject(new Error("no port"))));
    });
  });

// NeuroLink falls back to in-process memory when Redis cannot be reached, which
// would let a "Redis" case pass without Redis. Count the keys the server holds.
const redisKeyCount = (port: number, password?: string): number => {
  const out = spawnSync(
    "redis-cli",
    [
      "-p",
      String(port),
      ...(password ? ["-a", password, "--no-auth-warning"] : []),
      "dbsize",
    ],
    { encoding: "utf8" },
  );
  return Number.parseInt(out.stdout?.trim() ?? "0", 10) || 0;
};

async function startRedis(password?: string): Promise<{
  port: number;
  stop: () => void;
} | null> {
  if (spawnSync("redis-server", ["--version"]).status !== 0) {
    return null;
  }
  const port = await freePort();
  const child: ChildProcess = spawn(
    "redis-server",
    [
      "--port",
      String(port),
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
      ...(password ? ["--requirepass", password] : []),
    ],
    { stdio: "ignore" },
  );
  const until = Date.now() + 10_000;
  for (;;) {
    const ping = spawnSync(
      "redis-cli",
      [
        "-p",
        String(port),
        ...(password ? ["-a", password, "--no-auth-warning"] : []),
        "ping",
      ],
      { encoding: "utf8" },
    );
    if (ping.stdout?.trim() === "PONG") {
      break;
    }
    if (Date.now() > until) {
      child.kill();
      throw new Error("redis-server did not start");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { port, stop: () => void child.kill() };
}

await test("redis memory: a session continues the thread across calls from the history Redis rebuilt", async () => {
  const redis = await startRedis();
  if (redis === null) {
    throw new Skip("no redis-server binary on PATH");
  }
  const server = await startStandIn((i, body) =>
    body.stream === true
      ? { frames: textTurn(`answer ${i}`, `msg_${i}`) }
      : jsonText("A Title", `title_${i}`),
  );
  // Title generation is a separate, non-streaming request; the session's own
  // requests are the streaming ones.
  const turns = () => server.calls.filter((c) => c.body.stream === true);
  const restore = withAnthropicEnv(server.port, "redis");
  const nl = new NeuroLink({
    conversationMemory: {
      enabled: true,
      // Title generation makes its own generate() call, which defaults to
      // Vertex: keep it on the loopback stand-in so the case stays offline.
      summarizationProvider: "anthropic",
      summarizationModel: MODEL,
      redisConfig: {
        host: "127.0.0.1",
        port: redis.port,
        keyPrefix: `threads-test-${process.pid}:`,
      },
    },
  });
  const client: SessionClient = { nl, restore: () => undefined };
  try {
    await sessionTurn(client, "first question");
    await sessionTurn(client, "second question");
    assert(
      redisKeyCount(redis.port) > 0,
      "the history never reached Redis (silent in-memory fallback)",
    );
    assertEqual(threadOf(turns()[0]), '{"type":"create"}', "call 1");
    assertEqual(
      threadOf(turns()[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "call 2 continues from the history Redis rebuilt",
    );
    assertEqual(
      messagesOf(turns()[1]).length,
      1,
      "call 2 sends only its new message",
    );
    // Replacing the stored messages (as an erasure or a redaction does) must
    // drop the thread here too, not only on the in-process store.
    await nl.setSessionMessages("s1", [], "u1");
    assertEqual(nl.anthropicThreadStore.size, 0, "the thread was forgotten");
    await sessionTurn(client, "after replacing the messages");
    assertEqual(threadOf(turns()[2]), '{"type":"create"}', "call 3");
    assertEqual(
      messagesOf(turns()[2]).length,
      1,
      "the replaced history is gone from Redis",
    );
  } finally {
    restore();
    await server.close();
    await nl.dispose().catch(() => undefined);
    redis.stop();
  }
});

await test("redis memory with a password: a session continues the thread from the history Redis rebuilt", async () => {
  const redis = await startRedis("threads-test-pw");
  if (redis === null) {
    throw new Skip("no redis-server binary on PATH");
  }
  const server = await startStandIn((i, body) =>
    body.stream === true
      ? { frames: textTurn(`answer ${i}`, `msg_${i}`) }
      : jsonText("A Title", `title_${i}`),
  );
  // Title generation is a separate, non-streaming request; the session's own
  // requests are the streaming ones.
  const turns = () => server.calls.filter((c) => c.body.stream === true);
  const restore = withAnthropicEnv(server.port, "redis");
  const nl = new NeuroLink({
    conversationMemory: {
      enabled: true,
      summarizationProvider: "anthropic",
      summarizationModel: MODEL,
      redisConfig: {
        host: "127.0.0.1",
        port: redis.port,
        password: "threads-test-pw",
        keyPrefix: `threads-pw-${process.pid}:`,
      },
    },
  });
  const client: SessionClient = { nl, restore: () => undefined };
  try {
    await sessionTurn(client, "first question");
    await sessionTurn(client, "second question");
    assert(
      redisKeyCount(redis.port, "threads-test-pw") > 0,
      "the history never reached the authenticated Redis (silent in-memory fallback)",
    );
    assertEqual(
      threadOf(turns()[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "call 2 continues from the history an authenticated Redis rebuilt",
    );
    assertEqual(
      messagesOf(turns()[1]).length,
      1,
      "call 2 sends only its new message",
    );
  } finally {
    restore();
    await server.close();
    await nl.dispose().catch(() => undefined);
    redis.stop();
  }
});

await test("concurrency: eight simultaneous sessions each keep their own thread, and no thread is continued twice", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    const ids = Array.from({ length: 8 }, (_, i) => `load-${i}`);
    await Promise.all(
      ids.map((id) => sessionTurn(client, `hello ${id}`, {}, id)),
    );
    const firstRound = server.calls.length;
    assertEqual(firstRound, 8, "first round request count");
    await Promise.all(
      ids.map((id) => sessionTurn(client, `again ${id}`, {}, id)),
    );
    const second = server.calls.slice(firstRound);
    assertEqual(second.length, 8, "second round request count");
    const previous = second.map(
      (c) =>
        (c.body.thread as { previous_message_id?: string }).previous_message_id,
    );
    assert(
      second.every(
        (c) => (c.body.thread as { type: string }).type === "continue",
      ),
      "every session should have continued its own thread",
    );
    assertEqual(
      new Set(previous).size,
      8,
      "each session continued a different response id",
    );
    assert(
      previous.every((p) => typeof p === "string" && p.startsWith("msg_")),
      "a continue named an id the server never issued",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: a stream that finishes after its conversation was cleared leaves no thread", async () => {
  const gate = Promise.withResolvers<void>();
  const server = await startStandIn(
    (i) => ({ frames: textTurn(`answer ${i}`, `msg_${i}`) }),
    gate.promise,
  );
  const client = sessionClient(server.port);
  try {
    const first = sessionTurn(client, "first question");
    const until = Date.now() + 10_000;
    while (server.calls.length === 0 && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assertEqual(
      server.calls.length,
      1,
      "the first request should be in flight",
    );
    await client.nl.clearConversationSession("s1");
    gate.resolve();
    await first;
    assertEqual(
      client.nl.anthropicThreadStore.size,
      0,
      "the cleared conversation got its thread back",
    );
    await sessionTurn(client, "second question");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "call 2 thread",
    );
  } finally {
    gate.resolve();
    client.restore();
    await server.close();
  }
});

await test("session scope: a call whose first message carried an image does not continue the thread", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  // A 1x1 PNG, so the request is a real image turn.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  try {
    await sessionTurn(client, "describe this", {
      input: { text: "describe this", images: [png] },
    });
    await sessionTurn(client, "and now?");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "call 2 thread",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: replacing the session's messages forgets the thread, so redacted history is not shadowed", async () => {
  const server = await startStandIn((i) => ({
    frames:
      i === 0
        ? toolTurn("msg_0", "toolu_0")
        : textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "look it up", { tools: lookupTool() });
    assertEqual(
      client.nl.anthropicThreadStore.size,
      1,
      "a thread was left for the session",
    );
    const messages = await client.nl.getSessionMessages("s1", "u1");
    await client.nl.setSessionMessages(
      "s1",
      messages.filter(
        (m) => m.role !== "tool_call" && m.role !== "tool_result",
      ),
      "u1",
    );
    assertEqual(
      client.nl.anthropicThreadStore.size,
      0,
      "the thread survived the replacement",
    );
    await sessionTurn(client, "and again", { tools: lookupTool() });
    assertEqual(
      threadOf(server.calls[2]),
      '{"type":"create"}',
      "call 2 thread",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("session scope: two numeric user ids in one session do not share a thread", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question", {
      context: { sessionId: "s1", userId: 1 },
    });
    await sessionTurn(client, "second question", {
      context: { sessionId: "s1", userId: 2 },
    });
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"create"}',
      "user 2 must not continue user 1's thread",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("clearing and disposing forget the thread even when conversation memory is off", async () => {
  const restore = withAnthropicEnv(1);
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const put = (sessionId: string) =>
      nl.anthropicThreadStore.put(
        `k-${sessionId}`,
        sessionId,
        carryOf(),
        nl.anthropicThreadStore.epochOf(sessionId),
      );
    put("s1");
    await nl.clearConversationSession("s1").catch(() => undefined);
    assertEqual(
      nl.anthropicThreadStore.size,
      0,
      "clearConversationSession kept the thread",
    );
    put("s2");
    await nl.clearAllConversations().catch(() => undefined);
    assertEqual(
      nl.anthropicThreadStore.size,
      0,
      "clearAllConversations kept the thread",
    );
    put("s3");
    await nl.dispose();
    assertEqual(nl.anthropicThreadStore.size, 0, "dispose kept the thread");
  } finally {
    restore();
  }
});

const thinkingTurn = (id: string, text: string): string[] => [
  sse("message_start", {
    message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
  }),
  sse("content_block_start", {
    index: 0,
    content_block: { type: "thinking", thinking: "" },
  }),
  sse("content_block_delta", {
    index: 0,
    delta: { type: "thinking_delta", thinking: "let me think" },
  }),
  sse("content_block_delta", {
    index: 0,
    delta: { type: "signature_delta", signature: "sig-1" },
  }),
  sse("content_block_stop", { index: 0 }),
  sse("content_block_start", {
    index: 1,
    content_block: { type: "text", text: "" },
  }),
  sse("content_block_delta", { index: 1, delta: { type: "text_delta", text } }),
  sse("content_block_stop", { index: 1 }),
  sse("message_delta", {
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 4 },
  }),
  sse("message_stop", {}),
];

const thinkingOn = {
  thinkingConfig: { enabled: true, type: "enabled", budgetTokens: 1024 },
  maxTokens: 4096,
};

await test("thinking: an extended-thinking tool turn sends a thread, keeps thinking fixed, and completes", async () => {
  const server = await startStandIn((i) => ({
    frames:
      i === 0 ? toolTurn("msg_0", "toolu_0") : thinkingTurn(`msg_${i}`, "done"),
  }));
  try {
    const text = await runTurn(server.port, {
      messageThreads: true,
      ...thinkingOn,
    });
    assert(text.includes("done"), "the thinking turn did not finish");
    assertEqual(server.calls.length, 2, "request count");
    assertEqual(threadOf(server.calls[0]), '{"type":"create"}', "step 1");
    assert(server.calls[0].body.thinking !== undefined, "step 1 lost thinking");
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "step 2 continues",
    );
    assert(!("tools" in server.calls[1].body), "a continue sends no tools");
  } finally {
    await server.close();
  }
});

await test("thinking: a session call after a thinking turn continues, and a changed budget starts a new thread", async () => {
  const server = await startStandIn((i) => ({
    frames: thinkingTurn(`msg_${i}`, `answer ${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question", thinkingOn);
    await sessionTurn(client, "second question", thinkingOn);
    assertEqual(
      threadOf(server.calls[1]),
      '{"type":"continue","previous_message_id":"msg_0"}',
      "same thinking continues",
    );
    await sessionTurn(client, "third question", {
      ...thinkingOn,
      thinkingConfig: { enabled: true, type: "enabled", budgetTokens: 2048 },
    });
    assertEqual(threadOf(server.calls[2]), '{"type":"create"}', "new budget");
  } finally {
    client.restore();
    await server.close();
  }
});

await test("structured output: a schema turn never leaves a session thread", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn('{"title":"x"}', `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "answer in json", {
      schema: z.object({ title: z.string() }),
    });
    assertEqual(client.nl.anthropicThreadStore.size, 0, "a thread was left");
    await sessionTurn(client, "again", {
      schema: z.object({ title: z.string() }),
    });
    assertEqual(threadOf(server.calls[1]), '{"type":"create"}', "call 2");
  } finally {
    client.restore();
    await server.close();
  }
});

await test("concurrency: two simultaneous calls of one session both finish and only one continues", async () => {
  const server = await startStandIn((i) => ({
    frames: textTurn(`answer ${i}`, `msg_${i}`),
  }));
  const client = sessionClient(server.port);
  try {
    await sessionTurn(client, "first question");
    const [a, b] = await Promise.all([
      sessionTurn(client, "second question"),
      sessionTurn(client, "third question"),
    ]);
    assert(a.length > 0 && b.length > 0, "a concurrent call produced nothing");
    assertEqual(server.calls.length, 3, "request count");
    const kinds = [server.calls[1], server.calls[2]]
      .map((c) => (c.body.thread as { type: string }).type)
      .sort();
    assertEqual(
      kinds.join(","),
      "continue,create",
      "one continues, one creates",
    );
  } finally {
    client.restore();
    await server.close();
  }
});

await test("reclaim: a turn whose history is cut mid-turn starts a new thread and still completes", async () => {
  // The guard trips on the prompt size the provider reports, so the tool turns
  // report a nearly full window and carry a large tool result.
  const filled = (frames: string[]): string[] =>
    frames.map((f) => f.replace('"input_tokens":5', '"input_tokens":195000'));
  const server = await startStandIn((i) => ({
    frames:
      i < 3
        ? filled(toolTurn(`msg_${i}`, `toolu_${i}`))
        : textTurn("done", `msg_${i}`),
  }));
  try {
    const record: Record<string, Tool> = {
      lookup: {
        description: "look a value up",
        inputSchema: jsonSchema({
          type: "object",
          properties: {},
          additionalProperties: true,
        }),
        execute: async () => ({ blob: "x".repeat(400_000) }),
      },
    };
    const text = await runTurn(server.port, {
      messageThreads: true,
      tools: record,
      maxSteps: 6,
    });
    assert(text.includes("done"), "the turn did not finish after reclaim");
    const kinds = server.calls.map(
      (c) => (c.body.thread as { type: string } | undefined)?.type ?? "none",
    );
    assert(
      kinds.slice(1).includes("create"),
      "no reclaim happened, so the rewritten-history path was not exercised",
    );
  } finally {
    await server.close();
  }
});

await runSuite();
