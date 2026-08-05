#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — token accounting and history budget
 *
 * Two regressions locked down here:
 *
 * 1. `estimateMessageTokens` counted ONLY `message.content`. A `tool_call` is
 *    persisted with an empty `content` and its whole payload in `args`, so a
 *    39 KB Write call scored ~28 tokens against a real cost near 9,750 — the
 *    budget checker, compaction trigger and summarization threshold were all
 *    blind to the biggest source of growth in an agentic session.
 *
 * 2. The compactor was handed `availableInputTokens` (the WHOLE input budget)
 *    as its target while its stage gates measure history only. With a large
 *    tool set a request could sit far over budget and the compactor would
 *    report "nothing to do". `resolveHistoryBudget` derives the history's
 *    actual share.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-token-accounting.ts
 *      pnpm run test:token-accounting
 */

import {
  checkContextBudget,
  resolveHistoryBudget,
} from "../src/lib/context/budgetChecker.js";
import {
  estimateMessageTokens,
  estimateMessagesTokens,
} from "../src/lib/utils/tokenEstimation.js";
import type { ChatMessage } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Token accounting");

/**
 * NOTE: assertion messages must NEVER interpolate message content or tool
 * payloads — `defineSuite` downgrades a throw to SKIP when the text matches
 * `isExpectedProviderError()`, which would turn a real failure into a silent ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await runSuite(async () => {
  section("tool_call args must be counted");

  await test("large args on an empty-content tool_call are charged", async () => {
    const payload = "const x = 1;\n".repeat(3000); // ~39 KB
    const msg: ChatMessage = {
      id: "c1",
      role: "tool_call",
      content: "",
      tool: "Write",
      args: { file_path: "/a.ts", content: payload },
    };
    const estimated = estimateMessageTokens(msg);
    // ~4 chars/token, so a 39 KB payload must land in the thousands, not tens.
    assert(
      estimated > 5000,
      "tool_call args were not counted toward the token estimate",
    );
  });

  await test("args cost scales with payload size", async () => {
    const mk = (n: number): ChatMessage => ({
      id: `c${n}`,
      role: "tool_call",
      content: "",
      tool: "Write",
      args: { content: "x".repeat(n) },
    });
    const small = estimateMessageTokens(mk(1000));
    const large = estimateMessageTokens(mk(20000));
    assert(large > small * 5, "token estimate did not scale with args size");
  });

  await test("a text message is unaffected by the args change", async () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "hello world",
    };
    const estimated = estimateMessageTokens(msg);
    assert(estimated > 0 && estimated < 50, "plain text estimate is off");
  });

  await test("unserializable args do not throw", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const msg: ChatMessage = {
      id: "c1",
      role: "tool_call",
      content: "",
      tool: "X",
      args: circular,
    };
    let threw = false;
    try {
      estimateMessageTokens(msg);
    } catch {
      threw = true;
    }
    assert(!threw, "estimator threw on unserializable args");
  });

  await test("result.error is counted but result payload is not double-billed", async () => {
    const withError: ChatMessage = {
      id: "r1",
      role: "tool_result",
      content: "output body",
      tool: "X",
      result: { success: false, error: "E".repeat(4000) },
    };
    const withoutError: ChatMessage = {
      id: "r2",
      role: "tool_result",
      content: "output body",
      tool: "X",
      result: { success: true },
    };
    assert(
      estimateMessageTokens(withError) >
        estimateMessageTokens(withoutError) + 500,
      "result.error was not counted",
    );
  });

  await test("array totals include per-message args", async () => {
    const msgs: ChatMessage[] = [
      { id: "u1", role: "user", content: "hi" },
      {
        id: "c1",
        role: "tool_call",
        content: "",
        tool: "Write",
        args: { content: "y".repeat(20000) },
      },
    ];
    assert(
      estimateMessagesTokens(msgs) > 3000,
      "array total ignored tool_call args",
    );
  });

  section("history budget must exclude fixed overhead");

  await test("history budget is strictly less than available input", async () => {
    const budget = checkContextBudget({
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "S".repeat(4000),
      currentPrompt: "P".repeat(4000),
      conversationMessages: [{ role: "user", content: "hi" }],
      toolDefinitions: [{ name: "t", description: "D".repeat(4000) }],
    });
    const history = resolveHistoryBudget(budget);
    assert(
      history < budget.availableInputTokens,
      "history budget did not subtract fixed overhead",
    );
    assert(history > 0, "history budget collapsed to zero unexpectedly");
  });

  await test("a large tool set visibly shrinks the history budget", async () => {
    const base = {
      provider: "openai" as const,
      model: "gpt-4o",
      systemPrompt: "S",
      currentPrompt: "P",
      conversationMessages: [{ role: "user", content: "hi" }],
    };
    const few = resolveHistoryBudget(
      checkContextBudget({
        ...base,
        toolDefinitions: [{ name: "t", description: "d" }],
      }),
    );
    const many = resolveHistoryBudget(
      checkContextBudget({
        ...base,
        toolDefinitions: Array.from({ length: 150 }, (_, i) => ({
          name: `tool_${i}`,
          description: "D".repeat(400),
        })),
      }),
    );
    assert(
      many < few,
      "a large tool set did not reduce the derived history budget",
    );
  });

  await test("overhead exceeding the window yields a zero history budget", async () => {
    const budget = checkContextBudget({
      provider: "openai",
      model: "gpt-4o",
      maxTokens: 100,
      systemPrompt: "S".repeat(4_000_000),
      currentPrompt: "P",
      conversationMessages: [{ role: "user", content: "hi" }],
    });
    assert(
      resolveHistoryBudget(budget) === 0,
      "history budget went negative instead of clamping to zero",
    );
  });

  await test("history budget stays under the true remainder", async () => {
    const budget = checkContextBudget({
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: "S".repeat(2000),
      currentPrompt: "P".repeat(2000),
      conversationMessages: [{ role: "user", content: "hi" }],
      toolDefinitions: [{ name: "t", description: "d" }],
    });
    const overhead =
      (budget.breakdown?.systemPrompt ?? 0) +
      (budget.breakdown?.currentPrompt ?? 0) +
      (budget.breakdown?.toolDefinitions ?? 0) +
      (budget.breakdown?.fileAttachments ?? 0);
    assert(
      resolveHistoryBudget(budget) <= budget.availableInputTokens - overhead,
      "history budget exceeded the space actually left for history",
    );
  });
});
