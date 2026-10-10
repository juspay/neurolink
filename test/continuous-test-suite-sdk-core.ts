#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — NeuroLink core: per-turn state, the stream outer
 * fallback, and status-shaped credential checks.
 *
 * Everything here drives the shipped surface: `new NeuroLink()` from
 * `../dist/index.js`, `generate()` / `stream()` / `executeTool()` /
 * `checkCredentials()`, against loopback stand-ins — an OpenAI-wire chat
 * endpoint and an Anthropic Messages endpoint — so the suite is offline and
 * needs no provider keys.
 *
 * 1. Concurrent turns on ONE instance (#1912). The tool-result cache's
 *    turn-scoped state — the `disableToolCache` flag and the keys already
 *    served this turn — used to live on instance fields, so a server handling
 *    two requests at once had each turn reading the other's flag and keys.
 *    The stand-in holds the first model reply of each turn until both turns
 *    have reached it, so both are mid-turn when either runs its tool: the
 *    interleaving that corrupted the state is forced, not hoped for.
 * 2. The stream's outer-catch fallback (#1852). When the primary attempt
 *    throws before its stream exists, `stream()` falls back to a plain
 *    provider stream. Its `toolCalls` / `toolResults` were copied before that
 *    stream had been drained, so a background-loop provider's tool calls were
 *    reported as none.
 * 3. Status-shaped matching. `checkCredentials()` reported a provider
 *    "expired" whenever its error message contained "401" anywhere, a token
 *    count or a limit included — and, reading only the text, missed a real
 *    401 whose message did not happen to repeat the digits.
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-sdk-core.ts
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { NeuroLink } = await import("../dist/index.js");

const { test, section, runSuite } = defineSuite("SDK core", {
  // Every request goes to a 127.0.0.1 stand-in; a hang here is a defect.
  offline: true,
});

type Instance = InstanceType<typeof NeuroLink>;
type ChatBody = {
  stream?: boolean;
  messages?: Array<{ role?: string; content?: unknown }>;
};

function listen(server: Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function readJson(req: IncomingMessage): Promise<ChatBody> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function quietDispose(instance: Instance): Promise<void> {
  try {
    await instance.dispose();
  } catch {
    /* teardown only */
  }
}

// ============================================================================
// OpenAI-wire stand-in: one tool call per turn, held at a barrier
// ============================================================================

const TOOL_NAME = "get_data";
const TOOL_ARGS = { q: "x" };

/** Every message's text in a request body, joined. */
function textOfChat(body: ChatBody): string {
  return (body.messages ?? [])
    .map((m) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    )
    .join("\n");
}

function hasToolResult(body: ChatBody): boolean {
  return (body.messages ?? []).some((m) => m.role === "tool");
}

function chatReply(
  res: ServerResponse,
  streaming: boolean,
  reply: { content: string } | { toolCallId: string },
): void {
  const toolCalls =
    "toolCallId" in reply
      ? [
          {
            index: 0,
            id: reply.toolCallId,
            type: "function",
            function: { name: TOOL_NAME, arguments: JSON.stringify(TOOL_ARGS) },
          },
        ]
      : undefined;
  const finishReason = toolCalls ? "tool_calls" : "stop";
  const content = "content" in reply ? reply.content : null;
  if (!streaming) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "stand-in",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content,
              ...(toolCalls ? { tool_calls: toolCalls } : {}),
            },
            finish_reason: finishReason,
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
    return;
  }
  const frame = (delta: Record<string, unknown>, finish: string | null) =>
    `data: ${JSON.stringify({
      id: "stand-in",
      object: "chat.completion.chunk",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  res.write(
    frame(
      toolCalls
        ? { role: "assistant", tool_calls: toolCalls }
        : { role: "assistant", content },
      null,
    ),
  );
  res.write(frame({}, finishReason));
  res.end("data: [DONE]\n\n");
}

type ToolTurnStandIn = {
  baseURL: string;
  /** How many of a turn's first requests must arrive before any is answered. */
  setBarrier: (size: number) => void;
  /** Second-round request bodies — the ones carrying the tool result. */
  toolResultBodies: () => ChatBody[];
  close: () => Promise<void>;
};

/**
 * Each turn: the first request is answered with one `get_data` call, the
 * request carrying its result with "done". First requests are held until
 * `barrier` of them are waiting, so concurrent turns are all mid-turn before
 * any of them executes its tool.
 */
async function startToolTurnStandIn(): Promise<ToolTurnStandIn> {
  let barrier = 1;
  let callSeq = 0;
  const held: Array<() => void> = [];
  const toolResultBodies: ChatBody[] = [];
  const server = createServer((req, res) => {
    void readJson(req).then((body) => {
      const streaming = body.stream === true;
      if (hasToolResult(body)) {
        toolResultBodies.push(body);
        chatReply(res, streaming, { content: "done" });
        return;
      }
      const toolCallId = `call_${++callSeq}`;
      held.push(() => chatReply(res, streaming, { toolCallId }));
      if (held.length >= barrier) {
        for (const release of held.splice(0)) {
          release();
        }
      }
    });
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    setBarrier: (size) => {
      barrier = size;
    },
    toolResultBodies: () => [...toolResultBodies],
    close: () => closeServer(server),
  };
}

/** An instance with the result cache on and a counting `get_data` tool. */
function createCountingInstance(baseURL: string): {
  nl: Instance;
  executions: () => number;
} {
  let executions = 0;
  const nl = new NeuroLink({
    conversationMemory: { enabled: false },
    mcp: { cache: { enabled: true, ttl: 60_000 } },
    credentials: { openai: { apiKey: "sk-local-stand-in", baseURL } },
  });
  nl.registerTool(TOOL_NAME, {
    name: TOOL_NAME,
    description: "Fetch data",
    inputSchema: { type: "object", properties: { q: { type: "string" } } },
    execute: async () => {
      executions += 1;
      return { fresh: executions };
    },
  });
  return { nl, executions: () => executions };
}

/** The tool result the model was handed in the turn whose prompt names `label`. */
function toolResultFor(standIn: ToolTurnStandIn, label: string): string {
  const body = standIn
    .toolResultBodies()
    .find((b) => textOfChat(b).includes(label));
  const toolMessage = (body?.messages ?? []).find((m) => m.role === "tool");
  return typeof toolMessage?.content === "string"
    ? toolMessage.content
    : JSON.stringify(toolMessage?.content ?? null);
}

type TurnMode = "generate" | "stream";

async function runTurn(
  nl: Instance,
  mode: TurnMode,
  label: string,
  disableToolCache: boolean,
): Promise<void> {
  const options = {
    input: { text: `run the tool for ${label}` },
    provider: "openai",
    model: "gpt-4o-mini",
    disableInternalFallback: true,
    ...(disableToolCache ? { disableToolCache: true } : {}),
  } as const;
  if (mode === "generate") {
    await nl.generate(options);
    return;
  }
  const result = await nl.stream(options);
  for await (const _chunk of result.stream) {
    // drain: the tool runs while the stream is consumed
  }
}

section("Concurrent turns on one instance keep their own tool-cache state");

for (const mode of ["generate", "stream"] as const) {
  for (const disabledFirst of [true, false]) {
    const order = disabledFirst
      ? "the disableToolCache turn starts first"
      : "the disableToolCache turn starts second";
    await test(`${mode}(): two concurrent turns, ${order}`, async () => {
      const standIn = await startToolTurnStandIn();
      const { nl, executions } = createCountingInstance(standIn.baseURL);
      try {
        // Warm the cache from a turn of its own: the first call in a turn may
        // be served from cache, so this result is what a cached call returns.
        await runTurn(nl, mode, "WARM", false);
        assertEqual(
          executions(),
          1,
          "precondition: the warm-up turn must execute the tool once",
        );

        standIn.setBarrier(2);
        const turnA = () => runTurn(nl, mode, "TURN_A", true);
        const turnB = () => runTurn(nl, mode, "TURN_B", false);
        await Promise.all(
          disabledFirst ? [turnA(), turnB()] : [turnB(), turnA()],
        );

        assertEqual(
          standIn.toolResultBodies().length,
          3,
          "precondition: every turn must have run its tool and reported back",
        );
        assertEqual(
          executions(),
          2,
          "exactly one of the two concurrent turns should have executed the tool",
        );
        assert(
          toolResultFor(standIn, "TURN_A").includes('"fresh":2'),
          "the disableToolCache turn must execute the tool, not read the cache",
        );
        assert(
          toolResultFor(standIn, "TURN_B").includes('"fresh":1'),
          "the other turn's first call must still be served from the cache",
        );
      } finally {
        await quietDispose(nl);
        await standIn.close();
      }
    });
  }
}

await test("stream(): a stream drained after another turn started keeps its own state", async () => {
  const standIn = await startToolTurnStandIn();
  const { nl, executions } = createCountingInstance(standIn.baseURL);
  try {
    await runTurn(nl, "generate", "WARM", false);
    assertEqual(executions(), 1, "precondition: the warm-up turn ran the tool");
    // The disableToolCache stream is created, then left undrained while a
    // whole generate() turn runs, and is drained afterwards from this test's
    // own async context. Wherever its tool runs — in the provider's loop or
    // inside the `next()` that drains it — it must see its own turn's state.
    const pending = await nl.stream({
      input: { text: "run the tool for TURN_A" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableInternalFallback: true,
      disableToolCache: true,
    });
    await runTurn(nl, "generate", "TURN_B", false);
    for await (const _chunk of pending.stream) {
      // drain
    }
    assertEqual(
      executions(),
      2,
      "only the disableToolCache stream should have executed the tool",
    );
    assert(
      toolResultFor(standIn, "TURN_B").includes('"fresh":1'),
      "the generate() turn must be served from the cache",
    );
    assert(
      toolResultFor(standIn, "TURN_A").includes('"fresh":2'),
      "the stream must bypass the cache when drained later",
    );
  } finally {
    await quietDispose(nl);
    await standIn.close();
  }
});

await test("executeTool() outside any turn keeps full cache semantics", async () => {
  const standIn = await startToolTurnStandIn();
  const { nl, executions } = createCountingInstance(standIn.baseURL);
  try {
    await nl.executeTool(TOOL_NAME, TOOL_ARGS);
    await nl.executeTool(TOOL_NAME, TOOL_ARGS);
    assertEqual(
      executions(),
      1,
      "a repeated direct call outside a turn should be served from the cache",
    );
  } finally {
    await quietDispose(nl);
    await standIn.close();
  }
});

// ============================================================================
// The stream's outer-catch fallback reports the tools its stream ran
// ============================================================================

section("stream() outer fallback keeps tool fields live");

const ANTHROPIC_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

function withAnthropicEnv(port: number): () => void {
  const saved = new Map<string, string | undefined>();
  for (const key of ANTHROPIC_ENV) {
    saved.set(key, process.env[key]);
  }
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** Anthropic SSE for one turn: a tool_use block, or a text block. */
function anthropicFrames(
  block:
    | { kind: "tool"; name: string; input: Record<string, unknown> }
    | { kind: "text"; text: string },
): string[] {
  const start = sse("message_start", {
    message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
  });
  const content =
    block.kind === "tool"
      ? [
          sse("content_block_start", {
            index: 0,
            content_block: {
              type: "tool_use",
              id: "toolu_1",
              name: block.name,
              input: {},
            },
          }),
          sse("content_block_delta", {
            index: 0,
            delta: {
              type: "input_json_delta",
              partial_json: JSON.stringify(block.input),
            },
          }),
          sse("content_block_stop", { index: 0 }),
        ]
      : [
          sse("content_block_start", {
            index: 0,
            content_block: { type: "text", text: "" },
          }),
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: block.text },
          }),
          sse("content_block_stop", { index: 0 }),
        ];
  return [
    start,
    ...content,
    sse("message_delta", {
      delta: { stop_reason: block.kind === "tool" ? "tool_use" : "end_turn" },
      usage: { output_tokens: 4 },
    }),
    sse("message_stop", {}),
  ];
}

await test("a fallback stream that called a tool reports it in toolCalls / toolResults after the drain", async () => {
  // Every request: the first of a turn asks for `lookup_order`, the one
  // carrying its result gets a text answer.
  const server = createServer((req, res) => {
    void readJson(req).then((body) => {
      const sawToolResult = (body.messages ?? []).some(
        (m) =>
          Array.isArray(m.content) &&
          (m.content as Array<{ type?: string }>).some(
            (part) => part.type === "tool_result",
          ),
      );
      res.writeHead(200, { "content-type": "text/event-stream" });
      for (const frame of anthropicFrames(
        sawToolResult
          ? { kind: "text", text: "fallback answer" }
          : { kind: "tool", name: "lookup_order", input: { orderId: "o1" } },
      )) {
        res.write(frame);
      }
      res.end();
    });
  });
  const port = await listen(server);
  const restoreEnv = withAnthropicEnv(port);
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  try {
    // A file that does not exist fails the primary attempt while it prepares
    // the request, before any stream exists — the outer catch. The fallback
    // sends only the prompt text, so it reaches the stand-in.
    const result = await nl.stream({
      input: {
        text: "look up order o1",
        files: ["/nonexistent/neurolink-sdk-core/missing-attachment.csv"],
      },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });
    assert(
      (result.metadata as { fallback?: boolean } | undefined)?.fallback ===
        true,
      "precondition: the primary attempt must have failed into the outer fallback",
    );
    let text = "";
    for await (const chunk of result.stream) {
      if (chunk && "content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(
      text.includes("fallback answer"),
      "precondition: the fallback stream must have run to its final answer",
    );
    const toolCalls = (result.toolCalls ?? []) as Array<{ toolName?: string }>;
    const toolResults = (result.toolResults ?? []) as Array<{
      toolName?: string;
    }>;
    assertEqual(
      toolCalls.map((call) => call.toolName).join(","),
      "lookup_order",
      "toolCalls must list the call the fallback stream made",
    );
    assertEqual(
      toolResults.map((r) => r.toolName).join(","),
      "lookup_order",
      "toolResults must list the result the fallback stream recorded",
    );
  } finally {
    restoreEnv();
    await quietDispose(nl);
    await closeServer(server);
  }
});

// ============================================================================
// Status-shaped credential rules
// ============================================================================

section("checkCredentials() reads the status, not any 401 in a message");

async function credentialStatusFor(reply: {
  status: number;
  message: string;
}): Promise<string> {
  const server = createServer((req, res) => {
    void readJson(req).then(() => {
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            message: reply.message,
            type: "invalid_request_error",
            code: null,
          },
        }),
      );
    });
  });
  const port = await listen(server);
  const nl = new NeuroLink({
    conversationMemory: { enabled: false },
    credentials: {
      openai: {
        apiKey: "sk-local-stand-in",
        baseURL: `http://127.0.0.1:${port}/v1`,
      },
    },
  });
  try {
    const health = await nl.checkCredentials({
      provider: "openai",
      model: "gpt-4o-mini",
    });
    return health.status;
  } finally {
    await quietDispose(nl);
    await closeServer(server);
  }
}

await test("checkCredentials(): a 401 response reports the credentials as expired", async () => {
  assertEqual(
    await credentialStatusFor({ status: 401, message: "Incorrect key" }),
    "expired",
    "a rejected credential should read as expired",
  );
});

await test("checkCredentials(): a 400 whose message contains 401 is not an expired credential", async () => {
  const status = await credentialStatusFor({
    status: 400,
    message: "max_tokens is 4010, above this model's output limit",
  });
  assert(
    status !== "expired",
    "a request error that merely quotes a number must not read as a rejected credential",
  );
});

await runSuite();
