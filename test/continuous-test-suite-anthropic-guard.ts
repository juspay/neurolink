#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Anthropic loop guard adapter
 *
 * The direct Anthropic loop (`providers/anthropic/client.ts`) grows its
 * `conversation` on every step: an assistant message carrying `tool_use`
 * blocks, then a user message carrying the matching `tool_result` blocks. It
 * had no in-turn context guard, so a long agentic run overflowed the window
 * mid-loop and lost every completed step.
 *
 * Granularity differs from the OpenAI-compatible shape: there each tool result
 * is its own message, here ONE user message carries every result for a step —
 * so the message is the batch unit.
 *
 * The reclaim POLICY is tested in continuous-test-suite-loop-guard-core.ts.
 * This suite covers the SHAPE MAPPING and the decision boundary.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-anthropic-guard.ts
 *      pnpm run test:anthropic-guard
 */

import {
  planAnthropicLoopReclaim,
  previewAnthropicToolResultText,
  isAnthropicToolResultMessage,
} from "../src/lib/context/anthropicLoopGuard.js";
import type { AnthropicGuardMessage } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Anthropic loop guard");

/**
 * NOTE: assertion messages must NEVER interpolate message content or tool
 * payloads — `defineSuite` downgrades a throw to SKIP when the text matches
 * `isExpectedProviderError()`, silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/** One agent step, in Anthropic block shape. */
function step(i: number, outputChars: number): AnthropicGuardMessage[] {
  return [
    {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: `toolu_${i}`,
          name: "read_file",
          input: { path: `/f${i}.ts` },
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: `toolu_${i}`,
          content: "x".repeat(outputChars),
        },
      ],
    },
  ];
}

const plan = (
  conversation: AnthropicGuardMessage[],
  observedPromptTokens?: number,
) =>
  planAnthropicLoopReclaim({
    conversation,
    availableInputTokens: 100_000,
    fixedOverheadTokens: 0,
    provider: "anthropic",
    ...(observedPromptTokens !== undefined ? { observedPromptTokens } : {}),
  });

await runSuite(async () => {
  section("A loop that fits must be left alone");

  await test("short conversation returns undefined", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "hello" },
      ...step(1, 200),
    ];
    assert(
      plan(conversation) === undefined,
      "guard proposed changes to a loop that fits",
    );
  });

  await test("text-only conversation returns undefined", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    assert(plan(conversation) === undefined, "guard acted on a text-only chat");
  });

  section("Block classification");

  await test("tool_result messages are recognised", async () => {
    const [callMsg, resultMsg] = step(1, 100);
    assert(
      isAnthropicToolResultMessage(resultMsg),
      "a tool_result message was not recognised",
    );
    assert(
      !isAnthropicToolResultMessage(callMsg),
      "a tool_use message was misread as a tool_result",
    );
  });

  await test("string content does not crash classification", async () => {
    assert(
      !isAnthropicToolResultMessage({ role: "user", content: "plain" }),
      "string content was misread as a tool_result",
    );
  });

  section("Reclaim decisions");

  await test("fires and never proposes the task entry", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "THE ORIGINAL TASK" },
    ];
    for (let i = 0; i < 60; i++) {
      conversation.push(...step(i, 30_000));
    }
    const result = plan(conversation);
    assert(result !== undefined, "guard did not fire on an over-budget loop");
    assert(!result!.drop.includes(0), "guard proposed dropping the task");
    assert(!result!.truncate.includes(0), "guard proposed editing the task");
  });

  await test("dropped indices always cover whole call/result pairs", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 300; i++) {
      conversation.push(...step(i, 1_200));
    }
    const result = plan(conversation);
    assert(result !== undefined, "guard did not fire");
    const dropped = new Set(result!.drop);
    const survivors = conversation.filter((_, i) => !dropped.has(i));

    // Every surviving tool_result must have a surviving tool_use before it.
    const declared = new Set<string>();
    let orphans = 0;
    for (const message of survivors) {
      if (!Array.isArray(message.content)) {
        continue;
      }
      for (const block of message.content) {
        if (block.type === "tool_use") {
          declared.add(String((block as { id?: unknown }).id));
        }
        if (
          block.type === "tool_result" &&
          !declared.has(
            String((block as { tool_use_id?: unknown }).tool_use_id),
          )
        ) {
          orphans++;
        }
      }
    }
    assert(orphans === 0, "a dropped batch left an orphaned tool_result block");
  });

  await test("small results force drops rather than stalling", async () => {
    // Results below the preview budget cannot shrink, so stage 2 must engage.
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 300; i++) {
      conversation.push(...step(i, 1_200));
    }
    const result = plan(conversation);
    assert(result !== undefined, "guard did not fire");
    assert(
      result!.drop.length > 0,
      "guard proposed no drops where truncation cannot help",
    );
  });

  section("Preview helper");

  await test("oversized text shrinks, small text is untouched", async () => {
    const small = "short output";
    assert(
      previewAnthropicToolResultText(small) === small,
      "small output was rewritten",
    );
    const large = "y".repeat(50_000);
    const preview = previewAnthropicToolResultText(large);
    assert(preview.length < large.length, "large output was not shrunk");
    assert(preview.length > 0, "preview collapsed to nothing");
  });

  section("Usage calibration");

  await test("a zero observed prompt count is ignored safely", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "hi" },
      ...step(1, 100),
    ];
    assert(
      plan(conversation, 0) === undefined,
      "zero observed tokens perturbed the decision",
    );
  });

  await test("a higher observed count makes the guard no less eager", async () => {
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 20; i++) {
      conversation.push(...step(i, 12_000));
    }
    const plain = plan(conversation);
    const calibrated = plan(conversation, 300_000);
    assert(
      plain === undefined || calibrated !== undefined,
      "calibration made the guard less eager than the raw estimate",
    );
  });
});
