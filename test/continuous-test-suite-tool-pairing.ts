#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — tool_call/tool_result pairing integrity
 *
 * Regression cover for the batch-aware repair in `context/toolPairRepair.ts`.
 *
 * The bug this locks down: a single agent step with PARALLEL tool calls is
 * persisted as every `tool_call` followed by every `tool_result` (see
 * flushPendingToolData). The previous adjacency-based repair saw
 * `tool_call` followed by `tool_call`, declared the first an orphan, and
 * injected a "[Tool result unavailable]" placeholder over a result that was
 * present two entries later — turning 2 calls into 3 results on healthy input.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-tool-pairing.ts
 *      pnpm run test:tool-pairing
 */

import {
  repairToolPairs,
  snapSplitToBatchBoundary,
} from "../src/lib/context/toolPairRepair.js";
import type { ChatMessage } from "../src/lib/types/index.js";
import { SummarizationEngine } from "../src/lib/context/summarizationEngine.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Tool pairing integrity");

/**
 * Assertion helper.
 *
 * NOTE: messages must NEVER interpolate message content / tool payloads.
 * `defineSuite` classifies a thrown error as SKIP when the text matches
 * `isExpectedProviderError()`, so quoting a payload that happens to contain
 * provider-ish words silently downgrades a real failure to ⊘ and CI stays
 * green. Describe the discrepancy structurally instead.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const call = (id: string, tool: string, toolCallId?: string): ChatMessage => ({
  id,
  role: "tool_call",
  content: "",
  tool,
  ...(toolCallId ? { toolCallId } : {}),
});

const result = (
  id: string,
  tool: string,
  toolCallId?: string,
  content = "ok",
): ChatMessage => ({
  id,
  role: "tool_result",
  content,
  tool,
  ...(toolCallId ? { toolCallId } : {}),
});

const text = (id: string, role: "user" | "assistant"): ChatMessage => ({
  id,
  role,
  content: "some text",
});

/** Count of each tool role, used for the balance invariant. */
function counts(messages: ChatMessage[]): { calls: number; results: number } {
  return {
    calls: messages.filter((m) => m.role === "tool_call").length,
    results: messages.filter((m) => m.role === "tool_result").length,
  };
}

/** Every tool_result must be preceded somewhere by a tool_call. */
function noLeadingOrphanResult(messages: ChatMessage[]): boolean {
  let seenCall = false;
  for (const msg of messages) {
    if (msg.role === "tool_call") {
      seenCall = true;
    }
    if (msg.role === "tool_result" && !seenCall) {
      return false;
    }
  }
  return true;
}

await runSuite(async () => {
  section("Healthy batches must be left alone");

  await test("parallel batch with ids is a no-op", async () => {
    const input = [
      text("a1", "assistant"),
      call("c1", "read_file", "t1"),
      call("c2", "grep", "t2"),
      result("r1", "read_file", "t1"),
      result("r2", "grep", "t2"),
    ];
    const out = repairToolPairs(input);
    assert(!out.repaired, "healthy parallel batch was modified");
    assert(
      out.orphanedCallsFixed === 0 && out.orphanedResultsFixed === 0,
      "healthy parallel batch produced synthetic placeholders",
    );
    const c = counts(out.messages);
    assert(c.calls === 2 && c.results === 2, "call/result count changed");
  });

  await test("parallel batch WITHOUT ids (legacy session) is a no-op", async () => {
    const input = [
      text("a1", "assistant"),
      call("c1", "read_file"),
      call("c2", "grep"),
      result("r1", "read_file"),
      result("r2", "grep"),
    ];
    const out = repairToolPairs(input);
    assert(!out.repaired, "healthy legacy parallel batch was modified");
    const c = counts(out.messages);
    assert(c.calls === 2 && c.results === 2, "call/result count changed");
  });

  await test("five-wide parallel batch is a no-op", async () => {
    const input = [
      text("a1", "assistant"),
      ...[1, 2, 3, 4, 5].map((n) => call(`c${n}`, `tool${n}`, `t${n}`)),
      ...[1, 2, 3, 4, 5].map((n) => result(`r${n}`, `tool${n}`, `t${n}`)),
    ];
    const out = repairToolPairs(input);
    assert(!out.repaired, "healthy five-wide batch was modified");
    const c = counts(out.messages);
    assert(c.calls === 5 && c.results === 5, "call/result count changed");
  });

  await test("results arriving out of call order still pair by id", async () => {
    const input = [
      call("c1", "read_file", "t1"),
      call("c2", "grep", "t2"),
      result("r2", "grep", "t2"),
      result("r1", "read_file", "t1"),
    ];
    const out = repairToolPairs(input);
    assert(!out.repaired, "out-of-order but complete batch was modified");
  });

  await test("text-only conversation is untouched", async () => {
    const input = [text("u1", "user"), text("a1", "assistant")];
    const out = repairToolPairs(input);
    assert(!out.repaired, "text-only conversation was modified");
    assert(out.messages === input, "text-only fast path copied the array");
  });

  section("Genuine orphans must be repaired");

  await test("call with no result gets exactly one synthetic result", async () => {
    const input = [
      call("c1", "read_file", "t1"),
      call("c2", "grep", "t2"),
      result("r1", "read_file", "t1"),
    ];
    const out = repairToolPairs(input);
    assert(out.repaired, "orphaned call was not repaired");
    assert(
      out.orphanedCallsFixed === 1,
      "unexpected synthetic result count for one orphaned call",
    );
    const c = counts(out.messages);
    assert(c.calls === c.results, "batch left unbalanced after repair");
  });

  await test("head-cut orphan result gets a synthetic call placed before it", async () => {
    const input = [result("r1", "read_file", "t1"), text("u1", "user")];
    const out = repairToolPairs(input);
    assert(out.repaired, "orphaned result was not repaired");
    assert(
      out.orphanedResultsFixed === 1,
      "unexpected synthetic call count for one orphaned result",
    );
    assert(
      noLeadingOrphanResult(out.messages),
      "a tool_result still precedes any tool_call after repair",
    );
  });

  await test("interrupted mid-batch (all calls, no results) is balanced", async () => {
    const input = [call("c1", "a", "t1"), call("c2", "b", "t2")];
    const out = repairToolPairs(input);
    const c = counts(out.messages);
    assert(c.calls === 2 && c.results === 2, "batch left unbalanced");
    assert(out.orphanedCallsFixed === 2, "unexpected synthetic result count");
  });

  await test("duplicate result ids never over-pair a call", async () => {
    const input = [
      call("c1", "read_file", "t1"),
      result("r1", "read_file", "t1"),
      result("r1dup", "read_file", "t1"),
    ];
    const out = repairToolPairs(input);
    const c = counts(out.messages);
    // Balance alone is too weak an assertion here: synthesizing a SECOND call
    // to pair with the duplicate would also balance, which is precisely the
    // over-pairing this test exists to forbid. Pin the exact survivors.
    assert(c.calls === 1, "duplicate result caused a call to be synthesized");
    assert(c.results === 1, "duplicate result was not dropped");
    const survivor = out.messages.find((m) => m.role === "tool_result");
    assert(survivor?.id === "r1", "the wrong duplicate result was kept");
  });

  await test("empty tool_result content is not treated as an orphan", async () => {
    const input = [
      call("c1", "read_file", "t1"),
      result("r1", "read_file", "t1", ""),
    ];
    const out = repairToolPairs(input);
    assert(!out.repaired, "empty-content result was wrongly repaired");
  });

  section("Multiple independent batches");

  await test("two separate batches are repaired independently", async () => {
    const input = [
      call("c1", "a", "t1"),
      result("r1", "a", "t1"),
      text("a1", "assistant"),
      call("c2", "b", "t2"),
      call("c3", "c", "t3"),
      result("r3", "c", "t3"),
    ];
    const out = repairToolPairs(input);
    assert(
      out.orphanedCallsFixed === 1,
      "unexpected synthetic result count across two batches",
    );
    const c = counts(out.messages);
    assert(c.calls === c.results, "batches left unbalanced after repair");
  });

  section("Summary pointer must not split a tool batch");

  await test("split inside a batch snaps backward to the batch start", async () => {
    const messages = [
      text("u1", "user"),
      text("a1", "assistant"),
      call("c1", "a", "t1"),
      call("c2", "b", "t2"),
      result("r1", "a", "t1"),
      result("r2", "b", "t2"),
      text("u2", "user"),
    ];
    // index 4 sits between call c2 and result r1 — mid-batch
    const snapped = snapSplitToBatchBoundary(messages, 4);
    assert(snapped === 2, "split did not snap to the start of the batch");
  });

  await test("split already on a clean boundary is unchanged", async () => {
    const messages = [
      text("u1", "user"),
      call("c1", "a", "t1"),
      result("r1", "a", "t1"),
      text("u2", "user"),
    ];
    assert(
      snapSplitToBatchBoundary(messages, 3) === 3,
      "clean boundary was moved",
    );
    assert(
      snapSplitToBatchBoundary(messages, 1) === 1,
      "boundary before a batch was moved",
    );
  });

  await test("a result→call transition is a legal split, left alone", async () => {
    // Two ADJACENT batches. Index 3 sits between the first batch's result and
    // the second batch's call — a boundary BETWEEN batches, not inside one.
    // Treating every adjacent tool pair as "inside a batch" fused the whole
    // history into one indivisible run and skipped past all of it, which can
    // push the split to messages.length and disable summarization entirely.
    const messages = [
      text("u1", "user"),
      call("c1", "a", "t1"),
      result("r1", "a", "t1"),
      call("c2", "b", "t2"),
      result("r2", "b", "t2"),
      text("u2", "user"),
    ];
    assert(
      snapSplitToBatchBoundary(messages, 3) === 3,
      "a legal boundary between two batches was moved",
    );
  });

  await test("a long alternating history keeps interior split points", async () => {
    const messages: ChatMessage[] = [text("u1", "user")];
    for (let i = 0; i < 20; i++) {
      messages.push(call(`c${i}`, "t", `t${i}`), result(`r${i}`, "t", `t${i}`));
    }
    // Every odd index inside the run is a call→result cut (illegal); every even
    // index is a result→call boundary (legal). The legal ones must survive.
    for (let split = 3; split < messages.length - 1; split += 2) {
      assert(
        snapSplitToBatchBoundary(messages, split) === split,
        `legal batch boundary at index ${split} was moved`,
      );
    }
  });

  await test("batch starting at index 0 snaps forward past the batch", async () => {
    const messages = [
      call("c1", "a", "t1"),
      call("c2", "b", "t2"),
      result("r1", "a", "t1"),
      result("r2", "b", "t2"),
      text("u1", "user"),
    ];
    const snapped = snapSplitToBatchBoundary(messages, 2);
    assert(snapped === 4, "leading batch did not snap forward past the batch");
  });

  await test("an all-tool history never consumes the whole recent window", async () => {
    // A forward snap can reach messages.length when the batch starts at index
    // 0. Summarizing everything leaves no recent window and moves the pointer
    // to the last message, so the next read returns a summary and nothing
    // else. findSplitIndexByTokens must decline (0) rather than accept that.
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      messages.push(call(`c${i}`, "t", `t${i}`), result(`r${i}`, "t", `t${i}`));
    }
    const engine = new SummarizationEngine();
    const split = engine.findSplitIndexByTokens(messages, 1);
    assert(
      split < messages.length,
      "split consumed the entire history, leaving no recent window",
    );
  });

  await test("randomized splits never leave an orphan after repair", async () => {
    const messages = [
      text("u1", "user"),
      text("a1", "assistant"),
      call("c1", "a", "t1"),
      call("c2", "b", "t2"),
      result("r1", "a", "t1"),
      result("r2", "b", "t2"),
      text("a2", "assistant"),
      call("c3", "c", "t3"),
      result("r3", "c", "t3"),
      text("u2", "user"),
    ];
    for (let split = 1; split < messages.length; split++) {
      const snapped = snapSplitToBatchBoundary(messages, split);
      const tail = messages.slice(snapped);
      const repaired = repairToolPairs(tail);
      assert(
        noLeadingOrphanResult(repaired.messages),
        `orphaned tool_result survived at split index ${split}`,
      );
      const c = counts(repaired.messages);
      assert(
        c.calls === c.results,
        `unbalanced tool batch at split index ${split}`,
      );
    }
  });
});
