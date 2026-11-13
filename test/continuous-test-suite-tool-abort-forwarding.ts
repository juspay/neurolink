#!/usr/bin/env tsx
/**
 * The signal a model loop gives a tool call reaches everything that call
 * starts: the registered tool's execution context, the human confirmation the
 * call waits on, the attempt that would run it, and a `registerAgentTool`
 * worker.
 *
 * Earlier versions did not forward the loop's signal to `executeTool`, so a
 * cancelled turn did not always reach the tool, its confirmation or a
 * delegated worker.
 *
 * Drives only the shipped surface from `dist/index.js`: `generate()` and
 * `stream()` against loopback stand-ins for the Anthropic Messages SSE wire
 * (native client, loop engine), the OpenAI chat-completions wire (`generate()`:
 * native generate loop and `guardToolExecutor`; `stream()`: the
 * OpenAI-compatible stream loop) and Bedrock Converse over HTTP/2 (the AWS SDK
 * pointed at the stand-in with `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`; loop
 * engine); `executeTool` and `executeExternalMCPTool` directly; a real stdio
 * MCP server (test/fixtures/mcp-direct-name-repair-server.mjs, tool
 * `search_code`); and `registerAgentTool`. Cards are answered through the
 * documented `hitl:confirmation-request` / `hitl:confirmation-response`
 * events.
 *
 * Offline: every upstream is 127.0.0.1, and `credentialFreeEnv` (imported
 * first, before the SDK loads `.env`) strips ambient credentials, so no turn
 * can fall back to a real provider. This suite takes no determinism
 * exception.
 *
 * Run: pnpm run test:tool-abort-forwarding
 */
import "./helpers/credentialFreeEnv.js";
import { randomUUID } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import {
  createServer as createHttp2Server,
  type ServerHttp2Session,
} from "node:http2";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NeuroLink,
  isAbortError,
  jsonSchema,
  mcpLogger,
} from "../dist/index.js";
import { assert, assertEqual, defineSuite, delay } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// The repo's .mcp-config.json would start a filesystem MCP server through
// npx on the first generate(), and wait out its 60s client timeout offline.
process.env.NEUROLINK_SKIP_MCP = "true";

assertDistFresh();
const { test, section, runSuite } = defineSuite("Tool abort forwarding", {
  offline: true,
});

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-direct-name-repair-server.mjs",
);

const PROBE_TOOL = "fixture_probe";
const GATED_TOOL = "fixture_write";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const OPENAI_MODEL = "gpt-4o-mini";
const BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
/** What the probe tool returns when its signal stopped it early. */
const ABORTED_VALUE = "stopped by its signal";

const readRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};

const readPayload = (event: unknown): Record<string, unknown> =>
  readRecord(readRecord(event).payload);

// Counts only: the observed number is safe to print, a payload is not.
const assertCount = (
  actual: number | undefined,
  expected: number,
  message: string,
): void =>
  assertEqual(
    actual,
    expected,
    `${message} (expected ${expected}, got ${actual})`,
  );

const waitFor = async (
  predicate: () => boolean,
  withinMs: number,
): Promise<boolean> => {
  const until = Date.now() + withinMs;
  while (!predicate()) {
    if (Date.now() > until) {
      return false;
    }
    await delay(10);
  }
  return true;
};

type Settled = { result?: unknown; error?: unknown };

const settle = async (call: Promise<unknown>): Promise<Settled> => {
  try {
    return { result: await call };
  } catch (error) {
    return { error };
  }
};

// ---------------------------------------------------------------------------
// Loopback model stand-ins
// ---------------------------------------------------------------------------

type StandIn = {
  requests: string[];
  port: number;
  close: () => Promise<void>;
};

type Reply = (index: number, body: string, res: ServerResponse) => void;

const startStandIn = async (reply: Reply): Promise<StandIn> => {
  const requests: string[] = [];
  const open = new Set<ServerResponse>();
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      requests.push(body);
      open.add(res);
      res.once("close", () => open.delete(res));
      reply(requests.length - 1, body, res);
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    requests,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        for (const response of open) {
          response.destroy();
        }
        server.close(() => resolve());
      }),
  };
};

// OpenAI chat-completions wire (non-streaming generate()).
const chatCompletion = (
  message: Record<string, unknown>,
  finishReason: string,
): string =>
  JSON.stringify({
    id: "abort-forwarding",
    object: "chat.completion",
    created: 1,
    model: OPENAI_MODEL,
    choices: [
      {
        index: 0,
        message: { role: "assistant", ...message },
        finish_reason: finishReason,
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });

const openAiToolCall = (name: string, args: Record<string, unknown>): string =>
  chatCompletion(
    {
      content: null,
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name, arguments: JSON.stringify(args) },
        },
      ],
    },
    "tool_calls",
  );

const openAiText = (text: string): string =>
  chatCompletion({ content: text }, "stop");

const carriesToolResult = (body: string): boolean =>
  body.includes('"role":"tool"');

/** Asks for one tool call; answers any request that carries its result. */
const openAiToolThenText =
  (name: string, args: Record<string, unknown> = {}): Reply =>
  (_index, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      carriesToolResult(body) ? openAiText("done") : openAiToolCall(name, args),
    );
  };

const openAiCredentials = (port: number) => ({
  openai: {
    apiKey: "sk-mock-local-server",
    baseURL: `http://127.0.0.1:${port}/v1`,
  },
});

// OpenAI chat-completions wire, streamed (stream(), OpenAI-compatible loop).
const openAiChunk = (
  delta: Record<string, unknown>,
  finishReason: string | null,
): string =>
  `data: ${JSON.stringify({
    id: "abort-forwarding",
    object: "chat.completion.chunk",
    created: 1,
    model: OPENAI_MODEL,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...(finishReason
      ? { usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }
      : {}),
  })}\n\n`;

const openAiStreamToolCall = (
  name: string,
  args: Record<string, unknown>,
): string =>
  [
    openAiChunk({ role: "assistant" }, null),
    openAiChunk(
      {
        tool_calls: [
          {
            index: 0,
            id: "call_1",
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
      null,
    ),
    openAiChunk({}, "tool_calls"),
    "data: [DONE]\n\n",
  ].join("");

const openAiStreamText = (text: string): string =>
  [
    openAiChunk({ role: "assistant" }, null),
    openAiChunk({ content: text }, null),
    openAiChunk({}, "stop"),
    "data: [DONE]\n\n",
  ].join("");

/** The streamed twin of `openAiToolThenText`. */
const openAiStreamToolThenText =
  (name: string, args: Record<string, unknown> = {}): Reply =>
  (_index, body, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(
      carriesToolResult(body)
        ? openAiStreamText("done")
        : openAiStreamToolCall(name, args),
    );
  };

// Bedrock Converse over HTTP/2: @aws-sdk/client-bedrock-runtime refuses an
// HTTP/1.1 server. generate() uses the non-streaming `converse` operation.
const converseToolUse = (name: string): string =>
  JSON.stringify({
    output: {
      message: {
        role: "assistant",
        content: [{ toolUse: { name, toolUseId: "tooluse_1", input: {} } }],
      },
    },
    stopReason: "tool_use",
    usage: { inputTokens: 12, outputTokens: 6, totalTokens: 18 },
  });

const converseText = (text: string): string =>
  JSON.stringify({
    output: { message: { role: "assistant", content: [{ text }] } },
    stopReason: "end_turn",
    usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
  });

type BedrockStandIn = {
  requests: () => number;
  port: number;
  close: () => Promise<void>;
};

/** Asks for one tool call, then answers every later request with text. */
const startBedrockStandIn = async (
  toolName: string,
): Promise<BedrockStandIn> => {
  let requests = 0;
  const sessions = new Set<ServerHttp2Session>();
  const server = createHttp2Server();
  server.on("session", (session) => {
    sessions.add(session);
    session.once("close", () => sessions.delete(session));
  });
  server.on("stream", (stream) => {
    stream.on("data", () => undefined);
    stream.on("end", () => {
      const index = requests++;
      stream.respond({ ":status": 200, "content-type": "application/json" });
      stream.end(
        index === 0 ? converseToolUse(toolName) : converseText("done"),
      );
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    requests: () => requests,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        for (const session of sessions) {
          session.destroy();
        }
        server.close(() => resolve());
      }),
  };
};

const BEDROCK_ENV = [
  "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_SESSION_TOKEN",
] as const;

/** Points the AWS SDK at the stand-in with fake keys that can sign. */
const withBedrockEnv = (port: number): (() => void) => {
  const saved = new Map(BEDROCK_ENV.map((key) => [key, process.env[key]]));
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = `http://127.0.0.1:${port}`;
  process.env.AWS_ACCESS_KEY_ID = "test-fake-aws-key-id";
  process.env.AWS_SECRET_ACCESS_KEY = "test-fake-aws-secret";
  process.env.AWS_REGION = "us-east-1";
  delete process.env.AWS_SESSION_TOKEN;
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
};

// Anthropic Messages SSE wire (stream(), native client, loop engine).
const anthropicEvent = (
  event: string,
  payload: Record<string, unknown>,
): string =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;

const anthropicToolTurn = (name: string): string =>
  [
    anthropicEvent("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    anthropicEvent("content_block_start", {
      index: 0,
      content_block: { type: "tool_use", id: "toolu_1", name, input: {} },
    }),
    anthropicEvent("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: "{}" },
    }),
    anthropicEvent("content_block_stop", { index: 0 }),
    anthropicEvent("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    anthropicEvent("message_stop", {}),
  ].join("");

const anthropicTextTurn = (text: string): string =>
  [
    anthropicEvent("message_start", {
      message: { id: "msg_2", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    anthropicEvent("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    anthropicEvent("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text },
    }),
    anthropicEvent("content_block_stop", { index: 0 }),
    anthropicEvent("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 4 },
    }),
    anthropicEvent("message_stop", {}),
  ].join("");

const anthropicToolThenText =
  (name: string): Reply =>
  (index, _body, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(index === 0 ? anthropicToolTurn(name) : anthropicTextTurn("done"));
  };

const ANTHROPIC_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

/**
 * Points the real Anthropic SDK at the stand-in with `api_key` auth pinned,
 * so an ambient OAuth token cannot route construction down another branch.
 * Returns the restore function.
 */
const withAnthropicEnv = (port: number): (() => void) => {
  const saved = new Map(ANTHROPIC_ENV.map((key) => [key, process.env[key]]));
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
};

const drain = async (
  streamed: Promise<{ stream: AsyncIterable<unknown> }>,
): Promise<void> => {
  const { stream } = await streamed;
  for await (const chunk of stream) {
    void chunk;
  }
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type ToolProbe = {
  /** Times the tool body started. */
  calls: () => number;
  /** The `abortSignal` each call found in its execution context. */
  signals: Array<AbortSignal | undefined>;
  /** Per call: whether its signal fired while it ran. */
  fired: boolean[];
  /** Resolves when the first call has finished. */
  firstDone: Promise<void>;
};

/**
 * A registered tool that holds for `holdMs` unless its execution context's
 * `abortSignal` fires first, and records what it saw.
 */
const registerProbeTool = (
  neurolink: NeuroLink,
  options: { onStart?: () => void; holdMs?: number } = {},
): ToolProbe => {
  const holdMs = options.holdMs ?? 1500;
  let calls = 0;
  let markFirstDone: () => void = () => undefined;
  const firstDone = new Promise<void>((resolve) => {
    markFirstDone = resolve;
  });
  const probe: ToolProbe = {
    calls: () => calls,
    signals: [],
    fired: [],
    firstDone,
  };
  neurolink.registerTool(PROBE_TOOL, {
    name: PROBE_TOOL,
    description: "Harmless local fixture that waits briefly",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async (_args: unknown, context?: unknown) => {
      calls++;
      const candidate = readRecord(context).abortSignal;
      const signal = candidate instanceof AbortSignal ? candidate : undefined;
      probe.signals.push(signal);
      options.onStart?.();
      const fired = await new Promise<boolean>((resolve) => {
        if (signal?.aborted) {
          resolve(true);
          return;
        }
        const timer = setTimeout(() => resolve(false), holdMs);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve(true);
          },
          { once: true },
        );
      });
      probe.fired.push(fired);
      markFirstDone();
      return fired ? ABORTED_VALUE : "fixture executed";
    },
  });
  return probe;
};

const assertSignalReachedTool = async (
  probe: ToolProbe,
  label: string,
): Promise<void> => {
  await Promise.race([probe.firstDone, delay(3000)]);
  assertCount(probe.calls(), 1, `${label}: the tool did not run exactly once`);
  assert(
    probe.signals[0] !== undefined,
    `${label}: the registered tool received no abortSignal`,
  );
  assert(
    probe.fired[0] === true,
    `${label}: the loop's abort did not reach the registered tool`,
  );
};

/**
 * Runs one model turn that calls the probe tool and asserts the loop's signal
 * reached it: the turn's abort 100ms after the tool started, or (with
 * `abortTurn: false`) the loop's own per-tool deadline.
 */
const assertLoopSignalReachesTool = async (
  label: string,
  abortTurn: boolean,
  runTurn: (neurolink: NeuroLink, abortSignal: AbortSignal) => Promise<unknown>,
): Promise<void> => {
  const controller = new AbortController();
  const neurolink = new NeuroLink();
  const probe = registerProbeTool(
    neurolink,
    abortTurn
      ? { onStart: () => setTimeout(() => controller.abort(), 100) }
      : {},
  );
  await settle(runTurn(neurolink, controller.signal));
  await assertSignalReachedTool(probe, label);
};

/**
 * How many times the shared logger reported at ERROR while `body` ran.
 * `mcpLogger` is the one instance the registry, the external manager,
 * ToolsManager and NeuroLink all write to.
 */
const errorsLoggedDuring = async (
  body: () => Promise<unknown>,
): Promise<number> => {
  let errors = 0;
  const original = mcpLogger.error;
  mcpLogger.error = () => {
    errors++;
  };
  try {
    await body();
  } finally {
    mcpLogger.error = original;
  }
  return errors;
};

type HitlObserver = {
  cards: string[];
  cancelled: () => number;
  answer: (confirmationId: string, approved: boolean) => void;
};

const observeHitl = (neurolink: NeuroLink): HitlObserver => {
  const emitter = neurolink.getEventEmitter();
  const cards: string[] = [];
  let cancelled = 0;
  emitter.on("hitl:confirmation-request", (event: unknown) => {
    cards.push(String(readPayload(event).confirmationId));
  });
  emitter.on("hitl:cancelled", () => {
    cancelled++;
  });
  return {
    cards,
    cancelled: () => cancelled,
    answer: (confirmationId, approved) => {
      emitter.emit("hitl:confirmation-response", {
        type: "hitl:confirmation-response",
        payload: {
          confirmationId,
          approved,
          ...(approved ? {} : { reason: "Rejected by test" }),
        },
      });
    },
  };
};

/** Answers every card still open, so no HITL timer outlives its case. */
const denyOpenCards = (neurolink: NeuroLink, hitl: HitlObserver): void => {
  for (const id of hitl.cards) {
    if (neurolink.hasPendingHITLConfirmation(id)) {
      hitl.answer(id, false);
    }
  }
};

let serverCounter = 0;

/** Connects the stdio fixture server; the caller shuts external servers down. */
const addFixtureServer = async (neurolink: NeuroLink): Promise<string> => {
  const serverId = `abort-forwarding-${process.pid}-${++serverCounter}`;
  const added = await neurolink.addExternalMCPServer(serverId, {
    id: serverId,
    name: serverId,
    description: "Abort forwarding fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [FIXTURE],
  });
  assert(added.success, "fixture server failed to connect");
  return serverId;
};

const serverCalls = (neurolink: NeuroLink, serverId: string): number =>
  neurolink.getExternalMCPServer(serverId)?.metrics.totalToolCalls ?? 0;

const breakerFailures = (neurolink: NeuroLink, toolName: string): number =>
  Object.entries(neurolink.getToolCircuitBreakerStatus())
    .filter(([key]) => key.endsWith(`.${toolName}`))
    .reduce((sum, [, status]) => sum + status.failureCount, 0);

// ---------------------------------------------------------------------------
// T24-1: the loop's signal reaches a registered tool
// ---------------------------------------------------------------------------

section("the loop's signal reaches a registered tool");

await test("the loop engine's turn abort reaches a registered tool's abortSignal", async () => {
  const server = await startStandIn(anthropicToolThenText(PROBE_TOOL));
  const restore = withAnthropicEnv(server.port);
  const controller = new AbortController();
  try {
    const neurolink = new NeuroLink();
    const probe = registerProbeTool(neurolink, {
      onStart: () => setTimeout(() => controller.abort(), 100),
    });
    await settle(
      drain(
        neurolink.stream({
          input: { text: "call the tool" },
          provider: "anthropic",
          model: ANTHROPIC_MODEL,
          maxTokens: 32,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        }),
      ),
    );
    await assertSignalReachedTool(probe, "turn abort (loop engine)");
  } finally {
    restore();
    await server.close();
  }
});

await test("the loop engine's per-tool deadline aborts a registered tool's abortSignal", async () => {
  const server = await startStandIn(anthropicToolThenText(PROBE_TOOL));
  const restore = withAnthropicEnv(server.port);
  try {
    const neurolink = new NeuroLink();
    const probe = registerProbeTool(neurolink);
    await settle(
      drain(
        neurolink.stream({
          input: { text: "call the tool" },
          provider: "anthropic",
          model: ANTHROPIC_MODEL,
          maxTokens: 32,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          toolTimeoutMs: 300,
        }),
      ),
    );
    await assertSignalReachedTool(probe, "per-tool deadline (loop engine)");
  } finally {
    restore();
    await server.close();
  }
});

await test("the native generate loop's turn abort reaches a registered tool's abortSignal", async () => {
  const server = await startStandIn(openAiToolThenText(PROBE_TOOL));
  const controller = new AbortController();
  try {
    const neurolink = new NeuroLink();
    const probe = registerProbeTool(neurolink, {
      onStart: () => setTimeout(() => controller.abort(), 100),
    });
    await settle(
      neurolink.generate({
        input: { text: "call the tool" },
        provider: "openai",
        model: OPENAI_MODEL,
        maxSteps: 3,
        disableTools: false,
        disableInternalFallback: true,
        credentials: openAiCredentials(server.port),
        abortSignal: controller.signal,
      }),
    );
    await assertSignalReachedTool(probe, "turn abort (native generate loop)");
  } finally {
    await server.close();
  }
});

await test("the native generate loop's per-tool deadline aborts a registered tool's abortSignal", async () => {
  const server = await startStandIn(openAiToolThenText(PROBE_TOOL));
  try {
    await assertLoopSignalReachesTool(
      "per-tool deadline (native generate loop)",
      false,
      (neurolink) =>
        neurolink.generate({
          input: { text: "call the tool" },
          provider: "openai",
          model: OPENAI_MODEL,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          credentials: openAiCredentials(server.port),
          toolTimeoutMs: 300,
        }),
    );
  } finally {
    await server.close();
  }
});

await test("the OpenAI-compatible stream loop's turn abort reaches a registered tool's abortSignal", async () => {
  const server = await startStandIn(openAiStreamToolThenText(PROBE_TOOL));
  try {
    await assertLoopSignalReachesTool(
      "turn abort (OpenAI-compatible stream loop)",
      true,
      (neurolink, abortSignal) =>
        drain(
          neurolink.stream({
            input: { text: "call the tool" },
            provider: "openai",
            model: OPENAI_MODEL,
            maxSteps: 3,
            disableTools: false,
            disableInternalFallback: true,
            credentials: openAiCredentials(server.port),
            abortSignal,
          }),
        ),
    );
  } finally {
    await server.close();
  }
});

await test("Bedrock's loop: the turn's abort reaches a registered tool's abortSignal", async () => {
  const server = await startBedrockStandIn(PROBE_TOOL);
  const restore = withBedrockEnv(server.port);
  try {
    await assertLoopSignalReachesTool(
      "turn abort (Bedrock loop)",
      true,
      (neurolink, abortSignal) =>
        neurolink.generate({
          input: { text: "call the tool" },
          provider: "bedrock",
          model: BEDROCK_MODEL,
          maxTokens: 32,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          abortSignal,
        }),
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("Bedrock's loop: the per-tool deadline aborts a registered tool's abortSignal", async () => {
  const server = await startBedrockStandIn(PROBE_TOOL);
  const restore = withBedrockEnv(server.port);
  try {
    await assertLoopSignalReachesTool(
      "per-tool deadline (Bedrock loop)",
      false,
      (neurolink) =>
        neurolink.generate({
          input: { text: "call the tool" },
          provider: "bedrock",
          model: BEDROCK_MODEL,
          maxTokens: 32,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          toolTimeoutMs: 300,
        }),
    );
  } finally {
    restore();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// The turn's abort withdraws a pending confirmation
// ---------------------------------------------------------------------------

section("the turn's abort withdraws a pending confirmation");

/**
 * A turn on the OpenAI stand-in calls the gated tool; the turn is aborted while
 * its card is pending. The card must be withdrawn and a late approval must run
 * nothing.
 */
const assertTurnAbortWithdrawsCard = async (
  reply: Reply,
  runTurn: (
    neurolink: NeuroLink,
    port: number,
    abortSignal: AbortSignal,
  ) => Promise<unknown>,
): Promise<void> => {
  const server = await startStandIn(reply);
  const controller = new AbortController();
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [GATED_TOOL], timeout: 5000 },
  });
  const hitl = observeHitl(neurolink);
  let executions = 0;
  neurolink.registerTool(GATED_TOOL, {
    name: GATED_TOOL,
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      return "fixture executed";
    },
  });
  try {
    const turn = settle(runTurn(neurolink, server.port, controller.signal));
    assert(
      await waitFor(() => hitl.cards.length === 1, 5000),
      "the model's tool call raised no confirmation card",
    );
    controller.abort();
    await turn;
    assert(
      await waitFor(() => hitl.cancelled() === 1, 1000),
      "the turn's abort did not withdraw the card (no hitl:cancelled)",
    );
    assert(
      !neurolink.hasPendingHITLConfirmation(hitl.cards[0]),
      "the card was still pending after the turn's abort",
    );
    hitl.answer(hitl.cards[0], true);
    await delay(200);
    assertCount(
      executions,
      0,
      "a late approval of a withdrawn card ran the tool",
    );
  } finally {
    denyOpenCards(neurolink, hitl);
    await server.close();
  }
};

await test("a turn aborted while a registered tool's card is pending withdraws the card; a later approval runs nothing", () =>
  assertTurnAbortWithdrawsCard(
    openAiToolThenText(GATED_TOOL),
    (neurolink, port, abortSignal) =>
      neurolink.generate({
        input: { text: "call the tool" },
        provider: "openai",
        model: OPENAI_MODEL,
        maxSteps: 3,
        disableTools: false,
        disableInternalFallback: true,
        credentials: openAiCredentials(port),
        abortSignal,
      }),
  ));

await test("a stream turn aborted while a registered tool's card is pending withdraws the card; a later approval runs nothing", () =>
  assertTurnAbortWithdrawsCard(
    openAiStreamToolThenText(GATED_TOOL),
    (neurolink, port, abortSignal) =>
      drain(
        neurolink.stream({
          input: { text: "call the tool" },
          provider: "openai",
          model: OPENAI_MODEL,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          credentials: openAiCredentials(port),
          abortSignal,
        }),
      ),
  ));

await test("a stream turn aborted while the first of two tool calls waits for its card starts neither", async () => {
  // One streamed step that asks for the gated tool, then a per-call tool
  // that ignores its signal; any request that carries results gets text.
  const server = await startStandIn((_index, body, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(
      carriesToolResult(body)
        ? openAiStreamText("done")
        : [
            openAiChunk({ role: "assistant" }, null),
            openAiChunk(
              {
                tool_calls: [GATED_TOOL, "fixture_side_effect"].map(
                  (name, index) => ({
                    index,
                    id: `call_${index + 1}`,
                    type: "function",
                    function: { name, arguments: "{}" },
                  }),
                ),
              },
              null,
            ),
            openAiChunk({}, "tool_calls"),
            "data: [DONE]\n\n",
          ].join(""),
    );
  });
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: [GATED_TOOL], timeout: 5000 },
  });
  const hitl = observeHitl(neurolink);
  let gatedRuns = 0;
  neurolink.registerTool(GATED_TOOL, {
    name: GATED_TOOL,
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      gatedRuns++;
      return "fixture executed";
    },
  });
  let sideEffects = 0;
  const controller = new AbortController();
  try {
    const turn = settle(
      drain(
        neurolink.stream({
          input: { text: "call both tools" },
          provider: "openai",
          model: OPENAI_MODEL,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          credentials: openAiCredentials(server.port),
          abortSignal: controller.signal,
          tools: {
            fixture_side_effect: {
              description: "Per-call fixture that ignores its signal",
              inputSchema: jsonSchema({ type: "object", properties: {} }),
              execute: async () => {
                sideEffects++;
                return "side effect applied";
              },
            },
          },
        }),
      ),
    );
    assert(
      await waitFor(() => hitl.cards.length === 1, 5000),
      "the model's first tool call raised no confirmation card",
    );
    controller.abort();
    const outcome = await turn;
    await delay(200);
    assert(
      outcome.error !== undefined && isAbortError(outcome.error),
      "the aborted turn did not end with an abort error",
    );
    assertCount(gatedRuns, 0, "the gated tool ran after the turn's abort");
    assertCount(
      sideEffects,
      0,
      "the batch's next tool was started after the turn's abort",
    );
  } finally {
    denyOpenCards(neurolink, hitl);
    await server.close();
  }
});

await test("a stream turn aborted during the last tool of its last step ends with an abort error", async () => {
  const server = await startStandIn(openAiStreamToolThenText("fixture_abort"));
  const neurolink = new NeuroLink();
  const controller = new AbortController();
  let runs = 0;
  try {
    const outcome = await settle(
      drain(
        neurolink.stream({
          input: { text: "call the tool" },
          provider: "openai",
          model: OPENAI_MODEL,
          // One step: the tool call is the turn's last work.
          maxSteps: 1,
          disableTools: false,
          disableInternalFallback: true,
          credentials: openAiCredentials(server.port),
          abortSignal: controller.signal,
          tools: {
            fixture_abort: {
              description:
                "Per-call fixture: the turn is aborted while it runs",
              inputSchema: jsonSchema({ type: "object", properties: {} }),
              execute: async () => {
                runs++;
                controller.abort();
                return "finished after the abort";
              },
            },
          },
        }),
      ),
    );
    assertCount(runs, 1, "the tool did not run once");
    assert(
      outcome.error !== undefined && isAbortError(outcome.error),
      "a turn aborted during its last tool ended as a normal completion",
    );
  } finally {
    await server.close();
  }
});

await test("a turn aborted while an external tool's card is pending withdraws the card; nothing reaches the server", async () => {
  const server = await startStandIn(
    openAiToolThenText("search_code", { echo: "abort" }),
  );
  const controller = new AbortController();
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["search_code"], timeout: 5000 },
  });
  const hitl = observeHitl(neurolink);
  try {
    const serverId = await addFixtureServer(neurolink);
    const turn = settle(
      neurolink.generate({
        input: { text: "search the code" },
        provider: "openai",
        model: OPENAI_MODEL,
        maxSteps: 3,
        disableTools: false,
        disableInternalFallback: true,
        credentials: openAiCredentials(server.port),
        abortSignal: controller.signal,
      }),
    );
    assert(
      await waitFor(() => hitl.cards.length === 1, 5000),
      "the model's external tool call raised no confirmation card",
    );
    controller.abort();
    await turn;
    assert(
      await waitFor(() => hitl.cancelled() === 1, 1000),
      "the turn's abort did not withdraw the external tool's card (no hitl:cancelled)",
    );
    hitl.answer(hitl.cards[0], true);
    await delay(300);
    assertCount(
      serverCalls(neurolink, serverId),
      0,
      "a late approval of a withdrawn card reached the server",
    );
  } finally {
    denyOpenCards(neurolink, hitl);
    await neurolink.shutdownExternalMCPServers();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// A loop's per-tool deadline stops the call it reported as timed out
// ---------------------------------------------------------------------------

section("a loop's per-tool deadline stops the call");

await test("the native generate loop's per-tool deadline stops executeTool's retries", async () => {
  const server = await startStandIn(openAiToolThenText(PROBE_TOOL));
  try {
    const neurolink = new NeuroLink();
    const probe = registerProbeTool(neurolink, { holdMs: 0 });
    // Attempt 1 fails once with a retriable error, so the retry would start
    // after the default 1s delay: long after the loop's 300ms deadline told
    // the model the call timed out.
    let failedOnce = false;
    neurolink.useToolMiddleware(async (_tool, _params, _context, next) => {
      const result = await next();
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("temporary fixture failure");
      }
      return result;
    });
    await settle(
      neurolink.generate({
        input: { text: "call the tool" },
        provider: "openai",
        model: OPENAI_MODEL,
        maxSteps: 3,
        disableTools: false,
        disableInternalFallback: true,
        credentials: openAiCredentials(server.port),
        toolTimeoutMs: 300,
      }),
    );
    assert(failedOnce, "the first attempt never reached the tool middleware");
    await delay(1500);
    assertCount(
      probe.calls(),
      1,
      "a retry ran after the loop told the model the call timed out",
    );
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// T24-2: a cancelled call runs nothing
// ---------------------------------------------------------------------------

section("a cancelled call runs nothing");

await test("a signal aborted before the attempt means the tool never runs", async () => {
  const neurolink = new NeuroLink();
  const probe = registerProbeTool(neurolink);
  const outcome = await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { abortSignal: AbortSignal.abort(), retryDelayMs: 10 },
    ),
  );
  assertCount(
    probe.calls(),
    0,
    "a call cancelled before it started ran the tool",
  );
  assert(
    outcome.error !== undefined && isAbortError(outcome.error),
    "a call cancelled before it started did not end with an abort error",
  );
  assertCount(
    breakerFailures(neurolink, PROBE_TOOL),
    0,
    "a cancelled call was recorded as a breaker failure",
  );
});

await test("an abort between attempts starts no further attempt", async () => {
  const neurolink = new NeuroLink();
  const probe = registerProbeTool(neurolink, { holdMs: 1000 });
  const controller = new AbortController();
  // Attempt 1 times out at 200ms; the retry would start at ~600ms.
  setTimeout(() => controller.abort(), 350);
  const outcome = await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { timeout: 200, retryDelayMs: 400, abortSignal: controller.signal },
    ),
  );
  await delay(300);
  assertCount(probe.calls(), 1, "a retry started after the call was cancelled");
  assert(
    outcome.error !== undefined,
    "a call cancelled between attempts reported success",
  );
  assertCount(
    breakerFailures(neurolink, PROBE_TOOL),
    0,
    "a call cancelled between attempts was recorded as a breaker failure",
  );
});

await test("a signal passed only in authContext, aborted before the attempt, means the tool never runs", async () => {
  const neurolink = new NeuroLink();
  const probe = registerProbeTool(neurolink);
  const genuine = await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { authContext: { abortSignal: AbortSignal.abort() } },
    ),
  );
  // A signal from another realm or a polyfill is recognised by its shape.
  const signalShaped = {
    aborted: true,
    reason: undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  const shaped = await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { authContext: { abortSignal: signalShaped }, disableToolCache: true },
    ),
  );
  assertCount(
    probe.calls(),
    0,
    "a call cancelled through authContext ran the tool",
  );
  assert(
    genuine.error !== undefined && isAbortError(genuine.error),
    "a call cancelled through authContext did not end with an abort error",
  );
  assert(
    shaped.error !== undefined && isAbortError(shaped.error),
    "a call cancelled with a signal-shaped object did not end with an abort error",
  );
});

await test("a call its signal ends mid-run is logged as information and records no breaker failure", async () => {
  const ABORTABLE_TOOL = "fixture_abortable";
  const neurolink = new NeuroLink();
  neurolink.registerTool(ABORTABLE_TOOL, {
    name: ABORTABLE_TOOL,
    description: "Harmless local fixture that stops on its signal",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async (_args: unknown, context?: unknown) => {
      const candidate = readRecord(context).abortSignal;
      const signal = candidate instanceof AbortSignal ? candidate : undefined;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve("fixture executed"), 1500);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 50);
  const errors = await errorsLoggedDuring(() =>
    settle(
      neurolink.executeTool(
        ABORTABLE_TOOL,
        {},
        { abortSignal: controller.signal },
      ),
    ),
  );
  assertCount(errors, 0, "an abort-ended call was logged as an error");
  assertCount(
    breakerFailures(neurolink, ABORTABLE_TOOL),
    0,
    "an abort-ended call was recorded as a breaker failure",
  );
});

// The reason a loop's per-tool deadline aborts a call with: a TimeoutError
// (loopEngine.executeToolCall and the guard both throw one). The class is not
// a root export, so the test builds an Error of the same name. The
// DOMException below is the reason AbortSignal.timeout() gives.
const loopDeadlineReason = (toolName: string): Error => {
  const error = new Error(`Tool "${toolName}" execution timed out after 100ms`);
  error.name = "TimeoutError";
  return error;
};

await test("a hung call still counts as a breaker failure after its per-tool deadline aborted it; a caller's cancel does not", async () => {
  const HUNG_TOOL = "fixture_hung";
  const neurolink = new NeuroLink();
  let calls = 0;
  neurolink.registerTool(HUNG_TOOL, {
    name: HUNG_TOOL,
    description: "Harmless local fixture that ignores its signal and hangs",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      calls++;
      // Settles long after every attempt below has timed out.
      await delay(2000);
      return "fixture executed";
    },
  });
  // One attempt of 300ms; the signal (if any) fires at 100ms, mid-attempt.
  const hungCall = (abort?: (controller: AbortController) => void) => {
    const controller = new AbortController();
    if (abort) {
      setTimeout(() => abort(controller), 100);
    }
    return settle(
      neurolink.executeTool(
        HUNG_TOOL,
        {},
        {
          timeout: 300,
          maxRetries: 0,
          disableToolCache: true,
          ...(abort ? { abortSignal: controller.signal } : {}),
        },
      ),
    );
  };

  await hungCall();
  assertCount(
    breakerFailures(neurolink, HUNG_TOOL),
    1,
    "control: a hung call with no signal was not counted",
  );
  await hungCall((controller) =>
    controller.abort(loopDeadlineReason(HUNG_TOOL)),
  );
  assertCount(
    breakerFailures(neurolink, HUNG_TOOL),
    2,
    "a hung call the loop engine's deadline aborted was not counted",
  );
  await hungCall((controller) =>
    controller.abort(
      new DOMException(
        "The operation was aborted due to timeout",
        "TimeoutError",
      ),
    ),
  );
  assertCount(
    breakerFailures(neurolink, HUNG_TOOL),
    3,
    "a hung call a TimeoutError deadline aborted was not counted",
  );
  await hungCall((controller) => controller.abort());
  assertCount(
    breakerFailures(neurolink, HUNG_TOOL),
    3,
    "a hung call its caller cancelled was counted",
  );
  // A caller's own reason is a cancel even when its text says "timed out".
  await hungCall((controller) =>
    controller.abort(new Error("the user's session timed out")),
  );
  assertCount(
    breakerFailures(neurolink, HUNG_TOOL),
    3,
    "a caller's cancel whose reason mentions a timeout was counted",
  );
  assertCount(calls, 5, "the hung tool did not run once per call");
});

await test("a tool that stops on its per-tool deadline counts as a breaker failure; one that stops on a caller's cancel does not", async () => {
  const STOPPING_TOOL = "fixture_stopping";
  const neurolink = new NeuroLink();
  neurolink.registerTool(STOPPING_TOOL, {
    name: STOPPING_TOOL,
    description: "Harmless local fixture that stops on its signal",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async (_args: unknown, context?: unknown) => {
      const candidate = readRecord(context).abortSignal;
      const signal = candidate instanceof AbortSignal ? candidate : undefined;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve("fixture executed"), 1500);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
  });
  const stoppedCall = async (reason?: Error): Promise<number> => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(reason), 50);
    const startedAt = Date.now();
    await settle(
      neurolink.executeTool(
        STOPPING_TOOL,
        {},
        { abortSignal: controller.signal, disableToolCache: true },
      ),
    );
    return Date.now() - startedAt;
  };

  const deadlineElapsed = await stoppedCall(loopDeadlineReason(STOPPING_TOOL));
  assert(deadlineElapsed < 1000, "the deadline's abort did not stop the tool");
  assertCount(
    breakerFailures(neurolink, STOPPING_TOOL),
    1,
    "a tool stopped by its per-tool deadline was not counted",
  );
  const cancelElapsed = await stoppedCall();
  assert(cancelElapsed < 1000, "the caller's cancel did not stop the tool");
  assertCount(
    breakerFailures(neurolink, STOPPING_TOOL),
    1,
    "a tool stopped by its caller's cancel was counted",
  );
});

await test("a per-tool deadline that fires during the retry delay starts no retry and is not counted", async () => {
  const neurolink = new NeuroLink();
  const probe = registerProbeTool(neurolink, { holdMs: 1000 });
  const controller = new AbortController();
  // Attempt 1 times out at 200ms; the deadline fires at 350ms, inside the
  // 400ms retry delay.
  setTimeout(() => controller.abort(loopDeadlineReason(PROBE_TOOL)), 350);
  const outcome = await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { timeout: 200, retryDelayMs: 400, abortSignal: controller.signal },
    ),
  );
  await delay(300);
  assertCount(probe.calls(), 1, "a retry started after the deadline fired");
  assert(
    outcome.error !== undefined && isAbortError(outcome.error),
    "a call its deadline stopped between attempts did not end with an abort",
  );
  assertCount(
    breakerFailures(neurolink, PROBE_TOOL),
    0,
    "the abort that stopped the retry was recorded as a breaker failure",
  );
});

await test("an external tool called with an aborted signal is never sent to its server", async () => {
  const neurolink = new NeuroLink();
  try {
    const serverId = await addFixtureServer(neurolink);
    const outcome = await settle(
      neurolink.executeExternalMCPTool(
        serverId,
        "search_code",
        { echo: "cancelled" },
        { abortSignal: AbortSignal.abort() },
      ),
    );
    assertCount(
      serverCalls(neurolink, serverId),
      0,
      "a cancelled external call reached the server",
    );
    assert(
      outcome.error !== undefined && isAbortError(outcome.error),
      "a cancelled external call did not end with an abort error",
    );
  } finally {
    await neurolink.shutdownExternalMCPServers();
  }
});

await test("with the batcher on, a call that carries a signal is not batched: the tool receives it", async () => {
  const neurolink = new NeuroLink({
    mcp: { batcher: { enabled: true, maxWaitMs: 10 } },
  });
  const controller = new AbortController();
  // The tool sees the call's signal (linked to its attempt): aborting the
  // caller's signal while it runs reaches it. A batched call would carry none.
  const probe = registerProbeTool(neurolink, {
    holdMs: 1500,
    onStart: () => setTimeout(() => controller.abort(), 50),
  });
  await settle(
    neurolink.executeTool(
      PROBE_TOOL,
      {},
      { abortSignal: controller.signal, disableToolCache: true },
    ),
  );
  assertCount(probe.calls(), 1, "the tool did not run exactly once");
  assert(
    probe.signals[0] !== undefined && probe.fired[0] === true,
    "a call with a signal was batched and its tool did not receive the signal",
  );
});

// ---------------------------------------------------------------------------
// T24-3: a registerAgentTool delegation receives the turn's signal
// ---------------------------------------------------------------------------

section("registerAgentTool");

const AGENT_TOOL = "research";
const WORKER_TASK = "WORKERTASK";
const AGENT_TASK = `${WORKER_TASK} investigate`;

type AgentStandIn = {
  server: StandIn;
  worker: { requests: number; answered: boolean; closedEarly: boolean };
  /**
   * Answers the worker request that is still held, so teardown never resets
   * it: on a build where the abort does not reach the worker, a reset would be
   * a provider error that the worker's fallback could take elsewhere.
   */
  release: () => void;
};

/**
 * The host model asks the agent tool once. The worker's first model request
 * is held long past the abort, which `controller` fires 300ms after that
 * request arrives; any later worker request is answered at once.
 */
const startAgentStandIn = async (
  controller: AbortController,
): Promise<AgentStandIn> => {
  const worker = { requests: 0, answered: false, closedEarly: false };
  let releaseWorker = (): void => undefined;
  const server = await startStandIn((_index, body, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    if (carriesToolResult(body)) {
      res.end(openAiText("done"));
      return;
    }
    if (!body.includes(WORKER_TASK)) {
      res.end(openAiToolCall(AGENT_TOOL, { task: AGENT_TASK }));
      return;
    }
    worker.requests++;
    if (worker.requests > 1) {
      res.end(openAiText("WORKER-REPORT done"));
      return;
    }
    setTimeout(() => controller.abort(), 300);
    const timer = setTimeout(() => releaseWorker(), 5000);
    timer.unref();
    releaseWorker = () => {
      if (!worker.answered && !worker.closedEarly) {
        worker.answered = true;
        clearTimeout(timer);
        res.end(openAiText("WORKER-REPORT done"));
      }
    };
    res.once("close", () => {
      if (!worker.answered) {
        clearTimeout(timer);
        worker.closedEarly = true;
      }
    });
  });
  return { server, worker, release: () => releaseWorker() };
};

/** A host with the agent tool, and one turn aborted while its worker runs. */
const runAbortedDelegation = async (
  standIn: AgentStandIn,
  controller: AbortController,
): Promise<NeuroLink> => {
  const host = new NeuroLink({
    credentials: openAiCredentials(standIn.server.port),
  });
  await host.registerAgentTool(
    {
      id: AGENT_TOOL,
      name: "Research",
      description: "Investigates a question",
      instructions: "Investigate and report.",
      provider: "openai",
      model: OPENAI_MODEL,
      maxSteps: 1,
    },
    // A worker never sees the agent tool, so it cannot delegate again.
    { maxDepth: 1 },
  );
  const turn = settle(
    host.generate({
      input: { text: "use the research agent" },
      provider: "openai",
      model: OPENAI_MODEL,
      maxSteps: 3,
      disableInternalFallback: true,
      abortSignal: controller.signal,
    }),
  );
  assert(
    await waitFor(() => standIn.worker.requests === 1, 5000),
    "the delegation never reached its worker",
  );
  await turn;
  assert(
    await waitFor(() => standIn.worker.closedEarly, 2000),
    "the turn's abort did not reach the delegated worker",
  );
  return host;
};

await test("a registerAgentTool delegation receives the turn's abort: its worker's model request is cancelled", async () => {
  const controller = new AbortController();
  const standIn = await startAgentStandIn(controller);
  try {
    await runAbortedDelegation(standIn, controller);
  } finally {
    standIn.release();
    await standIn.server.close();
  }
});

// ---------------------------------------------------------------------------
// A result produced after the call's signal fired is not cached
// ---------------------------------------------------------------------------

section("a result produced after the call's signal fired is not cached");

await test("a tool result produced after the turn's abort is not cached: the same call without a signal runs again", async () => {
  const server = await startStandIn(anthropicToolThenText(PROBE_TOOL));
  const restore = withAnthropicEnv(server.port);
  const controller = new AbortController();
  try {
    const neurolink = new NeuroLink();
    const probe = registerProbeTool(neurolink, {
      onStart: () => setTimeout(() => controller.abort(), 100),
    });
    await settle(
      drain(
        neurolink.stream({
          input: { text: "call the tool" },
          provider: "anthropic",
          model: ANTHROPIC_MODEL,
          maxTokens: 32,
          maxSteps: 3,
          disableTools: false,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        }),
      ),
    );
    await assertSignalReachedTool(probe, "turn abort (loop engine)");
    // The aborted call's own executeTool settles just after the tool does.
    await delay(200);
    const again = await neurolink.executeTool(PROBE_TOOL, {});
    assertCount(
      probe.calls(),
      2,
      "the identical call was answered from the cache instead of running",
    );
    assert(
      !JSON.stringify(again).includes(ABORTED_VALUE),
      "the identical call returned the aborted call's result",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("an agent delegation ended by the turn's abort is not cached: the same call without a signal delegates again", async () => {
  const controller = new AbortController();
  const standIn = await startAgentStandIn(controller);
  try {
    const host = await runAbortedDelegation(standIn, controller);
    // The aborted delegation's own executeTool settles just after its worker.
    await delay(300);
    const again = await host.executeTool(AGENT_TOOL, { task: AGENT_TASK });
    assertCount(
      standIn.worker.requests,
      2,
      "the identical delegation was answered from the cache instead of running",
    );
    assert(
      !JSON.stringify(again).includes('"stopReason":"aborted"'),
      "the identical delegation returned the aborted delegation's outcome",
    );
  } finally {
    standIn.release();
    await standIn.server.close();
  }
});

/** A streamed step that asks for two tool calls at once; later requests get text. */
const openAiStreamTwoToolCalls: Reply = (_index, body, res) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const call = (index: number, name: string) => ({
    index,
    id: `call_${index + 1}`,
    type: "function",
    function: { name, arguments: "{}" },
  });
  res.end(
    carriesToolResult(body)
      ? openAiStreamText("done")
      : [
          openAiChunk({ role: "assistant" }, null),
          openAiChunk(
            {
              tool_calls: [call(0, "fixture_first"), call(1, "fixture_second")],
            },
            null,
          ),
          openAiChunk({}, "tool_calls"),
          "data: [DONE]\n\n",
        ].join(""),
  );
};

/**
 * One streamed OpenAI-compatible turn whose model asks for two tools in one
 * step; `afterFirst` runs inside the first tool. Reports the tools that ran,
 * the tool results the session stored and whether the turn ended in an abort.
 */
const runTwoToolStep = async (
  controller: AbortController,
  afterFirst: () => void,
): Promise<{ ran: string[]; storedResults: string[]; aborted: boolean }> => {
  const server = await startStandIn(openAiStreamTwoToolCalls);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: true } });
  const sessionId = `two-tool-step-${randomUUID()}`;
  const ran: string[] = [];
  const tool = (name: string, after: () => void) => ({
    description: "Per-call fixture",
    inputSchema: jsonSchema({ type: "object", properties: {} }),
    execute: async () => {
      ran.push(name);
      after();
      return `${name} finished`;
    },
  });
  try {
    const outcome = await settle(
      drain(
        neurolink.stream({
          input: { text: "call both tools" },
          provider: "openai",
          model: OPENAI_MODEL,
          maxSteps: 1,
          disableTools: false,
          disableInternalFallback: true,
          credentials: openAiCredentials(server.port),
          abortSignal: controller.signal,
          context: { sessionId },
          tools: {
            fixture_first: tool("fixture_first", afterFirst),
            fixture_second: tool("fixture_second", () => undefined),
          },
        }),
      ),
    );
    const messages = await neurolink.getSessionMessages(sessionId);
    return {
      ran,
      storedResults: messages
        .filter((m) => m.role === "tool_result")
        .map((m) => String(m.toolCallId)),
      aborted: outcome.error !== undefined && isAbortError(outcome.error),
    };
  } finally {
    await server.close();
  }
};

await test("a stream step cancelled between its tools stores the finished tool's result, starts no further tool and ends with an abort error", async () => {
  const controller = new AbortController();
  const aborted = await runTwoToolStep(controller, () => controller.abort());
  assertEqual(
    aborted.ran.join(","),
    "fixture_first",
    "a tool was started after the turn was cancelled",
  );
  assert(aborted.aborted, "the cancelled turn did not end with an abort error");
  assertEqual(
    aborted.storedResults.join(","),
    "call_1",
    "the finished tool's result was not stored before the turn ended",
  );

  // Control: with nothing aborted both tools run and both results are stored,
  // so the stores above measured the step and not an empty session.
  const whole = await runTwoToolStep(new AbortController(), () => undefined);
  assertEqual(
    whole.ran.join(","),
    "fixture_first,fixture_second",
    "the control turn did not run both tools",
  );
  assertEqual(
    whole.storedResults.join(","),
    "call_1,call_2",
    "the control turn did not store both results",
  );
});

await runSuite();
