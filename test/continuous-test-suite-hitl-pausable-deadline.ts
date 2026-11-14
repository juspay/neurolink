#!/usr/bin/env tsx
/**
 * A loop's per-tool deadline does not run while the tool call waits for a
 * human confirmation. The confirmation pauses it; approval resumes it with the
 * time that was left, not a fresh bound; work after approval that outlives the
 * remainder still times out.
 *
 * Earlier versions ran the per-tool deadline during the confirmation, so a
 * short bound could end the call before the human answered.
 *
 * Drives only the shipped surface from `dist/index.js`: `stream()` and
 * `generate()` against loopback stand-ins for each deadline family:
 *   - Anthropic Messages SSE (native client; the loop engine's deadline);
 *   - OpenAI chat-completions JSON (native generate loop; `guardToolExecutor`);
 *   - Vertex Express-mode and AI Studio Gemini SSE (`guardToolExecutor` inside
 *     the loop engine: two stacked deadlines);
 *   - Bedrock Converse over HTTP/2 (the loop engine, through Bedrock's own tool
 *     wrappers).
 * Tools are registered with `registerTool`, so every call reaches
 * `NeuroLink.executeTool`'s confirmation gate; one case uses a real stdio MCP
 * server (test/fixtures/mcp-direct-name-repair-server.mjs) for the external
 * manager's gate. Cards are answered through the documented
 * `hitl:confirmation-request` / `hitl:confirmation-response` events.
 *
 * What the model is told is read off the stand-in: the request after the tool
 * call carries its result, so "execution timed out after" means the deadline
 * fired, the tool's own text means it ran, and a refusal means the card said
 * no.
 *
 * Offline: every upstream is 127.0.0.1, and `credentialFreeEnv` (imported
 * first, before the SDK loads `.env`) strips ambient credentials. This suite
 * takes no determinism exception.
 *
 * Run: pnpm run test:hitl:pausable-deadline
 */
import "./helpers/credentialFreeEnv.js";
import { createServer } from "node:http";
import {
  createServer as createHttp2Server,
  type ServerHttp2Session,
} from "node:http2";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NeuroLink } from "../dist/index.js";
import { assert, assertEqual, defineSuite, delay } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// The repo's .mcp-config.json would start a filesystem MCP server through
// npx on the first generate(), and wait out its 60s client timeout offline.
process.env.NEUROLINK_SKIP_MCP = "true";

assertDistFresh();
const { test, section, runSuite } = defineSuite("HITL pausable deadline", {
  offline: true,
});

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-direct-name-repair-server.mjs",
);

const GATED_TOOL = "fixture_write";
const TOOL_OK = "fixture executed";
const TOOL_TIMEOUT_MS = 300;
const CARD_HOLD_MS = 1000;

// A rejection nobody handled would mean a deadline outlived its call.
let unhandledRejections = 0;
process.on("unhandledRejection", () => {
  unhandledRejections++;
});

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

const settle = async (call: Promise<unknown>): Promise<unknown> => {
  try {
    return await call;
  } catch (error) {
    return error;
  }
};

const drain = async (
  streamed: Promise<{ stream: AsyncIterable<unknown> }>,
): Promise<void> => {
  const { stream } = await streamed;
  for await (const chunk of stream) {
    void chunk;
  }
};

/** Holds the event loop for `ms`: time the deadline spends before the card. */
const busyWait = (ms: number): void => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    // Intentionally synchronous.
  }
};

// ---------------------------------------------------------------------------
// Model stand-ins
// ---------------------------------------------------------------------------

type Family = "anthropic" | "openai" | "vertex" | "google-ai" | "bedrock";

type ModelRequest = { at: number; body: string };

type StandIn = {
  requests: ModelRequest[];
  port: number;
  close: () => Promise<void>;
};

const anthropicEvent = (
  event: string,
  payload: Record<string, unknown>,
): string =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;

const anthropicToolTurn = (name: string, input: Record<string, unknown>) =>
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
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    }),
    anthropicEvent("content_block_stop", { index: 0 }),
    anthropicEvent("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    anthropicEvent("message_stop", {}),
  ].join("");

const anthropicTextTurn = (text: string) =>
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

const openAiCompletion = (message: Record<string, unknown>, finish: string) =>
  JSON.stringify({
    id: "pausable-deadline",
    object: "chat.completion",
    created: 1,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", ...message },
        finish_reason: finish,
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });

const geminiEvent = (parts: unknown[]) =>
  `data: ${JSON.stringify({
    candidates: [
      { content: { parts, role: "model" }, finishReason: "STOP", index: 0 },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  })}\r\n\r\n`;

/**
 * Answers the first request with one call to `toolName` and every later one
 * with text, in the wire format of `family`.
 */
const startHttpStandIn = async (
  family: Exclude<Family, "bedrock">,
  toolName: string,
  toolArgs: Record<string, unknown>,
  t0: () => number,
): Promise<StandIn> => {
  const requests: ModelRequest[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      requests.push({
        at: Date.now() - t0(),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      const first = requests.length === 1;
      if (family === "openai") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          first
            ? openAiCompletion(
                {
                  content: null,
                  tool_calls: [
                    {
                      id: "call_1",
                      type: "function",
                      function: {
                        name: toolName,
                        arguments: JSON.stringify(toolArgs),
                      },
                    },
                  ],
                },
                "tool_calls",
              )
            : openAiCompletion({ content: "done" }, "stop"),
        );
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (family === "anthropic") {
        res.end(
          first
            ? anthropicToolTurn(toolName, toolArgs)
            : anthropicTextTurn("done"),
        );
        return;
      }
      res.end(
        first
          ? geminiEvent([{ functionCall: { name: toolName, args: toolArgs } }])
          : geminiEvent([{ text: "done" }]),
      );
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
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

// @aws-sdk/client-bedrock-runtime refuses an HTTP/1.1 server; generate() uses
// the non-streaming Converse operation.
const startBedrockStandIn = async (
  toolName: string,
  t0: () => number,
): Promise<StandIn> => {
  const requests: ModelRequest[] = [];
  const sessions = new Set<ServerHttp2Session>();
  const server = createHttp2Server();
  server.on("session", (session) => {
    sessions.add(session);
    session.once("close", () => sessions.delete(session));
  });
  server.on("stream", (stream) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      requests.push({
        at: Date.now() - t0(),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      const first = requests.length === 1;
      stream.respond({ ":status": 200, "content-type": "application/json" });
      stream.end(
        JSON.stringify(
          first
            ? {
                output: {
                  message: {
                    role: "assistant",
                    content: [
                      {
                        toolUse: {
                          name: toolName,
                          toolUseId: "tooluse_1",
                          input: {},
                        },
                      },
                    ],
                  },
                },
                stopReason: "tool_use",
                usage: { inputTokens: 12, outputTokens: 6, totalTokens: 18 },
              }
            : {
                output: {
                  message: { role: "assistant", content: [{ text: "done" }] },
                },
                stopReason: "end_turn",
                usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
              },
        ),
      );
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
        for (const session of sessions) {
          session.destroy();
        }
        server.close(() => resolve());
      }),
  };
};

const MODELS: Record<Family, string> = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o-mini",
  vertex: "gemini-2.0-flash",
  "google-ai": "gemini-2.0-flash",
  bedrock: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
};

/** Env the Anthropic and Bedrock SDKs read; set per case, then restored. */
const withFamilyEnv = (family: Family, port: number): (() => void) => {
  const values: Record<string, string> =
    family === "anthropic"
      ? {
          ANTHROPIC_API_KEY: "test-key",
          ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
          ANTHROPIC_AUTH_METHOD: "api_key",
        }
      : family === "bedrock"
        ? {
            AWS_ENDPOINT_URL_BEDROCK_RUNTIME: `http://127.0.0.1:${port}`,
            AWS_ACCESS_KEY_ID: "test-fake-aws-key-id",
            AWS_SECRET_ACCESS_KEY: "test-fake-aws-secret",
            AWS_REGION: "us-east-1",
          }
        : {};
  const saved = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
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

const familyCredentials = (family: Family, port: number) =>
  family === "openai"
    ? {
        openai: {
          apiKey: "sk-mock-local-server",
          baseURL: `http://127.0.0.1:${port}/v1`,
        },
      }
    : family === "vertex"
      ? {
          vertex: {
            apiKey: "express-key",
            baseURL: `http://127.0.0.1:${port}`,
          },
        }
      : family === "google-ai"
        ? {
            googleAiStudio: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${port}`,
            },
          }
        : undefined;

/** One turn on `family` that calls the tool, bounded at `toolTimeoutMs`. */
const runTurn = (
  neurolink: NeuroLink,
  family: Family,
  port: number,
  abortSignal: AbortSignal,
  toolTimeoutMs: number,
): Promise<unknown> => {
  const credentials = familyCredentials(family, port);
  const request = {
    input: { text: "call the tool" },
    provider: family,
    model: MODELS[family],
    maxTokens: 32,
    maxSteps: 3,
    disableTools: false,
    disableInternalFallback: true,
    toolTimeoutMs,
    abortSignal,
    ...(credentials ? { credentials } : {}),
  };
  return family === "openai" || family === "bedrock"
    ? neurolink.generate(request)
    : drain(neurolink.stream(request));
};

// ---------------------------------------------------------------------------
// One confirmed turn
// ---------------------------------------------------------------------------

type TurnPlan = {
  /** How long the card waits before it is answered. */
  holdMs: number;
  answer: "approve" | "deny" | "none";
  /** How long the tool works once it runs. */
  workMs?: number;
  /** The tool stops (rejects) when its signal fires. */
  honorSignal?: boolean;
  /** Time spent inside the call before the card is raised. */
  preCardMs?: number;
  /** The card's own timeout. */
  hitlTimeoutMs?: number;
  /** Abort the turn this long after the card is raised. */
  abortAfterCardMs?: number;
  /** An external MCP tool instead of a registered one. */
  external?: boolean;
  /** The loop's per-tool bound (default TOOL_TIMEOUT_MS). */
  toolTimeoutMs?: number;
};

type ToolResult = "SUCCESS" | "TIMEOUT" | "REFUSED" | "OTHER" | "NONE";

type TurnOutcome = {
  cards: number;
  cardAt: number;
  answeredAt: number;
  cancelled: number;
  cardPendingAtAbort: boolean;
  executions: number;
  /** When the request carrying the tool's result reached the model. */
  resultAt: number;
  result: ToolResult;
  modelRequests: number;
  breakerFailures: number;
};

const classify = (body: string | undefined, okText: string): ToolResult => {
  if (body === undefined) {
    return "NONE";
  }
  if (body.includes("execution timed out after")) {
    return "TIMEOUT";
  }
  if (body.includes(okText)) {
    return "SUCCESS";
  }
  if (
    body.includes("rejected by user") ||
    body.includes("Confirmation timeout")
  ) {
    return "REFUSED";
  }
  return "OTHER";
};

const runConfirmedTurn = async (
  family: Family,
  plan: TurnPlan,
): Promise<TurnOutcome> => {
  let base = Date.now();
  const t0 = () => base;
  const toolName = plan.external ? "search_code" : GATED_TOOL;
  const okText = plan.external ? "ran:search_code" : TOOL_OK;
  const server =
    family === "bedrock"
      ? await startBedrockStandIn(toolName, t0)
      : await startHttpStandIn(
          family,
          toolName,
          plan.external ? { echo: "x" } : {},
          t0,
        );
  const restore = withFamilyEnv(family, server.port);
  const neurolink = new NeuroLink({
    hitl: {
      enabled: true,
      dangerousActions: [toolName],
      timeout: plan.hitlTimeoutMs ?? 10_000,
    },
  });
  let serverId: string | undefined;
  let executions = 0;
  if (plan.external) {
    serverId = `pausable-deadline-${process.pid}`;
    const added = await neurolink.addExternalMCPServer(serverId, {
      id: serverId,
      name: serverId,
      description: "Pausable deadline fixture",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [FIXTURE],
    });
    assert(added.success, "fixture server failed to connect");
  } else {
    neurolink.registerTool(GATED_TOOL, {
      name: GATED_TOOL,
      description: "Harmless local HITL fixture",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async (_args: unknown, context?: unknown) => {
        executions++;
        const candidate = readRecord(context).abortSignal;
        const signal =
          plan.honorSignal && candidate instanceof AbortSignal
            ? candidate
            : undefined;
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, plan.workMs ?? 0);
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        });
        return TOOL_OK;
      },
    });
  }

  const emitter = neurolink.getEventEmitter();
  if (plan.preCardMs) {
    let spent = false;
    emitter.on("tool:start", () => {
      if (!spent) {
        spent = true;
        busyWait(plan.preCardMs ?? 0);
      }
    });
  }
  const controller = new AbortController();
  const outcome: TurnOutcome = {
    cards: 0,
    cardAt: -1,
    answeredAt: -1,
    cancelled: 0,
    cardPendingAtAbort: false,
    executions: 0,
    resultAt: -1,
    result: "NONE",
    modelRequests: 0,
    breakerFailures: 0,
  };
  emitter.on("hitl:cancelled", () => {
    outcome.cancelled++;
  });
  emitter.on("hitl:confirmation-request", (event: unknown) => {
    outcome.cards++;
    outcome.cardAt = Date.now() - base;
    const confirmationId = String(readPayload(event).confirmationId);
    if (plan.abortAfterCardMs !== undefined) {
      setTimeout(() => {
        outcome.cardPendingAtAbort =
          neurolink.hasPendingHITLConfirmation(confirmationId);
        controller.abort();
      }, plan.abortAfterCardMs);
    }
    if (plan.answer !== "none") {
      setTimeout(() => {
        outcome.answeredAt = Date.now() - base;
        emitter.emit("hitl:confirmation-response", {
          type: "hitl:confirmation-response",
          payload: {
            confirmationId,
            approved: plan.answer === "approve",
            ...(plan.answer === "deny" ? { reason: "Rejected by test" } : {}),
          },
        });
      }, plan.holdMs);
    }
  });

  try {
    base = Date.now();
    const toolTimeoutMs = plan.toolTimeoutMs ?? TOOL_TIMEOUT_MS;
    await settle(
      runTurn(neurolink, family, server.port, controller.signal, toolTimeoutMs),
    );
    // Long enough for anything the turn left running to show itself.
    const settleUntil =
      base + plan.holdMs + (plan.workMs ?? 0) + toolTimeoutMs + 400;
    await delay(Math.max(0, settleUntil - Date.now()));
    const second = server.requests[1];
    outcome.executions = plan.external
      ? (neurolink.getExternalMCPServer(serverId ?? "")?.metrics
          .totalToolCalls ?? 0)
      : executions;
    outcome.resultAt = second?.at ?? -1;
    outcome.result = classify(second?.body, okText);
    outcome.modelRequests = server.requests.length;
    outcome.breakerFailures = Object.entries(
      neurolink.getToolCircuitBreakerStatus(),
    )
      .filter(([key]) => key.endsWith(`.${toolName}`))
      .reduce((sum, [, status]) => sum + status.failureCount, 0);
    return outcome;
  } finally {
    if (plan.external) {
      await neurolink.shutdownExternalMCPServers();
    }
    restore();
    await server.close();
  }
};

// ---------------------------------------------------------------------------
// The three scenarios, per family
// ---------------------------------------------------------------------------

const FAMILY_LABEL: Record<Family, string> = {
  anthropic: "loop engine (Anthropic)",
  openai: "guard (OpenAI native generate loop)",
  vertex: "guard inside the loop engine (Vertex)",
  "google-ai": "guard inside the loop engine (AI Studio)",
  bedrock: "loop engine (Bedrock)",
};

/** (i) The bound does not fire while the card waits; approval runs the tool. */
const assertDeadlineWaitsForCard = async (family: Family): Promise<void> => {
  const outcome = await runConfirmedTurn(family, {
    holdMs: CARD_HOLD_MS,
    answer: "approve",
  });
  assertCount(outcome.cards, 1, "the call did not raise exactly one card");
  assert(
    outcome.result !== "TIMEOUT",
    "the tool bound fired while the card waited",
  );
  assertEqual(
    outcome.result,
    "SUCCESS",
    "the approved tool's result did not reach the model",
  );
  assertCount(outcome.executions, 1, "the approved tool did not run once");
  assert(
    outcome.resultAt >= outcome.answeredAt,
    "the model heard about the call before the human answered",
  );
  assertCount(
    outcome.breakerFailures,
    0,
    "a healthy call that waited for a card was counted as a failure",
  );
};

/**
 * (ii) On a 1,500 ms bound, the deadline spends 1,000 ms before the card is
 * raised, so after approval only ~500 ms are left. 750 ms of work therefore
 * times out, within 1,000 ms of approval: a fresh 1,500 ms bound would have
 * let it finish. The card is held 2 s, longer than the whole bound. The
 * margins are wide so a loaded CI machine cannot blur the two.
 */
const REMAINDER_BOUND_MS = 1500;
const assertRemainderKept = async (family: Family): Promise<void> => {
  const outcome = await runConfirmedTurn(family, {
    holdMs: 2000,
    answer: "approve",
    preCardMs: 1000,
    workMs: 750,
    toolTimeoutMs: REMAINDER_BOUND_MS,
  });
  assertCount(outcome.cards, 1, "the call did not raise exactly one card");
  assert(
    outcome.resultAt >= outcome.answeredAt,
    "the bound fired before the human answered",
  );
  assertEqual(
    outcome.result,
    "TIMEOUT",
    "work longer than the remainder finished: the bound restarted in full",
  );
  assert(
    outcome.resultAt - outcome.answeredAt < 1000,
    `the bound fired ${outcome.resultAt - outcome.answeredAt} ms after approval, not after the ~500 ms that were left`,
  );
};

/**
 * (iii) Work after approval longer than the remainder still times out, and a
 * tool its deadline stopped counts toward the breaker.
 */
const assertPostApprovalWorkTimesOut = async (
  family: Family,
): Promise<void> => {
  const outcome = await runConfirmedTurn(family, {
    holdMs: CARD_HOLD_MS,
    answer: "approve",
    workMs: 800,
    honorSignal: true,
  });
  assertCount(outcome.cards, 1, "the call did not raise exactly one card");
  assert(
    outcome.resultAt >= outcome.answeredAt,
    "the bound fired while the card waited",
  );
  assertEqual(
    outcome.result,
    "TIMEOUT",
    "work longer than the bound did not time out after approval",
  );
  assert(
    outcome.resultAt - outcome.answeredAt < 600,
    `the bound fired ${outcome.resultAt - outcome.answeredAt} ms after approval`,
  );
  assertCount(outcome.executions, 1, "the approved tool did not run once");
  assertCount(
    outcome.breakerFailures,
    1,
    "a tool its deadline stopped after approval was not counted",
  );
};

section("a confirmation pauses the per-tool deadline");

for (const family of [
  "anthropic",
  "openai",
  "vertex",
  "google-ai",
  "bedrock",
] as const) {
  await test(`${FAMILY_LABEL[family]}: a 300 ms tool bound does not fire during a 1 s confirmation`, () =>
    assertDeadlineWaitsForCard(family));
}

for (const family of ["anthropic", "openai", "vertex", "google-ai"] as const) {
  await test(`${FAMILY_LABEL[family]}: after approval the remaining time is what was left, not a fresh bound`, () =>
    assertRemainderKept(family));
  await test(`${FAMILY_LABEL[family]}: post-approval work longer than the remainder still times out and counts toward the breaker`, () =>
    assertPostApprovalWorkTimesOut(family));
}

await test("an external tool's confirmation pauses the loop engine's deadline too", async () => {
  const outcome = await runConfirmedTurn("anthropic", {
    holdMs: CARD_HOLD_MS,
    answer: "approve",
    external: true,
  });
  assertCount(outcome.cards, 1, "the call did not raise exactly one card");
  assert(
    outcome.result !== "TIMEOUT",
    "the tool bound fired while the external tool's card waited",
  );
  assertEqual(
    outcome.result,
    "SUCCESS",
    "the approved external tool's result did not reach the model",
  );
  assertCount(outcome.executions, 1, "the external server was not called once");
});

// ---------------------------------------------------------------------------
// The paused deadline and the confirmation's other outcomes
// ---------------------------------------------------------------------------

section("the paused deadline and the confirmation's other outcomes");

for (const family of ["anthropic", "openai"] as const) {
  await test(`${FAMILY_LABEL[family]}: a denied card returns its refusal; the resumed deadline never reports a timeout`, async () => {
    const outcome = await runConfirmedTurn(family, {
      holdMs: CARD_HOLD_MS,
      answer: "deny",
    });
    assertCount(outcome.cards, 1, "the call did not raise exactly one card");
    assertEqual(
      outcome.result,
      "REFUSED",
      "the model was not told the human refused the call",
    );
    assertCount(outcome.executions, 0, "a denied tool ran");
    // The tool call, then the request that carries the refusal.
    assertCount(
      outcome.modelRequests,
      2,
      "the turn did not end after the refusal reached the model",
    );
  });

  await test(`${FAMILY_LABEL[family]}: a turn aborted while its card waits withdraws the card; nothing runs or reaches the model afterwards`, async () => {
    const rejectionsBefore = unhandledRejections;
    const outcome = await runConfirmedTurn(family, {
      holdMs: CARD_HOLD_MS,
      answer: "none",
      abortAfterCardMs: 600,
    });
    assertCount(outcome.cards, 1, "the call did not raise exactly one card");
    assert(
      outcome.cardPendingAtAbort,
      "the card was not still waiting when the turn was aborted",
    );
    assertCount(
      outcome.cancelled,
      1,
      "the turn's abort did not withdraw the card",
    );
    assertCount(outcome.executions, 0, "a withdrawn card's tool ran");
    assertCount(
      outcome.modelRequests,
      1,
      "the aborted turn made another model request",
    );
    assertCount(
      unhandledRejections - rejectionsBefore,
      0,
      "a deadline outlived its aborted call",
    );
  });
}

await test("loop engine (Anthropic): a card that times out returns its refusal, not the loop's timeout", async () => {
  const outcome = await runConfirmedTurn("anthropic", {
    holdMs: CARD_HOLD_MS,
    answer: "none",
    hitlTimeoutMs: 600,
  });
  assertCount(outcome.cards, 1, "the call did not raise exactly one card");
  assertEqual(
    outcome.result,
    "REFUSED",
    "the model was not told the card timed out",
  );
  assert(
    outcome.resultAt >= 600,
    "the model heard about the call before the card timed out",
  );
  assertCount(outcome.executions, 0, "a tool whose card timed out ran");
});

// Last: the listener above counts and swallows every unhandled rejection, so
// without this check one raised by any earlier case would pass unnoticed.
await test("no case left a rejection unhandled", async () => {
  // A rejection raised by the last case is reported on a later tick.
  await delay(50);
  assertCount(
    unhandledRejections,
    0,
    "a rejection went unhandled during the suite",
  );
});

await runSuite();
