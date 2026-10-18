#!/usr/bin/env tsx
// First: strips ambient credentials, endpoint overrides and stored logins
// before `harness.js` or `dist` load `.env`.
import "./helpers/credentialFreeEnv.js";

/**
 * Continuous Test Suite — extended thinking never rides with a forced
 * tool_choice on the direct Anthropic provider (issue #2048).
 *
 * Anthropic rejects a request that sets `thinking: { type: "enabled" }` while
 * `tool_choice` forces tool use (`any`, or a named `tool`): "Thinking may not
 * be enabled when tool_choice forces tool use." The direct provider built the
 * two independently, so three ways of asking for both got a 400:
 *
 *  - `generate({ schema })` with no tools, which forces a synthetic JSON tool;
 *  - a caller `toolChoice` of `"required"` or a named tool, on generate;
 *  - the same on stream, where the choice is resolved per step.
 *
 * The forced choice wins and thinking is omitted for that request, as the
 * Vertex schema path and the OAuth proxy path already do. Two follow-ons are
 * pinned as well:
 *
 *  - The step after a forced one continues a tool call made without thinking,
 *    and Anthropic does not let thinking start mid-turn, so it stays off until
 *    the turn ends. The next turn thinks again.
 *  - `budget_tokens` is clamped to leave 1024 tokens of `max_tokens` for the
 *    answer, and omitted when no budget of at least 1024 fits.
 *
 * WHY THIS ASSERTS ON THE REQUEST. The fix changes the bytes sent; the 400 is
 * the vendor's answer to them. A local stand-in serves the Messages API wire
 * shape over `ANTHROPIC_BASE_URL` and records each request body, so the real
 * provider, SDK and request builders run, driven through `NeuroLink` from
 * `../dist`, and only the vendor is substituted. It also refuses, with a 400,
 * every request that pairs thinking with a forced choice, so a regression
 * fails the call as the real API would. No credentials, no network egress.
 * Follows `continuous-test-suite-anthropic-thinking-disabled`.
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-anthropic-thinking-forced-tool.ts
 *      pnpm run test:anthropic-thinking-forced-tool
 */

import { createServer, type Server, type ServerResponse } from "node:http";
import { z } from "zod";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink, tool } from "../dist/index.js";
import type { GenerateOptions, StreamOptions } from "../src/lib/types/index.js";

assertDistFresh();

const { test, runSuite, section } = defineSuite(
  "Anthropic thinking with a forced tool_choice",
  { offline: true },
);

const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
  "NEUROLINK_SKIP_MCP",
] as const;

type SeenBody = Record<string, unknown>;
type Mode = "generate" | "stream";

/**
 * An active model that takes manual extended thinking (`budget_tokens`) and a
 * forced tool_choice. The 5.5 / 5.1 families reject a forced choice, and the
 * 3.x models are retired.
 */
const MODEL = "claude-sonnet-4-5";
const BUDGET = 5000;
const MAX_TOKENS = 16000;
const TOOL_NAME = "get_weather";
const SECOND_TOOL_NAME = "get_time";
const FORCED_THINKING_400 =
  "Thinking may not be enabled when tool_choice forces tool use.";
const MID_TURN_THINKING_400 =
  "Expected `thinking` or `redacted_thinking`, but found `tool_use`. When `thinking` is enabled, a final `assistant` message must start with a thinking block.";

const asObject = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const choiceType = (body: SeenBody): unknown =>
  asObject(body.tool_choice)?.type;

const isForced = (body: SeenBody): boolean =>
  choiceType(body) === "any" || choiceType(body) === "tool";

const thinkingOn = (body: SeenBody): boolean =>
  asObject(body.thinking)?.type === "enabled";

const contentBlocks = (message: unknown): Record<string, unknown>[] => {
  const content = asObject(message)?.content;
  return Array.isArray(content)
    ? content.map((block) => asObject(block) ?? {})
    : [];
};

/**
 * Anthropic's rule for thinking inside a tool turn: when the final assistant
 * message calls a tool, it must open with a thinking block.
 */
const finalAssistantCallsToolWithoutThinking = (body: SeenBody): boolean => {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (asObject(messages[i])?.role !== "assistant") {
      continue;
    }
    const blocks = contentBlocks(messages[i]);
    if (!blocks.some((block) => block.type === "tool_use")) {
      return false;
    }
    return (
      blocks[0]?.type !== "thinking" && blocks[0]?.type !== "redacted_thinking"
    );
  }
  return false;
};

/** Whether a request body breaks one of Anthropic's thinking rules. */
const rejectionFor = (body: SeenBody): string | undefined => {
  if (!thinkingOn(body)) {
    return undefined;
  }
  if (isForced(body)) {
    return FORCED_THINKING_400;
  }
  if (finalAssistantCallsToolWithoutThinking(body)) {
    return MID_TURN_THINKING_400;
  }
  return undefined;
};

/**
 * The tool a forced choice names. For `any`, the suite's own tool when it is
 * declared (NeuroLink's built-in tools are declared ahead of it), else the
 * first declared tool.
 */
const forcedToolName = (body: SeenBody): string => {
  const named = asObject(body.tool_choice)?.name;
  if (typeof named === "string") {
    return named;
  }
  const names = (Array.isArray(body.tools) ? body.tools : [])
    .map((t) => asObject(t)?.name)
    .filter((n): n is string => typeof n === "string");
  return names.includes(TOOL_NAME) ? TOOL_NAME : (names[0] ?? TOOL_NAME);
};

const toolInputFor = (name: string): Record<string, unknown> =>
  name === TOOL_NAME || name === SECOND_TOOL_NAME
    ? { city: "Paris" }
    : { answer: "ok" };

/** How the stand-in answers a forced choice: one tool call, or two in parallel. */
const fixture = { parallelCalls: false };

/** The tool calls answering a forced choice. */
const callsFor = (body: SeenBody): Array<{ id: string; name: string }> => {
  const name = forcedToolName(body);
  return fixture.parallelCalls
    ? [
        { id: "toolu_local_1", name },
        { id: "toolu_local_2", name: SECOND_TOOL_NAME },
      ]
    : [{ id: "toolu_local_1", name }];
};

const sendSse = (res: ServerResponse, events: Array<[string, unknown]>) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const [event, data] of events) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  res.end();
};

const messageStart = {
  type: "message_start",
  message: {
    id: "msg_local_fixture",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 0 },
  },
};

/**
 * Records every request body. A forced choice is answered with a call to the
 * tool it forces; anything else with the text "ok". A request that pairs
 * thinking with a forced choice gets Anthropic's 400.
 */
const startMessagesServer = async (
  seen: SeenBody[],
): Promise<{ server: Server; port: number }> => {
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      let body: SeenBody = {};
      try {
        body = JSON.parse(raw) as SeenBody;
      } catch {
        // Recorded as empty; the assertions then fail.
      }
      seen.push(body);
      const rejection = rejectionFor(body);
      if (rejection) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            type: "error",
            error: { type: "invalid_request_error", message: rejection },
          }),
        );
        return;
      }
      const calls = isForced(body) ? callsFor(body) : [];
      const name = calls[0]?.name;
      if (body.stream === true) {
        const blocks: Array<[string, unknown]> = calls.length
          ? calls.flatMap(
              (call, index): Array<[string, unknown]> => [
                [
                  "content_block_start",
                  {
                    type: "content_block_start",
                    index,
                    content_block: {
                      type: "tool_use",
                      id: call.id,
                      name: call.name,
                      input: {},
                    },
                  },
                ],
                [
                  "content_block_delta",
                  {
                    type: "content_block_delta",
                    index,
                    delta: {
                      type: "input_json_delta",
                      partial_json: JSON.stringify(toolInputFor(call.name)),
                    },
                  },
                ],
                ["content_block_stop", { type: "content_block_stop", index }],
              ],
            )
          : [
              [
                "content_block_start",
                {
                  type: "content_block_start",
                  index: 0,
                  content_block: { type: "text", text: "" },
                },
              ],
              [
                "content_block_delta",
                {
                  type: "content_block_delta",
                  index: 0,
                  delta: { type: "text_delta", text: "ok" },
                },
              ],
              ["content_block_stop", { type: "content_block_stop", index: 0 }],
            ];
        sendSse(res, [
          ["message_start", messageStart],
          ...blocks,
          [
            "message_delta",
            {
              type: "message_delta",
              delta: {
                stop_reason: name ? "tool_use" : "end_turn",
                stop_sequence: null,
              },
              usage: { output_tokens: 3 },
            },
          ],
          ["message_stop", { type: "message_stop" }],
        ]);
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_local_fixture",
          type: "message",
          role: "assistant",
          model: MODEL,
          content: calls.length
            ? calls.map((call) => ({
                type: "tool_use",
                id: call.id,
                name: call.name,
                input: toolInputFor(call.name),
              }))
            : [{ type: "text", text: "ok" }],
          stop_reason: name ? "tool_use" : "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 5, output_tokens: 3 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
};

const weatherTools = (counter: { calls: number }) => ({
  [TOOL_NAME]: tool({
    description: "Returns the current weather for a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }: { city: string }) => {
      counter.calls++;
      return { city, tempC: 22 };
    },
  }),
  [SECOND_TOOL_NAME]: tool({
    description: "Returns the local time in a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }: { city: string }) => {
      counter.calls++;
      return { city, time: "12:00" };
    },
  }),
});

type CallOptions = Record<string, unknown>;

void runSuite(async () => {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
  }
  const seen: SeenBody[] = [];
  const { server, port } = await startMessagesServer(seen);
  process.env.ANTHROPIC_API_KEY = "local-fixture-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  process.env.NEUROLINK_SKIP_MCP = "true";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const historyNeurolink = new NeuroLink({
    conversationMemory: { enabled: true, replayToolSteps: "full" },
  });

  /**
   * Makes one real call and returns every request body it sent. A call that
   * fails is a failure of the case: the stand-in fails exactly the requests
   * Anthropic would reject. The message is fixed, so a provider-error text
   * cannot turn the failure into a skip.
   */
  const requestsFor = async (
    mode: Mode,
    extra: CallOptions,
  ): Promise<SeenBody[]> => {
    seen.splice(0);
    const options = {
      provider: "anthropic",
      model: MODEL,
      input: { text: "What is the weather in Paris?" },
      maxTokens: MAX_TOKENS,
      disableInternalFallback: true,
      thinkingConfig: { enabled: true, budgetTokens: BUDGET },
      ...extra,
    };
    let failed = false;
    try {
      if (mode === "generate") {
        await neurolink.generate(options as GenerateOptions);
      } else {
        const result = await neurolink.stream(options as StreamOptions);
        for await (const chunk of result.stream) {
          void chunk;
        }
      }
    } catch {
      failed = true;
    }
    assert(seen.length > 0, `no ${mode} request reached the stand-in`);
    assert(
      !seen.some((body) => thinkingOn(body) && isForced(body)),
      `${mode} sent thinking together with a forced tool_choice`,
    );
    assert(!failed, `the ${mode} call failed`);
    return [...seen];
  };

  try {
    section("a forced tool_choice omits thinking");

    await test("generate with a schema and no tools: forced JSON tool, no thinking", async () => {
      const bodies = await requestsFor("generate", {
        schema: z.object({ answer: z.string() }),
        output: { format: "json" },
        // No tools at all: with NeuroLink's built-in tools declared, a schema
        // takes the additive final_result path, whose choice stays auto.
        disableTools: true,
        maxSteps: 1,
      });
      assert(
        choiceType(bodies[0]) === "tool",
        "the schema request did not force its JSON tool",
      );
      assert(
        !("thinking" in bodies[0]),
        "the schema request still carried thinking",
      );
    });

    for (const mode of ["generate", "stream"] as const) {
      for (const [label, toolChoice, expected] of [
        ['toolChoice "required"', "required", "any"],
        ["a named toolChoice", { type: "tool", toolName: TOOL_NAME }, "tool"],
      ] as const) {
        await test(`${mode} with ${label}: forced first step without thinking, still off for the continuation`, async () => {
          const counter = { calls: 0 };
          const bodies = await requestsFor(mode, {
            tools: weatherTools(counter),
            toolChoice,
            maxSteps: 3,
          });
          assert(
            choiceType(bodies[0]) === expected,
            "the first step did not carry the forced tool_choice",
          );
          assert(
            !("thinking" in bodies[0]),
            "the forced step still carried thinking",
          );
          assert(counter.calls >= 1, "the forced tool was never executed");
          assert(
            bodies.length >= 2,
            "the turn did not continue after the tool",
          );
          assert(
            !isForced(bodies[1]),
            "the forced choice did not lapse after the first step",
          );
          assert(
            !thinkingOn(bodies[1]),
            "thinking was switched on partway through the tool turn",
          );
        });
      }
    }

    await test("stream with a named tool forced by prepareStep and no base toolChoice: that step omits thinking", async () => {
      const counter = { calls: 0 };
      const bodies = await requestsFor("stream", {
        tools: weatherTools(counter),
        maxSteps: 3,
        prepareStep: async ({ stepNumber }: { stepNumber: number }) =>
          stepNumber === 0
            ? { toolChoice: { type: "tool", toolName: TOOL_NAME } }
            : { toolChoice: "auto" },
      });
      assert(
        choiceType(bodies[0]) === "tool",
        "prepareStep did not force the first step",
      );
      assert(
        !("thinking" in bodies[0]),
        "the step forced by prepareStep still carried thinking",
      );
      assert(counter.calls >= 1, "the forced tool was never executed");
      assert(bodies.length >= 2, "the turn did not continue after the tool");
      assert(
        !thinkingOn(bodies[1]),
        "thinking was switched on partway through the tool turn",
      );
    });

    for (const mode of ["generate", "stream"] as const) {
      await test(`${mode}: a forced step answered with two parallel tool calls keeps thinking off for the continuation`, async () => {
        fixture.parallelCalls = true;
        try {
          const counter = { calls: 0 };
          const bodies = await requestsFor(mode, {
            tools: weatherTools(counter),
            toolChoice: "required",
            maxSteps: 3,
          });
          assert(counter.calls >= 2, "both parallel tools did not run");
          assert(
            bodies.length >= 2,
            "the turn did not continue after the tools",
          );
          const results = (
            Array.isArray(bodies[1].messages) ? bodies[1].messages : []
          ).flatMap((message) =>
            contentBlocks(message).filter(
              (block) => block.type === "tool_result",
            ),
          );
          assert(
            results.length >= 2,
            "the continuation did not carry both tool results",
          );
          assert(
            !thinkingOn(bodies[1]),
            "thinking was switched on after a parallel tool call made without it",
          );
        } finally {
          fixture.parallelCalls = false;
        }
      });
    }

    section("a tool turn carried in from history");

    const stamp = new Date().toISOString();
    const toolTurnHistory = [
      {
        id: "u1",
        role: "user" as const,
        content: "What is the weather in Paris?",
        timestamp: stamp,
      },
      {
        id: "c1",
        role: "tool_call" as const,
        content: "",
        tool: TOOL_NAME,
        toolCallId: "toolu_history_1",
        args: { city: "Paris" },
        timestamp: stamp,
      },
      {
        id: "r1",
        role: "tool_result" as const,
        content: JSON.stringify({ city: "Paris", tempC: 22 }),
        tool: TOOL_NAME,
        toolCallId: "toolu_history_1",
        result: { success: true },
        timestamp: stamp,
      },
    ];

    /** One generate call on a session seeded with `history`. */
    const requestsWithHistory = async (
      sessionId: string,
      history: readonly Record<string, unknown>[],
    ): Promise<SeenBody[]> => {
      await historyNeurolink.setSessionMessages(
        sessionId,
        history as Parameters<typeof historyNeurolink.setSessionMessages>[1],
      );
      seen.splice(0);
      let failed = false;
      try {
        await historyNeurolink.generate({
          provider: "anthropic",
          model: MODEL,
          input: { text: "And tomorrow?" },
          maxTokens: MAX_TOKENS,
          disableInternalFallback: true,
          thinkingConfig: { enabled: true, budgetTokens: BUDGET },
          context: { sessionId },
          maxSteps: 1,
        } as GenerateOptions);
      } catch {
        failed = true;
      }
      assert(seen.length > 0, "no request reached the stand-in");
      const replayed = (
        Array.isArray(seen[0].messages) ? seen[0].messages : []
      ).some((message) =>
        contentBlocks(message).some((block) => block.type === "tool_use"),
      );
      assert(replayed, "the stored tool call was not replayed as tool_use");
      assert(!failed, "the call failed");
      return [...seen];
    };

    await test("an interrupted tool turn (tool results, then a new prompt) keeps thinking off", async () => {
      const bodies = await requestsWithHistory(
        `forced-tool-interrupted-${Date.now()}`,
        toolTurnHistory,
      );
      assert(
        !thinkingOn(bodies[0]),
        "thinking was sent while the final assistant message still calls a tool without thinking",
      );
    });

    await test("control: a completed tool turn in history leaves the next turn thinking", async () => {
      const bodies = await requestsWithHistory(
        `forced-tool-completed-${Date.now()}`,
        [
          ...toolTurnHistory,
          {
            id: "a1",
            role: "assistant",
            content: "It is 22°C in Paris.",
            timestamp: stamp,
          },
        ],
      );
      assert(
        JSON.stringify(bodies[0].thinking) ===
          JSON.stringify({ type: "enabled", budget_tokens: BUDGET }),
        "a new turn after a completed tool turn lost its thinking block",
      );
    });

    section("unforced requests keep thinking");

    for (const mode of ["generate", "stream"] as const) {
      await test(`${mode} with tools and no toolChoice keeps thinking`, async () => {
        const bodies = await requestsFor(mode, {
          tools: weatherTools({ calls: 0 }),
          maxSteps: 1,
        });
        assert(
          JSON.stringify(bodies[0].thinking) ===
            JSON.stringify({ type: "enabled", budget_tokens: BUDGET }),
          "an unforced request lost its thinking block",
        );
      });

      await test(`${mode} with toolChoice "none" keeps thinking`, async () => {
        const bodies = await requestsFor(mode, {
          tools: weatherTools({ calls: 0 }),
          toolChoice: "none",
          maxSteps: 1,
        });
        assert(
          thinkingOn(bodies[0]),
          'tool_choice "none" does not force tool use, but thinking was dropped',
        );
      });
    }

    section("budget_tokens fits inside max_tokens");

    for (const mode of ["generate", "stream"] as const) {
      await test(`${mode}: a budget at or above max_tokens is clamped to leave 1024 for the answer`, async () => {
        const bodies = await requestsFor(mode, {
          maxTokens: 4096,
          thinkingConfig: { enabled: true, budgetTokens: 8000 },
          maxSteps: 1,
        });
        assert(
          bodies[0].max_tokens === 4096,
          "max_tokens was not the caller's value",
        );
        assert(
          JSON.stringify(bodies[0].thinking) ===
            JSON.stringify({ type: "enabled", budget_tokens: 3072 }),
          "the thinking budget was not clamped below max_tokens",
        );
      });

      await test(`${mode}: no budget of at least 1024 fits, so thinking is omitted`, async () => {
        const bodies = await requestsFor(mode, {
          maxTokens: 1500,
          thinkingConfig: { enabled: true, budgetTokens: 8000 },
          maxSteps: 1,
        });
        assert(
          !("thinking" in bodies[0]),
          "a thinking budget that cannot fit was still sent",
        );
      });

      for (const [label, budgetTokens] of [
        ["Infinity", Number.POSITIVE_INFINITY],
        ["NaN", Number.NaN],
        ["a negative number", -1],
        ["a numeric string", "5000"],
      ] as const) {
        await test(`${mode}: a budget of ${label} is not sent`, async () => {
          const bodies = await requestsFor(mode, {
            thinkingConfig: { enabled: true, budgetTokens },
            maxSteps: 1,
          });
          assert(
            !("thinking" in bodies[0]),
            "an unusable thinking budget was sent",
          );
        });
      }

      await test(`${mode}: a fractional budget is rounded down to an integer`, async () => {
        const bodies = await requestsFor(mode, {
          thinkingConfig: { enabled: true, budgetTokens: 3000.7 },
          maxSteps: 1,
        });
        assert(
          JSON.stringify(bodies[0].thinking) ===
            JSON.stringify({ type: "enabled", budget_tokens: 3000 }),
          "a fractional thinking budget was not rounded down",
        );
      });
    }
  } finally {
    await neurolink.dispose().catch(() => undefined);
    await historyNeurolink.dispose().catch(() => undefined);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const key of TOUCHED_ENV_VARS) {
      const prior = snapshot[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  }
});
