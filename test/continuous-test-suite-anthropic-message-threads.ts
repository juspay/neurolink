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

async function startStandIn(
  reply: (index: number) => Reply,
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
      const answer = reply(calls.length - 1);
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

await runSuite();
