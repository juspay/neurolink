#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — replaying a session's tool steps on later turns.
 *
 * A session that called a tool on turn 1 stores `tool_call` / `tool_result`
 * rows. Until `replayToolSteps` existed those rows were dropped from every
 * prompt the message builder produced, so on turn 2 the direct Anthropic,
 * OpenAI-compatible and SageMaker paths saw only the surface text — the
 * model had no record of having called anything. And generate() never
 * persisted tool rows at all, so a generated tool turn left no trace even
 * for the providers that replay natively.
 *
 * Everything here drives the shipped surface: `new NeuroLink()` from
 * `../dist/index.js` with in-memory conversation memory and a `registerTool`
 * tool. The real Anthropic SDK is redirected at a local stand-in via
 * `ANTHROPIC_BASE_URL`. The stand-in answers non-streaming requests with a
 * Messages JSON body and streaming ones with genuine SSE framing, so the
 * SDK's own parsing runs on both the generate() and stream() paths.
 *
 * What is asserted is the outbound request body of the SECOND turn — the
 * bytes the model actually receives — under each replay mode:
 *
 *   "full"   → real tool_use / tool_result blocks naming the tool and args
 *   "marker" → the compact `[called <tool> → ok]` line (the default)
 *   "off"    → neither
 *
 * Every case sets `ANTHROPIC_AUTH_METHOD=api_key` and pins the env around
 * itself, for the same reason the loop-characterization suite does: an
 * ambient OAuth credentials file would otherwise route auth elsewhere.
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-tool-replay.ts
 */

import { createServer, type Server } from "node:http";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { NeuroLink } = await import("../dist/index.js");

const { test, section, runSuite } = defineSuite("Tool step replay", {
  // Every request goes to a 127.0.0.1 stand-in; a hang here is a defect.
  offline: true,
});

const MODEL = "claude-3-5-sonnet-20241022";
const TOOL_NAME = "lookup_order";
const TOOL_ARGS = { orderId: "ord_4471" };
const TOOL_OUTPUT = { status: "shipped", carrier: "DHL" };

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

type Block = Record<string, unknown>;

/** A non-streaming Messages response body. */
function jsonReply(blocks: Block[], stopReason: string): string {
  return JSON.stringify({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: blocks,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 4 },
  });
}

function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** The same turn as `jsonReply`, in SSE framing. */
function sseReply(blocks: Block[], stopReason: string): string[] {
  const frames = [
    sse("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
  ];
  blocks.forEach((block, index) => {
    if (block.type === "text") {
      frames.push(
        sse("content_block_start", {
          index,
          content_block: { type: "text", text: "" },
        }),
        sse("content_block_delta", {
          index,
          delta: { type: "text_delta", text: block.text },
        }),
        sse("content_block_stop", { index }),
      );
    } else {
      frames.push(
        sse("content_block_start", {
          index,
          content_block: {
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: {},
          },
        }),
        sse("content_block_delta", {
          index,
          delta: {
            type: "input_json_delta",
            partial_json: JSON.stringify(block.input),
          },
        }),
        sse("content_block_stop", { index }),
      );
    }
  });
  frames.push(
    sse("message_delta", {
      delta: { stop_reason: stopReason },
      usage: { output_tokens: 4 },
    }),
    sse("message_stop", {}),
  );
  return frames;
}

const textBlocks = (text: string): Block[] => [{ type: "text", text }];
const toolBlocks = (): Block[] => [
  { type: "tool_use", id: "toolu_1", name: TOOL_NAME, input: TOOL_ARGS },
];

type StandIn = {
  bodies: Array<Record<string, unknown>>;
  port: number;
  close: () => Promise<void>;
};

/**
 * One request → one canned turn, chosen by request index. Non-streaming
 * requests get a JSON body, streaming ones the SSE frames of the same turn.
 */
async function startStandIn(
  turn: (index: number) => { blocks: Block[]; stop: string },
): Promise<StandIn> {
  const bodies: Array<Record<string, unknown>> = [];
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
      const body = parseBody();
      bodies.push(body);
      const { blocks, stop } = turn(bodies.length - 1);
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const frame of sseReply(blocks, stop)) {
          res.write(frame);
        }
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(jsonReply(blocks, stop));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    bodies,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/** Requests 0 and 1 are turn 1 (tool call, then answer); request 2 is turn 2. */
const twoTurnScript = (index: number): { blocks: Block[]; stop: string } =>
  index === 0
    ? { blocks: toolBlocks(), stop: "tool_use" }
    : { blocks: textBlocks(`answer ${index}`), stop: "end_turn" };

/** Every content block of every message in a captured request body. */
function blocksOf(body: Record<string, unknown> | undefined): Block[] {
  const messages = (body?.messages ?? []) as Array<{ content?: unknown }>;
  const out: Block[] = [];
  for (const message of messages) {
    if (typeof message.content === "string") {
      out.push({ type: "text", text: message.content });
    } else if (Array.isArray(message.content)) {
      out.push(...(message.content as Block[]));
    }
  }
  return out;
}

function textOf(body: Record<string, unknown> | undefined): string {
  return blocksOf(body)
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

const MARKER = `[called ${TOOL_NAME} → ok]`;

type ReplayMode = "full" | "marker" | "off";

function createSdk(replayToolSteps?: ReplayMode) {
  const nl = new NeuroLink({
    conversationMemory: {
      enabled: true,
      ...(replayToolSteps ? { replayToolSteps } : {}),
    },
  });
  let executions = 0;
  nl.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: "Look an order up",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
    },
    execute: async () => {
      executions++;
      return TOOL_OUTPUT;
    },
  });
  return { nl, executions: () => executions };
}

/**
 * Turn 1 through generate() (which calls the tool), then turn 2 through
 * generate() in the same session. Returns the body of turn 2's request.
 */
async function runTwoGenerateTurns(
  replayToolSteps: ReplayMode | undefined,
  sessionId: string,
): Promise<{
  secondTurnBody: Record<string, unknown> | undefined;
  requestCount: number;
  toolExecutions: number;
  sdk: InstanceType<typeof NeuroLink>;
}> {
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const { nl, executions } = createSdk(replayToolSteps);
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    await nl.generate({ ...common, input: { text: "and the carrier?" } });
    return {
      secondTurnBody: server.bodies[2],
      requestCount: server.bodies.length,
      toolExecutions: executions(),
      sdk: nl,
    };
  } finally {
    restore();
    await server.close();
  }
}

section("generate() persists tool steps");

await test("a generated tool turn stores paired tool_call / tool_result rows", async () => {
  const sessionId = `replay-store-${Date.now()}`;
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const { nl, executions } = createSdk();
  try {
    await nl.generate({
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
      input: { text: "where is order ord_4471?" },
    });
    assert(executions() === 1, "precondition failed: the tool did not run");
    const rows = await nl.getSessionMessages(sessionId);
    const calls = rows.filter((r) => r.role === "tool_call");
    const results = rows.filter((r) => r.role === "tool_result");
    assert(calls.length === 1, "generate() did not persist a tool_call row");
    assert(
      results.length === 1,
      "generate() did not persist a tool_result row",
    );
    assert(
      calls[0].tool === TOOL_NAME && results[0].tool === TOOL_NAME,
      "the persisted rows do not name the tool that ran",
    );
    assert(
      JSON.stringify(calls[0].args) === JSON.stringify(TOOL_ARGS),
      "the persisted tool_call row lost the call's arguments",
    );
    assert(
      typeof calls[0].toolCallId === "string" &&
        calls[0].toolCallId === results[0].toolCallId,
      "the persisted call and result are not paired by toolCallId",
    );
    assert(
      results[0].content.includes("shipped"),
      "the persisted tool_result row lost the tool's output",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("replay modes on the next turn (generate)");

await test('"full" replays real tool_use / tool_result blocks', async () => {
  const run = await runTwoGenerateTurns("full", `replay-full-${Date.now()}`);
  assert(
    run.requestCount === 3,
    "precondition failed: two turns should take exactly three requests",
  );
  assert(run.toolExecutions === 1, "precondition failed: tool ran != 1 time");
  const blocks = blocksOf(run.secondTurnBody);
  const use = blocks.find((b) => b.type === "tool_use");
  const result = blocks.find((b) => b.type === "tool_result");
  assert(use !== undefined, "turn 2 carried no tool_use block");
  assert(result !== undefined, "turn 2 carried no tool_result block");
  assert(use?.name === TOOL_NAME, "the replayed tool_use names the wrong tool");
  assert(
    JSON.stringify(use?.input) === JSON.stringify(TOOL_ARGS),
    "the replayed tool_use lost the call's arguments",
  );
  assert(
    use?.id === result?.tool_use_id,
    "the replayed tool_result does not reference its tool_use",
  );
  assert(
    String(result?.content ?? "").includes("shipped"),
    "the replayed tool_result lost the tool's output",
  );
  assert(
    !textOf(run.secondTurnBody).includes(MARKER),
    '"full" must not also emit the marker line',
  );
  // Ordering: the tool step must follow the user turn that prompted it and
  // precede the assistant's answer — Anthropic rejects a tool_use before the
  // first user message outright.
  const messages = (run.secondTurnBody?.messages ?? []) as Array<{
    role: string;
    content: unknown;
  }>;
  const firstRole = messages[0]?.role;
  assert(
    firstRole === "user",
    "the replayed history does not open with a user turn",
  );
  const useIndex = messages.findIndex(
    (m) =>
      Array.isArray(m.content) &&
      (m.content as Block[]).some((b) => b.type === "tool_use"),
  );
  const answerIndex = messages.findIndex(
    (m) =>
      m.role === "assistant" &&
      (typeof m.content === "string"
        ? m.content.includes("answer 1")
        : (m.content as Block[]).some(
            (b) => typeof b.text === "string" && b.text.includes("answer 1"),
          )),
  );
  assert(
    useIndex > 0 && answerIndex > useIndex,
    "the replayed tool step is not between the question and the answer",
  );
});

await test('"marker" (the default) folds a compact marker into the assistant turn', async () => {
  const run = await runTwoGenerateTurns(undefined, `replay-mark-${Date.now()}`);
  assert(
    run.requestCount === 3,
    "precondition failed: expected three requests",
  );
  const blocks = blocksOf(run.secondTurnBody);
  assert(
    !blocks.some((b) => b.type === "tool_use" || b.type === "tool_result"),
    "the default mode must not replay raw tool blocks",
  );
  const text = textOf(run.secondTurnBody);
  assert(text.includes(MARKER), "turn 2 carried no tool-call marker");
  // Folded INTO the assistant turn: the marker and the answer must sit in
  // the SAME message. `textOf` joins every message with "\n", so a marker
  // emitted as its own assistant message right before the answer would
  // still satisfy a substring check on the flattened text.
  const messages = (run.secondTurnBody?.messages ?? []) as Array<{
    role: string;
    content: unknown;
  }>;
  const messageText = (m: { content: unknown }): string =>
    typeof m.content === "string"
      ? m.content
      : ((m.content as Block[]) ?? [])
          .filter((b) => b.type === "text" && typeof b.text === "string")
          .map((b) => b.text as string)
          .join("\n");
  const folded = messages.find(
    (m) =>
      m.role === "assistant" &&
      messageText(m).includes(MARKER) &&
      messageText(m).includes("answer 1"),
  );
  assert(
    folded !== undefined,
    "the marker is not folded into the assistant turn that answered",
  );
  assert(
    messages.filter((m) => messageText(m).includes(MARKER)).length === 1,
    "the marker appears in more than one message",
  );
});

await test('"off" drops tool steps from the prompt', async () => {
  const run = await runTwoGenerateTurns("off", `replay-off-${Date.now()}`);
  assert(
    run.requestCount === 3,
    "precondition failed: expected three requests",
  );
  const blocks = blocksOf(run.secondTurnBody);
  assert(
    !blocks.some((b) => b.type === "tool_use" || b.type === "tool_result"),
    '"off" replayed raw tool blocks',
  );
  assert(
    !textOf(run.secondTurnBody).includes(MARKER),
    '"off" emitted a marker',
  );
  // The surface turns are still there.
  assert(
    textOf(run.secondTurnBody).includes("answer 1"),
    '"off" lost the previous assistant answer',
  );
});

await test("the per-request option overrides the instance default", async () => {
  const sessionId = `replay-override-${Date.now()}`;
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const { nl } = createSdk("off");
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    await nl.generate({
      ...common,
      replayToolSteps: "full",
      input: { text: "and the carrier?" },
    });
    assert(
      blocksOf(server.bodies[2]).some((b) => b.type === "tool_use"),
      "replayToolSteps on the request did not override the instance's off",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("stream() path");

await test("a streamed tool turn is replayed on the next streamed turn, and toolsUsed names the tool", async () => {
  const sessionId = `replay-stream-${Date.now()}`;
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const { nl, executions } = createSdk("full");
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
    } as const;
    const first = await nl.stream({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    for await (const _chunk of first.stream) {
      // drain
    }
    assert(executions() === 1, "precondition failed: the tool did not run");
    // The direct Anthropic stream result used to return toolCalls: [] and
    // never surfaced toolsUsed at all, so every tool on this path reported
    // as unused.
    assert(
      Array.isArray(first.toolsUsed) && first.toolsUsed.includes(TOOL_NAME),
      "the stream result's toolsUsed does not name the tool that ran",
    );
    assert(
      Array.isArray(first.toolCalls) &&
        first.toolCalls.some((c) => c.toolName === TOOL_NAME),
      "the stream result's toolCalls does not name the tool that ran",
    );
    assert(
      Array.isArray(first.toolExecutions) && first.toolExecutions.length === 1,
      "the stream result's toolExecutions does not record the execution",
    );
    const second = await nl.stream({
      ...common,
      input: { text: "and the carrier?" },
    });
    for await (const _chunk of second.stream) {
      // drain
    }
    assert(
      server.bodies.length === 3,
      "precondition failed: two streamed turns should take three requests",
    );
    const blocks = blocksOf(server.bodies[2]);
    assert(
      blocks.some((b) => b.type === "tool_use" && b.name === TOOL_NAME),
      "the streamed turn 2 carried no replayed tool_use block",
    );
    assert(
      blocks.some((b) => b.type === "tool_result"),
      "the streamed turn 2 carried no replayed tool_result block",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("failed calls, placeholders and ids");

/**
 * Turn 1 calls a tool that FAILS, then answers; turn 2 replays. `mode` picks
 * the replay mode of turn 2; `failure` picks how the tool fails: a
 * registerTool tool whose execute throws (neurolink.executeTool converts the
 * throw into an `{ isError: true, content }` result the loop receives as a
 * normal return), a per-call tool that RETURNS that shape itself, as an MCP
 * server does for an upstream failure, or one that returns the
 * `{ error: "…" }` object docs/sdk-custom-tools.md recommends — which was
 * stored as `success: true` and replayed as `→ ok` while the same call's
 * `toolExecutions[].isError` said true.
 */
type ToolFailure = "throws" | "returns-isError" | "returns-error-key";

const FAILURE_LABEL: Record<ToolFailure, string> = {
  throws: "throws",
  "returns-isError": "returns isError",
  "returns-error-key": "returns { error }",
};

async function runFailedToolTurns(
  mode: ReplayMode,
  failure: ToolFailure,
  sessionId: string,
): Promise<Record<string, unknown> | undefined> {
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, replayToolSteps: mode },
  });
  const failing =
    failure === "throws"
      ? async () => {
          throw new Error("upstream 403 from the order service");
        }
      : failure === "returns-isError"
        ? async () => ({
            isError: true,
            content: [
              { type: "text", text: "upstream 403 from the order service" },
            ],
          })
        : async () => ({ error: "upstream 403 from the order service" });
  nl.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: "Look an order up",
    inputSchema: {
      type: "object",
      properties: { orderId: { type: "string" } },
    },
    execute: failing,
  });
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    const rows = await nl.getSessionMessages(sessionId);
    const result = rows.find((r) => r.role === "tool_result");
    assert(result !== undefined, "precondition failed: no tool_result stored");
    assert(
      result?.result?.success === false,
      "the stored tool_result row reports success for a failed call",
    );
    await nl.generate({ ...common, input: { text: "did it go through?" } });
    assert(
      server.bodies.length === 3,
      "precondition failed: two turns should take three requests",
    );
    return server.bodies[2];
  } finally {
    restore();
    await server.close();
  }
}

for (const failure of [
  "throws",
  "returns-isError",
  "returns-error-key",
] as const) {
  await test(`a tool that ${FAILURE_LABEL[failure]} replays as "→ error" in marker mode`, async () => {
    const body = await runFailedToolTurns(
      "marker",
      failure,
      `replay-fail-marker-${failure}-${Date.now()}`,
    );
    const text = textOf(body);
    assert(
      text.includes(`[called ${TOOL_NAME} → error]`),
      "the marker does not say the call failed",
    );
    assert(
      !text.includes(MARKER),
      "the marker claims the failed call succeeded",
    );
  });

  await test(`a tool that ${FAILURE_LABEL[failure]} replays its error text in full mode`, async () => {
    const body = await runFailedToolTurns(
      "full",
      failure,
      `replay-fail-full-${failure}-${Date.now()}`,
    );
    const result = blocksOf(body).find((b) => b.type === "tool_result");
    assert(result !== undefined, "turn 2 carried no tool_result block");
    const content = JSON.stringify(result?.content ?? "");
    assert(
      content.includes("upstream 403"),
      "the replayed tool_result does not carry the error text",
    );
    assert(
      content !== JSON.stringify("null"),
      "the replayed tool_result output is the literal null",
    );
  });
}

await test('a call whose result was lost to compaction replays as "→ unknown", never "→ ok"', async () => {
  // Seed the shape pair repair produces after a head-cut: a tool_call with
  // no tool_result. getConversationMessages repairs it with a placeholder
  // result on the way to the builder; the marker must not report success.
  const sessionId = `replay-orphan-${Date.now()}`;
  const server = await startStandIn(() => ({
    blocks: textBlocks("answer"),
    stop: "end_turn",
  }));
  const restore = withAnthropicEnv(server.port);
  const { nl } = createSdk("marker");
  try {
    const stamp = new Date().toISOString();
    await nl.setSessionMessages(sessionId, [
      {
        id: "u1",
        role: "user",
        content: "send the message",
        timestamp: stamp,
      },
      {
        id: "c1",
        role: "tool_call",
        content: "",
        tool: "send_message",
        toolCallId: "call_1",
        args: { to: "ops" },
        timestamp: stamp,
      },
      { id: "a1", role: "assistant", content: "Done.", timestamp: stamp },
    ]);
    await nl.generate({
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
      input: { text: "did it go through?" },
    });
    const text = textOf(server.bodies[0]);
    assert(
      text.includes("[called send_message → unknown]"),
      "the orphaned call is not replayed as an unknown outcome",
    );
    assert(
      !text.includes("[called send_message → ok]"),
      "the orphaned call is replayed as a success",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test('"full" degrades to markers on a turn that declares no tools, so the request carries no tool blocks', async () => {
  // Anthropic rejects tool_use / tool_result blocks in a request with no
  // `tools` field, so a tools-off call in a session that already ran a tool
  // would fail on every later turn.
  const sessionId = `replay-notools-${Date.now()}`;
  const server = await startStandIn(twoTurnScript);
  const restore = withAnthropicEnv(server.port);
  const { nl, executions } = createSdk("full");
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    assert(executions() === 1, "precondition failed: the tool did not run");
    await nl.generate({
      ...common,
      disableTools: true,
      input: { text: "summarise that in one line" },
    });
    const body = server.bodies[2];
    assert(
      body !== undefined && !("tools" in body),
      "precondition failed: the tools-off turn still declared tools",
    );
    const blocks = blocksOf(body);
    assert(
      !blocks.some((b) => b.type === "tool_use" || b.type === "tool_result"),
      "the tools-off turn still carried tool_use / tool_result blocks",
    );
    assert(
      textOf(body).includes(MARKER),
      "the tools-off turn did not fall back to the marker",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("id-less rows across two turns replay with distinct tool_use ids", async () => {
  // Rows persisted before `toolCallId` existed (or by a provider that emits
  // none) pair positionally. Synthetic ids restarted per turn, so two such
  // turns replayed the same id twice, which Anthropic rejects.
  const sessionId = `replay-idless-${Date.now()}`;
  const server = await startStandIn(() => ({
    blocks: textBlocks("answer"),
    stop: "end_turn",
  }));
  const restore = withAnthropicEnv(server.port);
  const { nl } = createSdk("full");
  try {
    const stamp = new Date().toISOString();
    const turn = (n: number) => [
      {
        id: `u${n}`,
        role: "user" as const,
        content: `question ${n}`,
        timestamp: stamp,
      },
      {
        id: `c${n}`,
        role: "tool_call" as const,
        content: "",
        tool: TOOL_NAME,
        args: { orderId: `ord_${n}` },
        timestamp: stamp,
      },
      {
        id: `r${n}`,
        role: "tool_result" as const,
        content: JSON.stringify({ status: "shipped" }),
        tool: TOOL_NAME,
        result: { success: true },
        timestamp: stamp,
      },
      {
        id: `a${n}`,
        role: "assistant" as const,
        content: `answer ${n}`,
        timestamp: stamp,
      },
    ];
    await nl.setSessionMessages(sessionId, [...turn(1), ...turn(2)]);
    await nl.generate({
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
      input: { text: "and now?" },
    });
    const uses = blocksOf(server.bodies[0]).filter(
      (b) => b.type === "tool_use",
    );
    const results = blocksOf(server.bodies[0]).filter(
      (b) => b.type === "tool_result",
    );
    assert(uses.length === 2, "both id-less turns were not replayed");
    const ids = new Set(uses.map((u) => String(u.id)));
    assert(ids.size === 2, "the replayed tool_use ids are not distinct");
    assert(
      results.every((r) => ids.has(String(r.tool_use_id))),
      "a replayed tool_result does not reference a replayed tool_use",
    );
    assert(
      uses.every((u) => /^[a-zA-Z0-9_-]+$/.test(String(u.id))),
      "a replayed tool_use id is outside the accepted alphabet",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("a summary row under the user role is not mistaken for the tool batch's own user turn", async () => {
  // The in-memory backend writes a tool batch BEFORE its user row; the
  // reorder that fixes this looked for "a user row before the batch" and
  // took a memory summary (emitted under the user role) as that row, so the
  // batch stayed ahead of the question and its marker was detached from
  // the answer. Only a genuine user turn counts.
  const sessionId = `replay-summary-${Date.now()}`;
  const server = await startStandIn(() => ({
    blocks: textBlocks("answer"),
    stop: "end_turn",
  }));
  const restore = withAnthropicEnv(server.port);
  const { nl } = createSdk("marker");
  try {
    const stamp = new Date().toISOString();
    await nl.setSessionMessages(sessionId, [
      {
        id: "s1",
        role: "user",
        content: "[Previous conversation summary]: earlier turns",
        timestamp: stamp,
        metadata: { isSummary: true },
      },
      {
        id: "c1",
        role: "tool_call",
        content: "",
        tool: TOOL_NAME,
        toolCallId: "call_1",
        args: TOOL_ARGS,
        timestamp: stamp,
      },
      {
        id: "r1",
        role: "tool_result",
        content: JSON.stringify(TOOL_OUTPUT),
        tool: TOOL_NAME,
        toolCallId: "call_1",
        result: { success: true },
        timestamp: stamp,
      },
      {
        id: "u1",
        role: "user",
        content: "where is order ord_4471?",
        timestamp: stamp,
      },
      { id: "a1", role: "assistant", content: "answer 1", timestamp: stamp },
    ]);
    await nl.generate({
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 3,
      context: { sessionId },
      input: { text: "and the carrier?" },
    });
    const messages = (server.bodies[0]?.messages ?? []) as Array<{
      role: string;
      content: unknown;
    }>;
    const messageText = (m: { content: unknown }): string =>
      typeof m.content === "string"
        ? m.content
        : ((m.content as Block[]) ?? [])
            .filter((b) => b.type === "text" && typeof b.text === "string")
            .map((b) => b.text as string)
            .join("\n");
    const questionIndex = messages.findIndex((m) =>
      messageText(m).includes("where is order ord_4471?"),
    );
    const markerIndex = messages.findIndex((m) =>
      messageText(m).includes(MARKER),
    );
    assert(markerIndex >= 0, "turn 2 carried no marker");
    assert(
      markerIndex > questionIndex,
      "the marker was replayed before the question that prompted the call",
    );
    assert(
      messageText(messages[markerIndex]).includes("answer 1"),
      "the marker is not folded into the assistant turn that answered",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("multi-step turns");

/** Requests 0 and 1 each call the tool (two sequential steps); 2 answers; 3 is turn 2. */
const twoStepScript = (index: number): { blocks: Block[]; stop: string } =>
  index === 0
    ? {
        blocks: [
          {
            type: "tool_use",
            id: "toolu_a",
            name: TOOL_NAME,
            input: TOOL_ARGS,
          },
        ],
        stop: "tool_use",
      }
    : index === 1
      ? {
          blocks: [
            {
              type: "tool_use",
              id: "toolu_b",
              name: TOOL_NAME,
              input: { orderId: "ord_4472" },
            },
          ],
          stop: "tool_use",
        }
      : { blocks: textBlocks(`answer ${index}`), stop: "end_turn" };

await test("a generate() turn with two sequential tool steps replays as two steps, not one parallel batch", async () => {
  const sessionId = `replay-steps-${Date.now()}`;
  const server = await startStandIn(twoStepScript);
  const restore = withAnthropicEnv(server.port);
  const { nl, executions } = createSdk("full");
  try {
    const common = {
      provider: "anthropic",
      model: MODEL,
      disableInternalFallback: true,
      maxTokens: 64,
      maxSteps: 4,
      context: { sessionId },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where are orders ord_4471 and ord_4472?" },
    });
    assert(
      executions() === 2,
      "precondition failed: the tool did not run twice",
    );
    const rows = await nl.getSessionMessages(sessionId);
    const calls = rows.filter((r) => r.role === "tool_call");
    assert(
      calls.length === 2 &&
        calls[0].metadata?.stepIndex === 0 &&
        calls[1].metadata?.stepIndex === 1,
      "the persisted tool_call rows do not carry their step index",
    );
    await nl.generate({ ...common, input: { text: "and the carriers?" } });
    const messages = (server.bodies[3]?.messages ?? []) as Array<{
      role: string;
      content: unknown;
    }>;
    const toolUseTurns = messages.filter(
      (m) =>
        m.role === "assistant" &&
        Array.isArray(m.content) &&
        (m.content as Block[]).some((b) => b.type === "tool_use"),
    );
    assert(
      toolUseTurns.length === 2,
      "the two sequential steps were not replayed as two assistant tool turns",
    );
    assert(
      toolUseTurns.every(
        (m) =>
          (m.content as Block[]).filter((b) => b.type === "tool_use").length ===
          1,
      ),
      "a replayed step carries more than its own tool_use",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("OpenAI-compatible path");

/**
 * A loopback OpenAI chat-completions stand-in: request 0 answers with a tool
 * call, every later request with text. Non-streaming JSON, the shape
 * generate() speaks.
 */
async function startOpenAIStandIn(): Promise<StandIn> {
  const bodies: Array<Record<string, unknown>> = [];
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
      bodies.push(body);
      const first = bodies.length === 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1,
          model: "gpt-4o-mini",
          choices: [
            {
              index: 0,
              message: first
                ? {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: "call_1",
                        type: "function",
                        function: {
                          name: TOOL_NAME,
                          arguments: JSON.stringify(TOOL_ARGS),
                        },
                      },
                    ],
                  }
                : { role: "assistant", content: `answer ${bodies.length}` },
              finish_reason: first ? "tool_calls" : "stop",
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    bodies,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

await test("an OpenAI-compatible generate() turn persists the call's parsed arguments and replays them in full mode", async () => {
  // The stores read `args`; the loop once handed them `input`, so every
  // OpenAI-compatible tool call was persisted with empty arguments and
  // replayed as `{}`.
  const sessionId = `replay-openai-${Date.now()}`;
  const server = await startOpenAIStandIn();
  const { nl, executions } = createSdk("full");
  try {
    const common = {
      provider: "openai",
      model: "gpt-4o-mini",
      disableInternalFallback: true,
      maxSteps: 3,
      context: { sessionId },
      credentials: {
        openai: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}/v1`,
        },
      },
    } as const;
    await nl.generate({
      ...common,
      input: { text: "where is order ord_4471?" },
    });
    assert(executions() === 1, "precondition failed: the tool did not run");
    const rows = await nl.getSessionMessages(sessionId);
    const call = rows.find((r) => r.role === "tool_call");
    assert(call !== undefined, "no tool_call row was persisted");
    assert(
      JSON.stringify(call?.args) === JSON.stringify(TOOL_ARGS),
      "the persisted tool_call row does not carry the parsed arguments",
    );
    await nl.generate({ ...common, input: { text: "and the carrier?" } });
    const turn2 = (server.bodies[2]?.messages ?? []) as Array<{
      role: string;
      tool_calls?: Array<{ function?: { arguments?: string } }>;
    }>;
    const replayed = turn2.find(
      (m) => m.role === "assistant" && Array.isArray(m.tool_calls),
    );
    assert(replayed !== undefined, "turn 2 carried no replayed tool call");
    const args = replayed?.tool_calls?.[0]?.function?.arguments;
    assert(
      typeof args === "string" &&
        JSON.stringify(JSON.parse(args)) === JSON.stringify(TOOL_ARGS),
      "the replayed tool call does not carry the original arguments",
    );
  } finally {
    await server.close();
  }
});

/** One scripted OpenAI chat-completions STREAM turn, chosen by request index. */
type OpenAIStreamTurn =
  | { toolCall: { id: string; args: Record<string, unknown> } }
  | { text: string };

/**
 * A loopback OpenAI chat-completions SSE stand-in — the wire shape
 * `stream()` speaks on the OpenAI-compatible family. Request N answers with
 * `turn(N)`: a single tool-call delta then `finish_reason: "tool_calls"`, or
 * a text delta then `"stop"`.
 */
async function startOpenAIStreamStandIn(
  turn: (index: number) => OpenAIStreamTurn,
): Promise<StandIn> {
  const bodies: Array<Record<string, unknown>> = [];
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
      bodies.push(body);
      const scripted = turn(bodies.length - 1);
      res.writeHead(200, { "content-type": "text/event-stream" });
      const frame = (delta: Record<string, unknown>, finish: string | null) =>
        res.write(
          `data: ${JSON.stringify({
            id: "chatcmpl-stream-stand-in",
            object: "chat.completion.chunk",
            model: "gpt-4o-mini",
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`,
        );
      if ("toolCall" in scripted) {
        frame(
          {
            tool_calls: [
              {
                index: 0,
                id: scripted.toolCall.id,
                type: "function",
                function: {
                  name: TOOL_NAME,
                  arguments: JSON.stringify(scripted.toolCall.args),
                },
              },
            ],
          },
          null,
        );
        frame({}, "tool_calls");
      } else {
        frame({ role: "assistant", content: scripted.text }, null);
        frame({}, "stop");
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    bodies,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

await test("an OpenAI-compatible stream() turn with two sequential tool steps persists stepIndex and replays as two steps, not one parallel batch", async () => {
  // The OpenAI-compatible STREAM loop never set `stepIndex` on its tool
  // summaries (the Anthropic loop did), so the stores persisted its rows
  // without `metadata.stepIndex` and the next turn replayed a `lookup`
  // followed by a dependent `lookup` as one parallel step.
  const sessionId = `replay-openai-stream-steps-${Date.now()}`;
  const server = await startOpenAIStreamStandIn((index) =>
    index === 0
      ? { toolCall: { id: "call_a", args: TOOL_ARGS } }
      : index === 1
        ? { toolCall: { id: "call_b", args: { orderId: "ord_4472" } } }
        : { text: `answer ${index}` },
  );
  const { nl, executions } = createSdk("full");
  try {
    const common = {
      provider: "openai",
      model: "gpt-4o-mini",
      disableInternalFallback: true,
      maxSteps: 4,
      context: { sessionId },
      credentials: {
        openai: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}/v1`,
        },
      },
    } as const;
    const first = await nl.stream({
      ...common,
      input: { text: "where are orders ord_4471 and ord_4472?" },
    });
    for await (const _chunk of first.stream) {
      // drain
    }
    assert(
      executions() === 2,
      "precondition failed: the tool did not run twice",
    );
    const rows = await nl.getSessionMessages(sessionId);
    const calls = rows.filter((r) => r.role === "tool_call");
    assert(
      calls.length === 2 &&
        calls[0].metadata?.stepIndex === 0 &&
        calls[1].metadata?.stepIndex === 1,
      "the persisted tool_call rows do not carry their step index",
    );
    const results = rows.filter((r) => r.role === "tool_result");
    assert(
      results.length === 2 &&
        results[0].metadata?.stepIndex === 0 &&
        results[1].metadata?.stepIndex === 1,
      "the persisted tool_result rows do not carry their step index",
    );
    const second = await nl.stream({
      ...common,
      input: { text: "and the carriers?" },
    });
    for await (const _chunk of second.stream) {
      // drain
    }
    assert(
      server.bodies.length === 4,
      "precondition failed: two streamed turns should take four requests",
    );
    const turn2 = (server.bodies[3]?.messages ?? []) as Array<{
      role: string;
      tool_calls?: Array<{ id?: string }>;
    }>;
    const toolCallTurns = turn2.filter(
      (m) => m.role === "assistant" && Array.isArray(m.tool_calls),
    );
    assert(
      toolCallTurns.length === 2,
      "the two sequential steps were not replayed as two assistant tool turns",
    );
    assert(
      toolCallTurns.every((m) => m.tool_calls?.length === 1),
      "a replayed step carries more than its own tool call",
    );
  } finally {
    await server.close();
  }
});

await runSuite();
