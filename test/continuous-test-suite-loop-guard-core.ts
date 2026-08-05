#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — provider-neutral agent-loop reclaim policy
 *
 * `planLoopGuardReclaim` is the shared decision layer behind every provider
 * loop's in-turn context guard. Each native loop keeps its history in a
 * different shape, so the policy is tested here once, against the neutral
 * `LoopGuardEntry` view, and the adapters are tested separately for mapping.
 *
 * The two invariants that matter most:
 *   - a tool batch is dropped WHOLE or not at all (an orphaned tool_call is a
 *     hard provider rejection)
 *   - a loop that fits is left completely untouched (any mutation invalidates
 *     the cached prompt prefix)
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-loop-guard-core.ts
 *      pnpm run test:loop-guard-core
 */

import { planLoopGuardReclaim } from "../src/lib/context/loopGuardCore.js";
import type { LoopGuardEntry } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Loop guard core policy");

/**
 * NOTE: assertion messages must NEVER interpolate payloads — `defineSuite`
 * downgrades a throw to SKIP when the text matches `isExpectedProviderError()`,
 * silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const other = (tokens: number): LoopGuardEntry => ({ kind: "other", tokens });
const call = (tokens = 50): LoopGuardEntry => ({ kind: "toolCall", tokens });
const result = (tokens: number, previewTokens?: number): LoopGuardEntry => ({
  kind: "toolResult",
  tokens,
  ...(previewTokens !== undefined ? { previewTokens } : {}),
});

const WINDOW = 100_000;
const BASE = { availableInputTokens: WINDOW, fixedOverheadTokens: 0 };

await runSuite(async () => {
  section("Below threshold the history must not be touched");

  await test("small history does not fire", async () => {
    const entries = [other(100), call(), result(500, 100), other(100)];
    const plan = planLoopGuardReclaim(entries, BASE);
    assert(!plan.fire, "guard fired on a history that fits");
    assert(
      plan.truncate.length === 0 && plan.drop.length === 0,
      "guard proposed changes below the threshold",
    );
  });

  await test("fixed overhead counts toward the threshold", async () => {
    // Enough entries that a reclaimable window exists outside the protected
    // tail — otherwise the guard correctly reports nothing actionable and the
    // overhead's effect on the decision is unobservable.
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 10; i++) {
      entries.push(call(), result(1000, 100));
    }
    const under = planLoopGuardReclaim(entries, BASE);
    const over = planLoopGuardReclaim(entries, {
      ...BASE,
      fixedOverheadTokens: 95_000,
    });
    assert(!under.fire, "guard fired without overhead");
    assert(over.fire, "guard ignored fixed overhead when deciding to fire");
  });

  section("Stage 1: shrink old tool outputs");

  await test("truncates old results and leaves the tail alone", async () => {
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 20; i++) {
      entries.push(call(), result(6000, 200));
    }
    const plan = planLoopGuardReclaim(entries, BASE);
    assert(plan.fire, "guard did not fire on an over-threshold history");
    assert(plan.truncate.length > 0, "no tool outputs were truncated");
    assert(!plan.truncate.includes(0), "guard touched the task entry");
    const tailStart = entries.length - 4;
    assert(
      plan.truncate.every((i) => i < tailStart),
      "guard truncated inside the protected tail",
    );
    assert(
      plan.drop.every((i) => i < tailStart && i !== 0),
      "guard dropped a protected entry",
    );
  });

  section("Stage 2: drop whole batches when previews cannot converge");

  await test("outputs already small force batch drops", async () => {
    // previewTokens === tokens: truncation buys nothing, so dropping is the
    // only lever. This is the regime that made the AI-SDK guard fire on every
    // step before it gained a low-water mark.
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 200; i++) {
      entries.push(call(), result(500, 500));
    }
    const plan = planLoopGuardReclaim(entries, BASE);
    assert(plan.fire, "guard did not fire when over threshold");
    assert(plan.drop.length > 0, "guard did not drop any batch");
    assert(
      plan.projectedTokens <= WINDOW * 0.6,
      "guard did not reclaim down to the low-water mark",
    );
  });

  await test("dropped batches are always complete", async () => {
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 200; i++) {
      entries.push(call(), result(500, 500));
    }
    const plan = planLoopGuardReclaim(entries, BASE);
    const dropped = new Set(plan.drop);
    // Walk the surviving entries: every toolCall must still be followed,
    // within its run, by at least one toolResult.
    const survivors = entries.filter((_, i) => !dropped.has(i));
    let openCalls = 0;
    let orphanResults = 0;
    for (const entry of survivors) {
      if (entry.kind === "toolCall") {
        openCalls++;
      } else if (entry.kind === "toolResult") {
        if (openCalls === 0) {
          orphanResults++;
        } else {
          openCalls--;
        }
      }
    }
    assert(orphanResults === 0, "a dropped batch left an orphaned tool result");
    assert(
      openCalls === 0,
      "a dropped batch left a tool call without a result",
    );
  });

  await test("a batch straddling the protected tail is never split", async () => {
    // The boundary case the single-result batches above cannot reach. When one
    // tool call fans out to SEVERAL results, the protected tail can begin in
    // the middle of that batch. Clamping the batch scan at the boundary emitted
    // a partial batch, so the plan dropped the tool call plus some of its
    // results and left the rest orphaned — a hard provider rejection, and worse
    // than not reclaiming at all.
    const RESULTS_PER_CALL = 3;
    const BATCH = 1 + RESULTS_PER_CALL;
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 20; i++) {
      // previewTokens === tokens ⇒ stage 1 saves nothing, forcing stage 2.
      entries.push(call(50));
      for (let r = 0; r < RESULTS_PER_CALL; r++) {
        entries.push(result(500, 500));
      }
    }
    // A tail of 2 makes the boundary fall strictly INSIDE the final batch;
    // the default 4 happens to align with this batch size and hides the split.
    const protectedTailCount = 2;
    assert(
      (entries.length - protectedTailCount - 1) % BATCH !== 0,
      "test setup does not place the tail boundary inside a batch",
    );
    // Heavy fixed overhead leaves almost no room for history, so stage 2 tries
    // to drop every batch — including the straddling one.
    const plan = planLoopGuardReclaim(entries, {
      ...BASE,
      fixedOverheadTokens: 59_000,
      protectedTailCount,
    });
    assert(plan.fire, "guard did not fire on an over-threshold history");

    const dropped = new Set(plan.drop);
    const survivors = entries.filter((_, i) => !dropped.has(i));
    // One call may answer MANY results, so counting pairs is wrong here. The
    // real invariant: within each contiguous tool run, a result must be
    // preceded by a call.
    let sawCallInRun = false;
    let orphanResults = 0;
    let unansweredCalls = 0;
    for (let i = 0; i < survivors.length; i++) {
      const entry = survivors[i];
      if (entry.kind === "toolCall") {
        sawCallInRun = true;
        if (survivors[i + 1]?.kind !== "toolResult") {
          unansweredCalls++;
        }
      } else if (entry.kind === "toolResult") {
        if (!sawCallInRun) {
          orphanResults++;
        }
      } else {
        sawCallInRun = false;
      }
    }
    assert(
      orphanResults === 0,
      "a batch was split at the protected-tail boundary, orphaning results",
    );
    assert(
      unansweredCalls === 0,
      "a batch was split at the protected-tail boundary, stranding a call",
    );
  });

  await test("drop stops once under the low-water mark", async () => {
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 200; i++) {
      entries.push(call(), result(500, 500));
    }
    const plan = planLoopGuardReclaim(entries, BASE);
    // It must not scorch the whole history to reach the mark.
    assert(
      plan.drop.length < entries.length - 5,
      "guard dropped essentially the entire history",
    );
  });

  section("Hysteresis: a reclaimed history must not immediately re-fire");

  await test("applying the plan leaves the next call quiet", async () => {
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 200; i++) {
      entries.push(call(), result(500, 500));
    }
    const plan = planLoopGuardReclaim(entries, BASE);
    assert(plan.fire, "guard did not fire on the first pass");

    const dropped = new Set(plan.drop);
    const truncated = new Set(plan.truncate);
    const after = entries
      .filter((_, i) => !dropped.has(i))
      .map((entry, originalIndex) =>
        truncated.has(originalIndex)
          ? { ...entry, tokens: entry.previewTokens ?? entry.tokens }
          : entry,
      );

    const second = planLoopGuardReclaim(after, BASE);
    assert(
      !second.fire,
      "guard would fire again immediately after its own reclaim",
    );
  });

  section("Degenerate inputs");

  await test("empty history never fires", async () => {
    assert(
      !planLoopGuardReclaim([], BASE).fire,
      "guard fired on an empty history",
    );
  });

  await test("history of only protected entries cannot be reclaimed", async () => {
    const entries = [other(90_000), other(10), other(10), other(10), other(10)];
    const plan = planLoopGuardReclaim(entries, BASE);
    assert(
      plan.truncate.length === 0 && plan.drop.length === 0,
      "guard modified entries it is required to protect",
    );
    assert(!plan.fire, "guard reported a change it did not make");
  });

  await test("zero calibration does not divide by zero", async () => {
    const entries = [other(100), call(), result(500, 100)];
    const plan = planLoopGuardReclaim(entries, { ...BASE, calibration: 0 });
    assert(
      Number.isFinite(plan.projectedTokens),
      "projected tokens went non-finite under zero calibration",
    );
  });

  await test("calibration above 1 tightens both marks", async () => {
    const entries: LoopGuardEntry[] = [other(100)];
    for (let i = 0; i < 12; i++) {
      entries.push(call(), result(6000, 200));
    }
    const plain = planLoopGuardReclaim(entries, BASE);
    const tight = planLoopGuardReclaim(entries, { ...BASE, calibration: 2 });
    assert(
      !plain.fire || tight.fire,
      "higher calibration did not make the guard at least as eager",
    );
  });
});
