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

  await test("a count for the current payload fires a guard the estimate alone would not", async () => {
    // The other legitimate pairing: a caller that plans only when a real-token
    // guard trips has no estimate for an earlier request, but its trigger is
    // already a projection of the payload about to be sent. It says so with
    // `observedDescribesCurrentPayload`, and the denominator becomes this
    // module's estimate of the current history — the same payload twice.
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 20; i++) {
      conversation.push(...step(i, 12_000));
    }

    // Premise: uncalibrated this history is under the line, so anything that
    // fires below can only be the correction.
    assert(
      plan(conversation) === undefined,
      "fixture fires uncalibrated, so it cannot demonstrate the correction",
    );

    // A count with NEITHER pairing must change nothing — there is no estimate
    // to divide it by, and guessing one is what pins calibration at 1.
    assert(
      plan(conversation, 300_000) === undefined,
      "an unpaired observed count perturbed the decision",
    );

    const calibrated = planAnthropicLoopReclaim({
      conversation,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: "anthropic",
      observedPromptTokens: 90_000,
      observedDescribesCurrentPayload: true,
    });
    assert(
      calibrated !== undefined,
      "a real count for the current payload did not tighten the threshold",
    );
    assert(
      calibrated!.truncate.length > 0 || calibrated!.drop.length > 0,
      "the calibrated plan reclaims nothing",
    );

    // Monotone in the ratio: a bigger under-count must reclaim more.
    const stronger = planAnthropicLoopReclaim({
      conversation,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: "anthropic",
      observedPromptTokens: 300_000,
      observedDescribesCurrentPayload: true,
    })!;
    assert(
      stronger.projectedTokens < calibrated!.projectedTokens,
      "a larger under-count did not reclaim more",
    );
  });

  await test("calibration is measured against the matching request", async () => {
    // Both halves of the ratio must describe the same request. Measuring the
    // reported count against an estimate of the CURRENT conversation — grown
    // by an assistant tool_use plus its tool_result — always lands below 1,
    // and the `max(1, …)` floor then pins calibration at 1 for the whole run.
    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 30; i++) {
      conversation.push(...step(i, 5000));
    }
    assert(
      plan(conversation) === undefined,
      "setup conversation already fires without calibration",
    );
    const fired = planAnthropicLoopReclaim({
      conversation,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: "anthropic",
      observedPromptTokens: 30_000,
      previousSentEstimate: 10_000,
    });
    assert(
      fired !== undefined,
      "guard ignored a 3x under-estimate reported by the provider",
    );
  });

  await test("the sent estimate is reported on both paths", async () => {
    const small: AnthropicGuardMessage[] = [
      { role: "user", content: "hi" },
      ...step(1, 100),
    ];
    let quiet: number | undefined;
    const unchanged = planAnthropicLoopReclaim({
      conversation: small,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: "anthropic",
      onSentEstimate: (t) => {
        quiet = t;
      },
    });
    assert(unchanged === undefined, "guard fired on a loop that fits");
    assert(
      quiet !== undefined && quiet > 0,
      "guard did not report the sent estimate on the quiet path",
    );

    const big: AnthropicGuardMessage[] = [{ role: "user", content: "start" }];
    for (let i = 0; i < 40; i++) {
      big.push(...step(i, 12_000));
    }
    let loud: number | undefined;
    const reclaimed = planAnthropicLoopReclaim({
      conversation: big,
      availableInputTokens: 100_000,
      fixedOverheadTokens: 0,
      provider: "anthropic",
      onSentEstimate: (t) => {
        loud = t;
      },
    });
    assert(reclaimed !== undefined, "guard did not fire on an oversized loop");
    assert(
      loud !== undefined && loud > 0,
      "guard did not report the sent estimate after reclaiming",
    );
  });

  section("Preview eligibility is measured in bytes");

  await test("multibyte tool_result is previewed, not left whole", async () => {
    // 1000 CJK characters are 3000 UTF-8 bytes but only 1000 code units, so a
    // budget compared against String.length judged them small enough to skip.
    const text = "漢".repeat(1000);
    assert(
      Buffer.byteLength(text, "utf-8") > 2048 && text.length < 2048,
      "test setup no longer exercises the multibyte case",
    );
    assert(
      previewAnthropicToolResultText(text).length < text.length,
      "multibyte tool output was not shrunk by the preview helper",
    );

    const conversation: AnthropicGuardMessage[] = [
      { role: "user", content: "start" },
    ];
    for (let i = 0; i < 400; i++) {
      conversation.push(
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
            { type: "tool_result", tool_use_id: `toolu_${i}`, content: text },
          ],
        },
      );
    }
    const reclaim = plan(conversation);
    assert(reclaim !== undefined, "guard did not fire on an oversized loop");
    assert(
      (reclaim as { truncate: number[] }).truncate.length > 0,
      "no multibyte tool_result was marked for preview — the byte budget was compared against string length",
    );
  });
});
