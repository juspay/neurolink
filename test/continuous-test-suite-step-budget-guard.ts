#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Per-Step Context Budget Guard (AI-SDK tool loop)
 *
 * The compact-and-continue counterpart of the googleVertex native loops'
 * createContextGuard. Given a step's ModelMessage[] it must (1) no-op under
 * threshold, (2) truncate OLD tool outputs to previews, (3) drop oldest
 * complete tool exchanges while preserving the task message, call/result
 * pairing and the protected tail, and (4) never leave the conversation
 * structurally invalid.
 *
 * Migrated from test/stepBudgetGuard.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-step-budget-guard.ts
 */

import type { ModelMessage } from "ai";
import {
  createStepBudgetGuard,
  estimateStepMessagesTokens,
  estimateFixedOverheadTokens,
} from "../src/lib/context/stepBudgetGuard.js";
import {
  registerRuntimeContextWindow,
  clearRuntimeContextWindows,
} from "../src/lib/constants/contextWindows.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Step Budget Guard");

const assertDeepEqual = (a: unknown, b: unknown, msg: string): void =>
  assertEqual(JSON.stringify(a), JSON.stringify(b), msg);

const user = (text: string): ModelMessage => ({
  role: "user",
  content: [{ type: "text", text }],
});

const assistantToolCall = (id: string): ModelMessage =>
  ({
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: id,
        toolName: "search",
        input: { q: id },
      },
    ],
  }) as ModelMessage;

const toolResult = (id: string, payload: string): ModelMessage =>
  ({
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: id,
        toolName: "search",
        output: { type: "text", value: payload },
      },
    ],
  }) as ModelMessage;

const assistantText = (text: string): ModelMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
});

/** A conversation: task + N tool exchanges with `payloadBytes` outputs each. */
const conversation = (exchanges: number, payloadBytes: number) => {
  const messages: ModelMessage[] = [user("Review this pull request.")];
  for (let i = 0; i < exchanges; i++) {
    messages.push(assistantToolCall(`call-${i}`));
    messages.push(toolResult(`call-${i}`, "x".repeat(payloadBytes)));
  }
  return messages;
};

const hasElisionNote = (m: ModelMessage): boolean =>
  m.role === "user" &&
  Array.isArray(m.content) &&
  JSON.stringify(m.content).includes("context truncated");

// ---------------------------------------------------------------------------
// Estimators
// ---------------------------------------------------------------------------

await test("estimateStepMessagesTokens scales with content size and survives tool parts", () => {
  const small = estimateStepMessagesTokens(conversation(1, 100));
  const large = estimateStepMessagesTokens(conversation(1, 100_000));
  assert(
    large > small,
    `a 1000× payload must estimate higher (${small} → ${large})`,
  );
});

await test("estimateFixedOverheadTokens counts the system prompt and tool definitions", () => {
  assertEqual(
    estimateFixedOverheadTokens(undefined, undefined),
    0,
    "nothing configured means no overhead",
  );
  assert(
    estimateFixedOverheadTokens("You are a reviewer.", {
      search: { description: "search the code", inputSchema: {} },
    }) > 0,
    "a system prompt plus tool definitions must cost something",
  );
});

// ---------------------------------------------------------------------------
// createStepBudgetGuard
// ---------------------------------------------------------------------------

await test("no-ops (returns undefined) when the step fits the budget", () => {
  // litellm's static default window is 128K — a tiny conversation fits.
  const guard = createStepBudgetGuard({
    provider: "litellm",
    model: "glm-private",
    maxTokens: 4_000,
  });
  assertEqual(
    guard(conversation(2, 200)),
    undefined,
    "an under-budget step must be left completely alone",
  );
});

await test("truncates OLD tool outputs to previews and leaves the protected tail intact", () => {
  const guard = createStepBudgetGuard({
    provider: "litellm",
    model: "glm-private",
    maxTokens: 4_000,
  });
  // 10 exchanges × ~80KB ≈ far beyond the ~105K available input.
  const messages = conversation(10, 80_000);
  const result = guard(messages);

  assert(result !== undefined, "an over-budget step must be compacted");
  assertDeepEqual(
    result![0],
    messages[0],
    "the task message must survive first",
  );

  const lastTool = result![result!.length - 1] as unknown as {
    content: Array<{ output: { value: string } }>;
  };
  assertEqual(
    lastTool.content[0].output.value.length,
    80_000,
    "the protected tail must be untouched",
  );
  assert(
    estimateStepMessagesTokens(result!) < estimateStepMessagesTokens(messages),
    "compaction must actually reduce the projected request",
  );
});

await test("drops oldest complete exchanges when previews aren't enough, leaving an elision note", () => {
  // A tiny window forces stage 2: lm-studio's static default is 8K.
  const guard = createStepBudgetGuard({
    provider: "lm-studio",
    model: "local-model",
    maxTokens: 1_000,
  });
  const messages = conversation(12, 4_000);
  const result = guard(messages);

  assert(result !== undefined, "an over-budget step must be compacted");
  assertDeepEqual(result![0], messages[0], "the task message must survive");
  assert(
    result!.some(hasElisionNote),
    "the model must be told that history was removed",
  );

  // Pairing integrity: every remaining tool-result's id must have a preceding
  // assistant tool-call with the same id, or the conversation is invalid.
  const callIds = new Set<string>();
  for (const message of result!) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const part of message.content as Array<{
      type?: string;
      toolCallId?: string;
    }>) {
      if (part.type === "tool-call" && part.toolCallId) {
        callIds.add(part.toolCallId);
      }
      if (part.type === "tool-result" && part.toolCallId) {
        assert(
          callIds.has(part.toolCallId),
          `orphaned tool-result ${part.toolCallId}: its call was dropped without it`,
        );
      }
    }
  }

  assert(
    result!.length < messages.length,
    "stage 2 must materially shorten the conversation",
  );
});

await test("previews the tool output VALUE for text results, not the wrapper JSON", () => {
  const guard = createStepBudgetGuard({
    provider: "litellm",
    model: "glm-private",
    maxTokens: 4_000,
  });
  const marker = "REAL_PAYLOAD_HEAD ";
  // Sizing: 'old' dominates the estimate (~100K+ tokens against litellm's 128K
  // default, over the ~105K threshold), so stage-1 truncation of 'old' alone
  // resolves the overage and stage 2 never drops the exchange asserted on.
  // The later exchanges keep 'old' outside the protected tail.
  const messages: ModelMessage[] = [
    user("Task"),
    assistantToolCall("old"),
    toolResult("old", marker + "y".repeat(400_000)),
    assistantToolCall("mid"),
    toolResult("mid", "z".repeat(60_000)),
    assistantToolCall("new"),
    toolResult("new", "w".repeat(60_000)),
  ];
  const compacted = guard(messages);
  assert(compacted !== undefined, "this step must be compacted");

  const oldResult = compacted!.find(
    (m) =>
      m.role === "tool" &&
      Array.isArray(m.content) &&
      (m.content[0] as { toolCallId?: string }).toolCallId === "old",
  ) as unknown as { content: Array<{ output: { value: string } }> };
  const previewText = oldResult.content[0].output.value;

  assert(
    previewText.includes(marker),
    "the preview must carry the real payload head",
  );
  assert(
    !previewText.includes('{"type":"text"'),
    "the preview must not be the escaped wrapper serialization",
  );
});

await test("re-resolves overhead per invocation via getFixedOverheadTokens", () => {
  let overhead = 0;
  const guard = createStepBudgetGuard({
    provider: "litellm",
    model: "glm-private",
    maxTokens: 4_000,
    getFixedOverheadTokens: () => overhead,
  });
  const messages = conversation(6, 10_000);

  assertEqual(guard(messages), undefined, "a small tool set fits");

  // Mid-loop hydration adds many tool definitions: the same messages must now
  // compact, because the dynamic overhead is re-read rather than frozen.
  overhead = 1_000_000;
  assert(
    guard(messages) !== undefined,
    "overhead growth mid-loop must be picked up",
  );
});

await test("includes fixedOverheadTokens (system + tools) in the trigger decision", () => {
  const base = { provider: "litellm", model: "glm-private", maxTokens: 4_000 };
  const messages = conversation(6, 10_000);

  assertEqual(
    createStepBudgetGuard(base)(messages),
    undefined,
    "the messages alone fit",
  );
  assert(
    createStepBudgetGuard({ ...base, fixedOverheadTokens: 1_000_000 })(
      messages,
    ) !== undefined,
    "overhead alone must be able to push a step over the threshold",
  );
});

await test("places the elision note BEFORE the protected tail, even when every droppable exchange goes", () => {
  const guard = createStepBudgetGuard({
    provider: "lm-studio",
    model: "local-model",
    maxTokens: 1_000,
  });
  // Payloads large enough that stage 2 must drop every droppable exchange.
  const result = guard(conversation(10, 60_000));
  assert(result !== undefined, "this step must be compacted");

  const noteIndex = result!.findIndex(hasElisionNote);
  assert(noteIndex >= 0, "an elision note must be present");
  assert(
    noteIndex < result!.length - 1,
    "the note must precede the context it refers to, never trail the protected tail",
  );
});

await test("never drops a trailing exchange that bleeds into the protected tail", () => {
  const guard = createStepBudgetGuard({
    provider: "lm-studio",
    model: "local-model",
    maxTokens: 1_000,
  });
  // One giant exchange, entirely inside the protected tail.
  const messages: ModelMessage[] = [
    user("Task"),
    assistantText("thinking"),
    assistantToolCall("only"),
    toolResult("only", "x".repeat(50_000)),
  ];
  const compacted = guard(messages);

  // Either nothing changes, or nothing structural does.
  if (compacted) {
    assertEqual(
      compacted.length,
      messages.length,
      "no message inside the protected tail may be dropped",
    );
    const lastTool = compacted[compacted.length - 1] as unknown as {
      content: Array<{ output: { value: string } }>;
    };
    assertEqual(
      lastTool.content[0].output.value.length,
      50_000,
      "the protected tail's payload must not be truncated either",
    );
  }
});

// ---------------------------------------------------------------------------
// Dynamic budget + usage calibration
// ---------------------------------------------------------------------------

await test("re-resolves the available budget on every invocation (mid-loop discovery)", () => {
  clearRuntimeContextWindows();
  try {
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "guard-discovery-model",
      maxTokens: 4_000,
    });
    // ~115K estimated tokens: over litellm's static-default threshold
    // (0.85 × (128K − 4K) ≈ 105K), so the guard compacts…
    const messages = conversation(10, 44_000);
    assert(
      guard(messages) !== undefined,
      "over the static default, it compacts",
    );

    // …but the SAME guard must no-op once /model/info discovery registers the
    // real 1M window mid-loop. The budget is re-resolved per invocation, not
    // frozen at loop start.
    registerRuntimeContextWindow("litellm", "guard-discovery-model", 1_000_000);
    assertEqual(
      guard(messages),
      undefined,
      "a window discovered mid-loop must take effect immediately",
    );
  } finally {
    clearRuntimeContextWindows();
  }
});

await test("usage feedback tightens the threshold when the provider reports more than estimated", () => {
  clearRuntimeContextWindows();
  try {
    const guard = createStepBudgetGuard({
      provider: "litellm",
      model: "guard-calibration-model",
      maxTokens: 4_000,
    });
    // ~63K estimated tokens: comfortably under the ~105K threshold.
    const messages = conversation(6, 40_000);
    assertEqual(guard(messages), undefined, "under threshold, it no-ops");

    // The provider reports the previous step's REAL prompt at 2× the guard's
    // estimate (dense diff content): calibration halves the effective threshold
    // and the same conversation now compacts.
    const estimate = estimateStepMessagesTokens(messages);
    assert(
      guard(messages, estimate * 2) !== undefined,
      "a 2× under-estimate must tighten the threshold",
    );
  } finally {
    clearRuntimeContextWindows();
  }
});

await runSuite();
