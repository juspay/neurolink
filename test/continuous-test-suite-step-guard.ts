#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — agent-loop step budget guard hysteresis
 *
 * The regression: `dropOldestToolExchanges` reclaimed only back to the firing
 * threshold. The very next step appends an assistant turn plus its tool
 * results, immediately re-crosses, and the guard rewrites the OLDEST messages
 * again — so a long agentic run mutated its own prompt prefix on every single
 * step. Each mutation invalidates the Anthropic `cache_control` prefix from the
 * edit point onward, converting a ~0.1x cached read into full-price input.
 *
 * The fix reclaims down to a LOW-WATER mark, so one deeper compaction buys many
 * quiet steps. This suite asserts the guard fires rarely, not constantly.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-step-guard.ts
 *      pnpm run test:step-guard
 */

import { createStepBudgetGuard } from "../src/lib/context/stepBudgetGuard.js";
import { getAvailableInputTokens } from "../src/lib/constants/contextWindows.js";
import type { ModelMessage } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Step budget guard hysteresis");

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

const PROVIDER = "openai";
const MODEL = "gpt-4o";

/** One tool exchange: an assistant tool-call message plus its tool result. */
function toolExchange(index: number, outputChars: number): ModelMessage[] {
  return [
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: `t${index}`,
          toolName: "read_file",
          input: { path: `/f${index}.ts` },
        },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: `t${index}`,
          toolName: "read_file",
          output: { type: "text", value: "x".repeat(outputChars) },
        },
      ],
    },
  ] as unknown as ModelMessage[];
}

await runSuite(async () => {
  section("Guard stays quiet below the threshold");

  await test("small conversation is never modified", async () => {
    const guard = createStepBudgetGuard({
      provider: PROVIDER,
      model: MODEL,
    });
    const messages = [
      { role: "user", content: "hi" },
      ...toolExchange(1, 100),
    ] as ModelMessage[];
    assert(
      guard(messages) === undefined,
      "guard modified a conversation that fits comfortably",
    );
  });

  section("Guard reclaims real headroom when it fires");

  await test("a firing reclaims well below the threshold", async () => {
    const available = getAvailableInputTokens(PROVIDER, MODEL);
    // Build a conversation comfortably over the ~85% firing threshold.
    const messages: ModelMessage[] = [
      { role: "user", content: "start" } as ModelMessage,
    ];
    for (let i = 0; i < 60; i++) {
      messages.push(...toolExchange(i, 8000));
    }
    const guard = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    const out = guard(messages);
    assert(out !== undefined, "guard did not fire on an over-budget step");

    // Re-running the guard on its OWN output must be a no-op: if the reclaim
    // only reached the threshold, the next step would immediately re-fire.
    const guard2 = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    const second = guard2(out as ModelMessage[]);
    assert(
      second === undefined,
      "guard output still sits above the firing threshold",
    );

    // And the reclaim must be substantial, not a token under the line.
    const roughTokens = JSON.stringify(out).length / 4;
    assert(
      roughTokens < available * 0.8,
      "reclaim left the conversation nearly at the threshold",
    );
  });

  await test("a low threshold still leaves a reclaim gap", async () => {
    // `thresholdRatio` is caller-supplied. At or below the low-water ratio, a
    // purely window-relative target lands ON or ABOVE the line the guard just
    // crossed: stage 2 finds nothing to drop while stage 1 keeps rewriting the
    // oldest messages, so the guard fires every step — the pathology it exists
    // to remove. Must be exercised in the stage-2-dominant regime; with large
    // outputs stage 1 alone overshoots the line and hides the defect.
    const smallExchange = (i: number): ModelMessage[] =>
      [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: `l${i}`,
              toolName: "grep",
              input: { q: `q${i}` },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: `l${i}`,
              toolName: "grep",
              output: { type: "text", value: "z".repeat(1800) },
            },
          ],
        },
      ] as unknown as ModelMessage[];

    const config = {
      provider: PROVIDER,
      model: MODEL,
      thresholdRatio: 0.5, // below CONTEXT_GUARD_LOW_WATER_RATIO
    };
    const guard = createStepBudgetGuard(config);
    let messages: ModelMessage[] = [
      { role: "user", content: "start" } as ModelMessage,
    ];
    for (let i = 0; i < 260; i++) {
      messages.push(...smallExchange(i));
    }

    let firings = 0;
    const STEPS = 20;
    for (let step = 0; step < STEPS; step++) {
      messages.push(...smallExchange(1000 + step));
      const out = guard(messages);
      if (out !== undefined) {
        firings++;
        messages = out as ModelMessage[];
      }
    }
    assert(
      firings <= STEPS / 4,
      `guard mutated the prefix on ${firings} of ${STEPS} steps at a 0.5 threshold`,
    );
  });

  section("Hysteresis: firings must be rare across a long run");

  await test("guard fires on a small minority of steps", async () => {
    const guard = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    let messages: ModelMessage[] = [
      { role: "user", content: "start" } as ModelMessage,
    ];
    for (let i = 0; i < 40; i++) {
      messages.push(...toolExchange(i, 8000));
    }

    let firings = 0;
    const STEPS = 40;
    for (let step = 0; step < STEPS; step++) {
      // Each step appends one more exchange, as a real agent loop would.
      messages.push(...toolExchange(1000 + step, 8000));
      const out = guard(messages);
      if (out !== undefined) {
        firings++;
        messages = out as ModelMessage[];
      }
    }

    // Pre-fix behaviour was a firing on essentially every step once over the
    // line. With a low-water reclaim it must be a small fraction.
    assert(
      firings < STEPS / 2,
      `guard mutated the prefix on ${firings} of ${STEPS} steps`,
    );
  });

  await test("stage-2-dominant run does not fire every step", async () => {
    // The regime the low-water mark actually exists for. Tool outputs BELOW
    // the stage-1 preview budget cannot be shrunk by truncation, so dropping
    // exchanges is the only lever. Reclaiming merely back to the threshold
    // made this fire on 40 of 40 steps — a full prompt-cache invalidation per
    // step. This is a long agentic run doing many small greps/reads.
    const smallExchange = (i: number): ModelMessage[] =>
      [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: `s${i}`,
              toolName: "grep",
              input: { q: `q${i}` },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: `s${i}`,
              toolName: "grep",
              output: { type: "text", value: "y".repeat(1800) },
            },
          ],
        },
      ] as unknown as ModelMessage[];

    const guard = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    let messages: ModelMessage[] = [
      { role: "user", content: "start" } as ModelMessage,
    ];
    for (let i = 0; i < 260; i++) {
      messages.push(...smallExchange(i));
    }

    let firings = 0;
    const STEPS = 40;
    for (let step = 0; step < STEPS; step++) {
      messages.push(...smallExchange(1000 + step));
      const out = guard(messages);
      if (out !== undefined) {
        firings++;
        messages = out as ModelMessage[];
      }
    }
    assert(
      firings <= STEPS / 4,
      `guard mutated the prefix on ${firings} of ${STEPS} steps in the stage-2 regime`,
    );
  });

  await test("protected tail is never modified", async () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "start" } as ModelMessage,
    ];
    for (let i = 0; i < 60; i++) {
      messages.push(...toolExchange(i, 8000));
    }
    const tailBefore = JSON.stringify(messages.slice(-4));
    const guard = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    const out = guard(messages);
    assert(out !== undefined, "guard did not fire on an over-budget step");
    assert(
      JSON.stringify((out as ModelMessage[]).slice(-4)) === tailBefore,
      "guard modified the protected tail messages",
    );
  });

  await test("first user message survives compaction", async () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "THE ORIGINAL TASK" } as ModelMessage,
    ];
    for (let i = 0; i < 60; i++) {
      messages.push(...toolExchange(i, 8000));
    }
    const guard = createStepBudgetGuard({ provider: PROVIDER, model: MODEL });
    const out = guard(messages) as ModelMessage[];
    assert(out !== undefined, "guard did not fire on an over-budget step");
    assert(
      JSON.stringify(out[0]) === JSON.stringify(messages[0]),
      "guard modified the first user message",
    );
  });
});
