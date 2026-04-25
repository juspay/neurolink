#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Issue #2 — token overflow retry waste
 *
 * Curator P1-2: a 1.06M-word conversation against a 128K-window LiteLLM model
 * dispatched the entire 1.33M-token payload to the provider (provider 400'd
 * with "prompt is too long"), then NeuroLink retried up to 3× with the same
 * oversized payload. Total waste: ~628K wasted input tokens per call.
 *
 * The fix in `src/lib/neurolink.ts` adds:
 *   1. Pre-dispatch compaction for inline `conversationMessages` (previously
 *      gated to `conversationMemory` only — inline callers were dispatched
 *      raw).
 *   2. Pre-dispatch hard cap when no compaction is possible (no memory + no
 *      inline messages, only a huge prompt) — throws ContextBudgetExceededError
 *      before any HTTP roundtrip.
 *   3. Escalating truncation across recovery retries (fractions
 *      [derived, 0.5, 0.75, 0.9]) instead of a single-pass attempt.
 *   4. New `compaction.insufficient` event emitted from three sites:
 *      pre-dispatch hard cap, mid-compaction insufficient, and exhausted
 *      post-provider recovery.
 *
 * Strategy (no mocks — real LiteLLM via .env, real OTel, real outbound HTTP):
 *   • Wrap `globalThis.fetch` BEFORE NeuroLink is imported. The real fetch
 *     still runs; we just observe the body bytes that get dispatched.
 *   • Run every behavior twice — once via `sdk.generate()` and once via
 *     `sdk.stream()` — so the fix covers both paths.
 *   • Verify by:
 *     a) static check — the fix code is present in shipped artifact
 *     b) dispatched body bytes are within the model window (compaction ran)
 *     c) `compaction.insufficient` event fires on the recovery-impossible
 *        path
 *     d) `ContextBudgetExceededError` thrown when hard cap fires
 *     e) exact dispatch count: 0 for hard-cap, ≤1 for compactable
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-issue-02-overflow-retry.ts
 */
import "dotenv/config";

import { installFetchCapture } from "./helpers/fetchCapture.js";
const fetchCapture = installFetchCapture();

import { NeuroLink } from "../dist/index.js";
import {
  buildLargeConversationMessages,
  generateLargeText,
} from "./helpers/largeConversation.js";
import {
  isExpectedProviderError,
  skipIfEnvMissing,
} from "./helpers/envGuard.js";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
};

type Outcome = "PASS" | "FAIL" | "SKIP";
const results: { name: string; outcome: Outcome; detail: string }[] = [];

function record(name: string, outcome: Outcome, detail: string): void {
  results.push({ name, outcome, detail });
  const color =
    outcome === "PASS"
      ? colors.green
      : outcome === "FAIL"
        ? colors.red
        : colors.yellow;
  console.log(`${color}[${outcome}]${colors.reset} ${name} — ${detail}`);
}

function section(t: string): void {
  console.log(
    `\n${colors.cyan}${"=".repeat(72)}\n  ${t}\n${"=".repeat(72)}${colors.reset}`,
  );
}

const PROVIDER = "litellm";
const MODEL = process.env.CURATOR_LITELLM_ALLOWED_MODEL ?? "open-large";
// 128K-token window ≈ 512KB JSON. Bug-state dispatched 1.33M tokens (~5MB).
// 1.5MB is the unambiguous PASS/FAIL threshold — anything above means an
// oversized payload leaked through.
const MAX_COMPACTED_BODY_BYTES = 1_500_000;
const HUGE_PROMPT_TOKENS = 200_000;
const JUST_OVER_WINDOW_TOKENS = 145_000;
// Even after 90% truncation the remaining 10% must still exceed the 128K
// budget — i.e. start above ~1.28M tokens — to force the terminal-failure
// branch instead of letting emergency truncation save the day.
const UNFIXABLE_OVERFLOW_TOKENS = 2_000_000;
const DEFAULT_LITELLM_HOSTNAME_FRAGMENT =
  process.env.LITELLM_BASE_URL?.split("//")[1]?.split("/")[0] ?? "litellm";

type GenStreamMethod = "generate" | "stream";

function describe(method: GenStreamMethod, label: string): string {
  return `${label} [${method}]`;
}

async function consumeStream(stream: AsyncIterable<unknown>): Promise<string> {
  let acc = "";
  for await (const chunk of stream) {
    const c = chunk as { content?: string };
    if (typeof c.content === "string") {
      acc += c.content;
    }
  }
  return acc;
}

async function callSdk(
  sdk: NeuroLink,
  method: GenStreamMethod,
  options: Record<string, unknown>,
): Promise<{
  ok: boolean;
  err?: unknown;
  resultUsageInput?: number;
  textLen?: number;
}> {
  try {
    if (method === "generate") {
      const res = (await sdk.generate(options as never)) as {
        content: string;
        usage?: { input?: number; total?: number };
      };
      return {
        ok: true,
        resultUsageInput: res.usage?.input,
        textLen: res.content?.length ?? 0,
      };
    } else {
      const res = (await sdk.stream(options as never)) as {
        stream: AsyncIterable<unknown>;
        usage?: { input?: number };
      };
      const text = await consumeStream(res.stream);
      return {
        ok: true,
        resultUsageInput: res.usage?.input,
        textLen: text.length,
      };
    }
  } catch (err) {
    return { ok: false, err };
  }
}

// ---------------------------------------------------------------------------
//   Test 2.0 — STATIC: shipped artifact contains the fix code
// ---------------------------------------------------------------------------
async function test_2_0_static_artifact_contains_fix(): Promise<void> {
  const testName = "2.0 — STATIC: shipped artifact contains the fix code";
  const fs = await import("node:fs/promises");
  const path = "dist/lib/neurolink.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return record(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  // Reviewer follow-up: only check for stable string literals that are part
  // of the public event contract (event names + phase strings). Local
  // identifier names like `dpgHasInlineMessages` would be mangled by any
  // future minification pass and are an implementation detail.
  const markers = {
    compactionInsufficient: /compaction\.insufficient/,
    preDispatchHardCap: /pre-dispatch-no-recovery/,
    midCompaction: /mid-compaction/,
    postEmergencyTruncation: /post-emergency-truncation/,
    postProviderRecovery: /post-provider-recovery/,
    postProviderRecoveryNoCompaction: /post-provider-recovery-no-compaction/,
  };
  const missing = Object.entries(markers)
    .filter(([, re]) => !re.test(src))
    .map(([k]) => k);
  if (missing.length === 0) {
    record(
      testName,
      "PASS",
      `all ${Object.keys(markers).length} fix markers present in shipped artifact`,
    );
  } else {
    record(
      testName,
      "FAIL",
      `bug-confirmed: shipped artifact missing fix markers [${missing.join(", ")}]`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.1 — pre-dispatch hard cap: huge prompt, no memory, no inline msgs
// ---------------------------------------------------------------------------
async function test_2_1_pre_dispatch_hard_cap(
  method: GenStreamMethod,
): Promise<void> {
  const testName = describe(
    method,
    "2.1 — pre-dispatch hard cap aborts huge prompt before any HTTP dispatch",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  let insufficientEvent: Record<string, unknown> | undefined;
  sdk.getEventEmitter().on("compaction.insufficient", (e) => {
    insufficientEvent = e as Record<string, unknown>;
  });

  const hugePrompt = generateLargeText(HUGE_PROMPT_TOKENS);

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: hugePrompt },
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const litellmDispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      // Only chat-completion calls count — `/v1/models` GET is a model
      // metadata lookup, not a payload dispatch.
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );

  if (out.ok) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: huge prompt succeeded; expected ContextBudgetExceededError. dispatches=${litellmDispatches.length}`,
    );
  }

  const err = out.err as Error & { constructor: { name: string } };
  const ctorName = err?.constructor?.name ?? "unknown";
  const msg = err instanceof Error ? err.message : String(err);
  const lowerMsg = msg.toLowerCase();

  if (
    isExpectedProviderError(msg) &&
    !lowerMsg.includes("context exceeds") &&
    !lowerMsg.includes("budget")
  ) {
    return record(testName, "SKIP", msg.slice(0, 120));
  }

  const isTypedBudgetError =
    ctorName === "ContextBudgetExceededError" ||
    lowerMsg.includes("context exceeds model budget") ||
    lowerMsg.includes("no compaction is possible");
  const eventFired = !!insufficientEvent;
  const eventPhaseOk = insufficientEvent?.phase === "pre-dispatch-no-recovery";
  const noDispatchEscaped = litellmDispatches.length === 0;

  if (isTypedBudgetError && eventFired && eventPhaseOk && noDispatchEscaped) {
    record(
      testName,
      "PASS",
      `pre-dispatch hard cap fired: dispatches=0, event.phase=${insufficientEvent?.phase}, error=${ctorName}`,
    );
  } else {
    const dispatchUrls = litellmDispatches
      .map((d) => `${d.method} ${d.url} body=${d.bodyBytes}B`)
      .join("; ");
    record(
      testName,
      "FAIL",
      `bug-confirmed: typed=${isTypedBudgetError} ctor=${ctorName} eventFired=${eventFired} eventPhase=${insufficientEvent?.phase} dispatches=${litellmDispatches.length} [${dispatchUrls}] msg="${msg.slice(0, 160)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.2 — inline conversationMessages get compacted before dispatch
// ---------------------------------------------------------------------------
async function test_2_2_inline_messages_compacted(
  method: GenStreamMethod,
): Promise<void> {
  const testName = describe(
    method,
    "2.2 — inline conversationMessages compacted before HTTP dispatch (body bytes within window)",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const conversation = buildLargeConversationMessages({
    targetTokens: HUGE_PROMPT_TOKENS,
    perTurnTokens: 5_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "Summarize the conversation in one short sentence." },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );
  const maxBody = dispatches.reduce((m, d) => Math.max(m, d.bodyBytes), 0);

  if (!out.ok) {
    const err = out.err;
    const msg = err instanceof Error ? err.message : String(err);
    const ctorName =
      (err as { constructor?: { name?: string } })?.constructor?.name ??
      "unknown";
    const lowerMsg = msg.toLowerCase();
    if (
      isExpectedProviderError(msg) &&
      !lowerMsg.includes("too long") &&
      !lowerMsg.includes("budget") &&
      !lowerMsg.includes("context")
    ) {
      return record(testName, "SKIP", msg.slice(0, 120));
    }
    if (lowerMsg.includes("prompt is too long")) {
      return record(
        testName,
        "FAIL",
        `bug-confirmed: oversized payload reached provider despite compaction. dispatches=${dispatches.length}, maxBody=${maxBody} bytes, oversized=${oversized.length}, msg="${msg.slice(0, 160)}"`,
      );
    }
    if (oversized.length > 0) {
      return record(
        testName,
        "FAIL",
        `bug-confirmed: ${oversized.length}/${dispatches.length} oversized dispatches; maxBody=${maxBody} bytes; ${ctorName}: ${msg.slice(0, 120)}`,
      );
    }
    return record(
      testName,
      "PASS",
      `no oversized dispatch leaked even though recovery rejected; dispatches=${dispatches.length}, maxBody=${maxBody}, ${ctorName}: ${msg.slice(0, 120)}`,
    );
  }

  if (oversized.length > 0) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} dispatches over ${MAX_COMPACTED_BODY_BYTES} bytes (compaction did not reduce payload); maxBody=${maxBody}, dispatches=${dispatches.length}`,
    );
  }
  if (dispatches.length === 0) {
    return record(
      testName,
      "FAIL",
      `unexpected: success reported but 0 outbound HTTP dispatches captured`,
    );
  }
  if (dispatches.length > 2) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: ${dispatches.length} dispatches (expected ≤2); retry storm likely`,
    );
  }
  record(
    testName,
    "PASS",
    `dispatches=${dispatches.length}, maxBody=${maxBody} bytes (<${MAX_COMPACTED_BODY_BYTES}), provider input tokens=${out.resultUsageInput ?? "n/a"}, textLen=${out.textLen}`,
  );
}

// ---------------------------------------------------------------------------
//   Test 2.3 — exact dispatch count: 145K conv produces single compacted call
// ---------------------------------------------------------------------------
async function test_2_3_no_wasted_retries(
  method: GenStreamMethod,
): Promise<void> {
  const testName = describe(
    method,
    "2.3 — no wasted retries: 145K-token conversation produces exactly 1 compacted dispatch",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const conversation = buildLargeConversationMessages({
    targetTokens: JUST_OVER_WINDOW_TOKENS,
    perTurnTokens: 4_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "Summarize." },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );

  if (!out.ok) {
    const msg = out.err instanceof Error ? out.err.message : String(out.err);
    const lowerMsg = msg.toLowerCase();
    if (
      isExpectedProviderError(msg) &&
      !lowerMsg.includes("too long") &&
      !lowerMsg.includes("budget") &&
      !lowerMsg.includes("context")
    ) {
      return record(testName, "SKIP", msg.slice(0, 120));
    }
  }

  if (oversized.length > 0) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} oversized dispatches; bug pattern is dispatching 1.3M tokens repeatedly`,
    );
  }

  // Reviewer follow-up: tighten gate to match the title — the fix produces
  // exactly one compacted dispatch (or zero on hard-cap throw); the original
  // bug pattern was 3 same-payload retries. >1 dispatch indicates a retry
  // path is firing where it shouldn't.
  if (dispatches.length <= 1) {
    record(
      testName,
      "PASS",
      `dispatches=${dispatches.length}; no retry storm; success=${out.ok}; bytes=[${dispatches.map((d) => d.bodyBytes).join(",")}]`,
    );
  } else {
    record(
      testName,
      "FAIL",
      `bug-confirmed: ${dispatches.length} dispatches (>1 indicates wasted retries)`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.4 — compaction.insufficient + ContextBudgetExceededError on overflow
// ---------------------------------------------------------------------------
async function test_2_4_unfixable_overflow_emits_event_and_throws(
  method: GenStreamMethod,
): Promise<void> {
  const testName = describe(
    method,
    "2.4 — unfixable 2M conv emits compaction.insufficient and throws ContextBudgetExceededError",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return record(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const events: Record<string, unknown>[] = [];
  sdk.getEventEmitter().on("compaction.insufficient", (e) => {
    events.push(e as Record<string, unknown>);
  });

  const conversation = buildLargeConversationMessages({
    targetTokens: UNFIXABLE_OVERFLOW_TOKENS,
    perTurnTokens: 10_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "summarize" },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );

  if (oversized.length > 0) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} oversized dispatches (raw payload leaked to provider)`,
    );
  }

  if (events.length === 0) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: 0 compaction.insufficient events for an unfixable overflow (expected ≥1). out.ok=${out.ok}`,
    );
  }

  // Reviewer follow-up: when the request DOES fail, the failure must be
  // typed as ContextBudgetExceededError so callers can distinguish "context
  // too large" from a generic provider failure. When the request succeeds
  // (emergency truncation saved it), the compaction.insufficient event
  // contract proves the SDK observed the overflow — that's still PASS.
  if (out.ok) {
    record(
      testName,
      "PASS",
      `recovery succeeded via emergency truncation: events=${events.length}, phases=[${events.map((e) => e.phase ?? "?").join(",")}], dispatches=${dispatches.length}`,
    );
    return;
  }
  const err = out.err as { constructor?: { name?: string } } | undefined;
  const ctorName = err?.constructor?.name ?? "unknown";
  const msg = out.err instanceof Error ? out.err.message : String(out.err);
  const lowerMsg = msg.toLowerCase();
  if (
    isExpectedProviderError(msg) &&
    !lowerMsg.includes("budget") &&
    !lowerMsg.includes("context") &&
    !lowerMsg.includes("compaction")
  ) {
    return record(testName, "SKIP", msg.slice(0, 120));
  }
  const isTypedBudgetError =
    ctorName === "ContextBudgetExceededError" ||
    lowerMsg.includes("context exceeds model budget") ||
    lowerMsg.includes("context overflow recovery") ||
    lowerMsg.includes("no compaction is possible");
  if (!isTypedBudgetError) {
    return record(
      testName,
      "FAIL",
      `bug-confirmed: unfixable overflow surfaced ${ctorName} instead of ContextBudgetExceededError. events=${events.length}, msg="${msg.slice(0, 160)}"`,
    );
  }

  record(
    testName,
    "PASS",
    `events=${events.length}, phases=[${events.map((e) => e.phase ?? "?").join(",")}], dispatches=${dispatches.length}, error=${ctorName}`,
  );
}

async function main(): Promise<void> {
  section("Issue #2 — overflow retry waste (real LiteLLM, real fetch capture)");
  await test_2_0_static_artifact_contains_fix();

  for (const method of ["generate", "stream"] as const) {
    await test_2_1_pre_dispatch_hard_cap(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_2_inline_messages_compacted(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_3_no_wasted_retries(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_4_unfixable_overflow_emits_event_and_throws(method);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;
  const skipped = results.filter((r) => r.outcome === "SKIP").length;
  console.log(
    `\n${colors.bright}Results:${colors.reset} ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  // Reviewer follow-up: exit non-zero on failures so CI catches regressions
  // of the overflow recovery contract.
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
