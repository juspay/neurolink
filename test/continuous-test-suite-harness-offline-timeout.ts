#!/usr/bin/env tsx
/**
 * Continuous Test Suite: harness offline-timeout message honesty (no API).
 *
 * Regression coverage for issue #1724. `defineSuite`'s per-test timeout,
 * when a suite declares `offline: true`, used to assert a specific cause
 * ("this is a hang in the code under test, not a slow upstream"). That
 * inference does not hold: `offline` rules out a slow UPSTREAM, not a slow
 * RUNNER, and the message fired on a shared/loaded CI executor while
 * sending a reader hunting for a provider hang that did not exist (the
 * same commit was green on an unchanged re-run, and green locally).
 *
 * This suite exercises `test/helpers/harness.ts` directly: `defineSuite`,
 * `test()` and `resolveTimeoutScale()` are the module under test, not a
 * dependency of it. There is no shipped `dist/` surface for test
 * infrastructure to drive instead — `helpers/harness.ts` is never exported
 * from any package entry point — so this file needs no entry in the
 * `neurolink/e2e-tests-only` `allow` list: it imports only from
 * `./helpers/harness.js`, which the rule does not flag in the first place
 * (same reasoning as `continuous-test-suite-handler-registry.ts`'s header,
 * one level further in: that file gets an allow-list entry because it also
 * imports `HandlerRegistry` from `src/lib/`; this one imports nothing from
 * `src/` or `dist/` at all).
 *
 * `runSuite()` calls `process.exit()`, so the *inner* `defineSuite()`
 * instances built below to provoke a timeout are driven through `test()`
 * directly and never call their own `runSuite()`. Their PASS/FAIL/SKIP
 * line and message text are the only externally observable signal
 * `SuiteHandle` offers, so each case temporarily swaps `console.log` for a
 * capturing stub, runs one inner `test()` call, and restores it — the
 * capture window is a single `await`, so nothing else in the process can
 * log through the stub.
 *
 * Run: npx tsx test/continuous-test-suite-harness-offline-timeout.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  resolveTimeoutScale,
  TIMEOUT_SCALE_ENV_VAR,
} from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Harness: offline-timeout honesty", {
  offline: true,
});

/** Strip ANSI color codes so substring checks aren't tripped by escapes. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex -- matching the harness's own ANSI codes
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Run `fn` with `console.log` swapped for a capturing stub, and return the
 * captured lines joined with the elapsed wall-clock time. The elapsed time
 * is the precondition that the captured lines actually came from a timeout
 * firing (not from a case that returned instantly) — every caller checks it
 * before trusting an absence in the captured text.
 */
async function captureLog(
  fn: () => Promise<void>,
): Promise<{ text: string; elapsedMs: number }> {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]): void => {
    lines.push(args.map(String).join(" "));
  };
  const startedAt = Date.now();
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return {
    text: stripAnsi(lines.join("\n")),
    elapsedMs: Date.now() - startedAt,
  };
}

/** A case body that never settles — the only way a per-test timeout can fire. */
const wedged = (): Promise<void> => new Promise<void>(() => {});

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Set/restore TIMEOUT_SCALE_ENV_VAR around a scoped call, never leaking state. */
async function withTimeoutScaleEnv<T>(
  value: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const original = process.env[TIMEOUT_SCALE_ENV_VAR];
  if (value === undefined) {
    delete process.env[TIMEOUT_SCALE_ENV_VAR];
  } else {
    process.env[TIMEOUT_SCALE_ENV_VAR] = value;
  }
  try {
    return await fn();
  } finally {
    if (original === undefined) {
      delete process.env[TIMEOUT_SCALE_ENV_VAR];
    } else {
      process.env[TIMEOUT_SCALE_ENV_VAR] = original;
    }
  }
}

// ---------------------------------------------------------------------------
// resolveTimeoutScale() — the parsing/fallback rules in isolation
// ---------------------------------------------------------------------------

await test("resolveTimeoutScale falls back to 1 for every unset/empty/non-positive/non-finite input", async () => {
  const invalidInputs: Array<string | undefined> = [
    undefined,
    "",
    "   ",
    "abc",
    "0",
    "-5",
    "NaN",
    "Infinity",
    "-Infinity",
  ];
  for (const raw of invalidInputs) {
    await withTimeoutScaleEnv(raw, async () => {
      assertEqual(
        resolveTimeoutScale(),
        1,
        "an invalid or absent scale must fall back to the unscaled default of 1",
      );
    });
  }
});

await test("resolveTimeoutScale returns the parsed value for valid positive finite numbers", async () => {
  const table: Array<[string, number]> = [
    ["2", 2],
    ["0.5", 0.5],
    ["10", 10],
  ];
  for (const [raw, expected] of table) {
    await withTimeoutScaleEnv(raw, async () => {
      assertEqual(
        resolveTimeoutScale(),
        expected,
        "a valid positive finite override must be returned unchanged",
      );
    });
  }
});

// ---------------------------------------------------------------------------
// The offline-timeout message itself
// ---------------------------------------------------------------------------

await test("an offline suite's timeout names both a hang and runner contention, asserting neither", async () => {
  const budgetMs = 100;
  const { test: innerTest } = defineSuite("inner offline probe", {
    offline: true,
    perTestTimeoutMs: budgetMs,
  });
  const { text, elapsedMs } = await captureLog(() =>
    innerTest("wedged case", wedged),
  );

  // Precondition: the timeout actually fired (this cannot resolve any
  // other way, since `wedged` never settles), before trusting anything
  // this test asserts is absent from the captured output.
  assert(
    elapsedMs >= budgetMs,
    "the wedged case must have run for at least its full budget before the timeout could fire",
  );
  assert(
    text.includes("✗"),
    "an offline suite's timeout must be reported as a failure",
  );
  assert(
    !text.includes("⊘"),
    "an offline suite's timeout must not be reported as a skip",
  );

  assert(
    text.includes("hang in the code under test"),
    "the message must name a genuine hang as one possible explanation",
  );
  assert(
    text.includes("shared/loaded CI runner"),
    "the message must name runner contention as the other possible explanation",
  );
  assert(
    text.includes(`${budgetMs}ms`),
    "the message must state the specific budget that was exceeded",
  );
  assert(
    text.includes(TIMEOUT_SCALE_ENV_VAR),
    "the message must point at the scaling env var as an actionable next step",
  );
  assert(
    !text.includes(
      "this is a hang in the code under test, not a slow upstream",
    ),
    "the old message's false-certainty phrasing must not reappear",
  );
});

await test("a live (non-offline) suite's timeout is unaffected and stays a skip", async () => {
  const budgetMs = 100;
  const { test: innerTest } = defineSuite("inner live probe", {
    perTestTimeoutMs: budgetMs,
  });
  const { text, elapsedMs } = await captureLog(() =>
    innerTest("wedged case", wedged),
  );

  assert(
    elapsedMs >= budgetMs,
    "the wedged case must have run for at least its full budget before the timeout could fire",
  );
  assert(
    text.includes("⊘"),
    "a live suite's timeout must still be reported as a skip, not a failure",
  );
  assert(
    !text.includes("✗"),
    "a live suite's timeout must not be reported as a failure",
  );
});

// ---------------------------------------------------------------------------
// NEUROLINK_TEST_TIMEOUT_SCALE widens the enforced budget; unset leaves it exact
// ---------------------------------------------------------------------------

await test("with the scale env var unset, the enforced budget is exactly the suite's own value", async () => {
  const budgetMs = 200;

  await withTimeoutScaleEnv(undefined, async () => {
    const { test: underTest } = defineSuite("inner unscaled under-budget", {
      offline: true,
      perTestTimeoutMs: budgetMs,
    });
    const under = await captureLog(() =>
      underTest("comfortably under budget", () => delay(20)),
    );
    assert(
      under.text.includes("✓"),
      "a case well inside the unscaled budget must pass",
    );

    const { test: overTest } = defineSuite("inner unscaled over-budget", {
      offline: true,
      perTestTimeoutMs: budgetMs,
    });
    const over = await captureLog(() =>
      overTest("comfortably over budget", () => delay(1000)),
    );
    assert(
      over.elapsedMs >= budgetMs,
      "the over-budget case must have run for at least the unscaled budget before timing out",
    );
    assert(
      over.text.includes("✗"),
      "a case well past the unscaled budget must still fail today, unchanged",
    );
  });
});

await test("NEUROLINK_TEST_TIMEOUT_SCALE widens the enforced budget for a case that would otherwise fail", async () => {
  const budgetMs = 200;
  const scale = 6;
  const caseDelayMs = 600; // > unscaled budget (200ms), < scaled budget (1200ms)

  await withTimeoutScaleEnv(String(scale), async () => {
    const { test: scaledTest } = defineSuite("inner scaled probe", {
      offline: true,
      perTestTimeoutMs: budgetMs,
    });
    const { text, elapsedMs } = await captureLog(() =>
      scaledTest("needs the widened budget", () => delay(caseDelayMs)),
    );

    // Precondition: the case really did run long enough that it would
    // have blown the unscaled budget, proving the scale — not luck —
    // is why it passed.
    assert(
      elapsedMs >= caseDelayMs,
      "the case must have run its full delay before this assertion means anything",
    );
    assert(
      elapsedMs < budgetMs * scale,
      "the case must have finished inside the scaled budget",
    );
    assert(
      text.includes("✓"),
      "a case that exceeds the unscaled budget but not the scaled one must pass",
    );
  });
});

await runSuite();
