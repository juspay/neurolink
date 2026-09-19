/**
 * The tool-free reformat pass must not be charged for tools it does not send.
 *
 * `runLoop(conv, format, withTools=false)` omits `tools` from the request so
 * `response_format` is legal again on a vendor that refuses the two together.
 * The context guard's fixed overhead has to follow that: counting the tool
 * schemas anyway inflates the projected prompt, and because that number feeds
 * `planLoopGuardReclaim`, a large tool schema alone can push the reformat pass
 * over the reclaim threshold and delete older tool exchanges from a request
 * that would have fit.
 *
 * End-to-end through the public `generate()` against a local scripted endpoint.
 * MCP and built-in tools are switched off so the only tool schema in play is
 * this suite's own — that keeps the overhead a controlled quantity rather than
 * whatever the host machine happens to register, and keeps the run fast.
 *
 * Sizing is computed, not guessed. With a 68,000-token input budget the guard
 * fires above floor(68000 * 0.85) = 57,800:
 *
 *   five exchanges + the final answer  ~47,900 tokens of messages
 *   this suite's tool schema           ~12,000 tokens of overhead
 *
 * so the messages alone stay under the threshold while messages + tools cross
 * it. The tool loop itself is deliberately left under the threshold, so the
 * reformat pass is the only place the guard can act.
 *
 * Run: npx tsx test/continuous-test-suite-toolfree-guard-overhead.ts
 *      pnpm run test:toolfree-guard-overhead
 */

import assert from "node:assert/strict";
import { z } from "zod";
import { NeuroLink, tool } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { startScriptedChatServer } from "./helpers/mockChatServer.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Tool-free guard overhead", {
  offline: true,
});

/** Inserted by the guard in place of whatever it dropped. */
const RECLAIM_MARKER = "Earlier tool exchanges were removed";

const TOUCHED_ENV = [
  "OPENAI_COMPATIBLE_BASE_URL",
  "OPENAI_COMPATIBLE_API_KEY",
  "NEUROLINK_SKIP_MCP",
  "NEUROLINK_DISABLE_BUILTIN_TOOLS",
] as const;

type RunResult = {
  /** Every outbound body, parsed. */
  readonly requests: ReadonlyArray<Record<string, unknown>>;
  /** The tool-free reformat request: no `tools`, carries `response_format`. */
  readonly reformat: Record<string, unknown> | undefined;
};

async function runGenerate(options: {
  readonly steps: number;
  readonly padChars: number;
  readonly answerChars: number;
  readonly descChars: number;
}): Promise<RunResult> {
  const pad = "x".repeat(options.padChars);
  const toolCall = (i: number) => ({
    id: `c${i}`,
    object: "chat.completion",
    created: 1,
    model: "test-model",
    choices: [
      {
        index: 0,
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: `call_${i}`,
              type: "function",
              function: {
                name: "lookup",
                arguments: JSON.stringify({ i, padding: pad }),
              },
            },
          ],
        },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
  // Prose, so the schema cannot be satisfied from this turn and the tool-free
  // reformat pass is forced to run.
  const prose = {
    id: "final",
    object: "chat.completion",
    created: 1,
    model: "test-model",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: "P".repeat(options.answerChars),
        },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
  const asJson = {
    id: "reformat",
    object: "chat.completion",
    created: 1,
    model: "test-model",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: { role: "assistant", content: '{"answer":"ok"}' },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };

  const server = await startScriptedChatServer([
    ...Array.from({ length: options.steps }, (_, i) => toolCall(i)),
    prose,
    asJson,
    asJson,
    asJson,
  ]);
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV) {
    saved[key] = process.env[key];
  }
  try {
    process.env.OPENAI_COMPATIBLE_BASE_URL = server.baseURL.replace(
      /\/v1$/,
      "",
    );
    process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";
    process.env.NEUROLINK_SKIP_MCP = "true";
    process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";

    const sdk = new NeuroLink();
    await sdk.generate({
      input: { text: "TASK" },
      provider: "openai-compatible",
      model: "test-model",
      maxSteps: options.steps + 4,
      // Fixes the input budget at 68,000 tokens, so the threshold is 57,800.
      maxTokens: 60_000,
      disableInternalFallback: true,
      schema: z.object({ answer: z.string() }),
      tools: {
        lookup: tool({
          description: "L".repeat(options.descChars),
          inputSchema: z.object({
            i: z.number(),
            padding: z.string().optional(),
          }),
          execute: async ({ i }: { i: number }) => `RESULT_${i}`,
        }),
      },
    } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
  } finally {
    for (const key of TOUCHED_ENV) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    await server.close();
  }

  const requests = server
    .getAllRequestBodies()
    .map((body) => JSON.parse(body) as Record<string, unknown>);
  const reformat = requests.find(
    (body) => body.tools === undefined && body.response_format !== undefined,
  );
  return { requests, reformat };
}

const messagesOf = (body: Record<string, unknown>) =>
  (body.messages ?? []) as ReadonlyArray<{ role: string }>;

const hasMarker = (body: Record<string, unknown>) =>
  JSON.stringify(body.messages ?? []).includes(RECLAIM_MARKER);

await test("the tool-free reformat pass is not charged for the tools it omits", async () => {
  const { requests, reformat } = await runGenerate({
    steps: 5,
    padChars: 33_000,
    answerChars: 16_000,
    descChars: 40_000,
  });

  // The reformat pass must have happened at all, or the rest is vacuous.
  assert.ok(
    reformat !== undefined,
    "no tool-free reformat request was sent — the fixture no longer reaches the branch under test",
  );

  // Precondition: the tool loop itself stayed under the threshold, so the
  // reformat pass is the only place reclaim could have acted. Without this a
  // loop-time reclaim would be mistaken for the bug.
  const loopRequests = requests.filter((body) => body.tools !== undefined);
  assert.ok(
    loopRequests.length > 0,
    "no tool-bearing requests were sent — fixture no longer drives a tool loop",
  );
  assert.ok(
    loopRequests.every((body) => !hasMarker(body)),
    "a tool-bearing request was already reclaimed, so this fixture cannot isolate the tool-free pass",
  );

  // The actual regression: charging the tool-free pass for the tool schemas
  // crossed the threshold on its own and deleted older exchanges.
  assert.ok(
    !hasMarker(reformat),
    "the tool-free reformat request had earlier tool exchanges reclaimed, so its overhead still counts tools it does not send",
  );
  const toolMessages = messagesOf(reformat).filter(
    (message) => message.role === "tool",
  ).length;
  assert.equal(
    toolMessages,
    5,
    "the tool-free reformat request lost tool exchanges it should have carried",
  );
});

await test("control: a genuinely oversized conversation still reclaims on the reformat pass", async () => {
  // Same shape, more exchanges: the messages alone now exceed the threshold,
  // so reclaim must still fire. Without this case the assertions above would
  // also pass against a guard that had simply stopped working.
  const { reformat } = await runGenerate({
    steps: 9,
    padChars: 33_000,
    answerChars: 16_000,
    descChars: 40_000,
  });
  assert.ok(
    reformat !== undefined,
    "no tool-free reformat request was sent in the control case",
  );
  assert.ok(
    hasMarker(reformat),
    "an over-threshold conversation was not reclaimed, so the guard is not acting at all and the primary assertion proves nothing",
  );
});

await runSuite();
