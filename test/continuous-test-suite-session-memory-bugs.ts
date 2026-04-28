#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Session Memory Bugs (Curator SI-069 / SI-071)
 *
 * Regression suite for the two production conversation-memory bugs:
 *
 *   Bug 1 — The abort branch of handleGenerateTextInternalFailure used to
 *           persist a fabricated assistant turn ("[generation was
 *           interrupted]") into Redis/in-memory. Fixed by removing the
 *           memory write on abort.
 *
 *   Bug 2 — Already-polluted sessions kept sending the sentinel back to the
 *           provider as conversation context. With ~6+ such turns, models
 *           treated it as a few-shot pattern and emitted the sentinel as
 *           their response — the symptom Habeeb / Sahil reported in Slack.
 *           Fixed by a read-time filter in getConversationMessages plus
 *           belt-and-braces guards in storeConversationTurn.
 *
 * All five tests in this file pass against the current SDK (vertex
 * provider, ~16-30s end-to-end). They exist to (a) document the exact
 * production failure shape and (b) catch any future regression that
 * re-introduces sentinel persistence or polluted-prompt propagation.
 *
 * Run: pnpm run test:session-memory-bugs --provider=vertex
 */

import type { ChatMessage } from "../dist/index.js";
import { NeuroLink } from "../dist/index.js";

// The literal string this suite is hunting. Kept in sync with
// `ABORT_LEGACY_SENTINEL` in src/lib/utils/conversationMemory.ts (the only
// place the SDK still references the string — for the read-time filter).
// The producer in handleGenerateTextInternalFailure was removed in the
// fix; this constant exists so the tests can synthesise polluted sessions
// that mimic what historical Redis stores still contain.
const ABORT_SENTINEL = "[generation was interrupted]";

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  // OpenAI-compat providers added 2026
  deepseek: 4096,
  "nvidia-nim": 8192,
  "lm-studio": 1024,
  llamacpp: 1024,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "openai",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 60000,
  interTestDelay: 2000,
};

// ============================================================
// LOGGING UTILITIES (mirrors continuous-test-suite-memory.ts)
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = {
    PASS: "✅",
    FAIL: "❌",
    SKIP: "⏭️",
    TESTING: "⚠️",
  };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`${icons[status]} ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "ollama",
    "provider error",
    "failed to generate",
    "cannot connect",
    "econnrefused",
  ].some((p) => lower.includes(p));
}

function generateTestSessionId(testName: string): string {
  return `test-sm-${testName}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).substring(2, 12)}`,
    role,
    content,
    timestamp: nowIso(),
  };
}

// ============================================================
// TEST #1: Abort during generate must NOT persist the sentinel turn
// ============================================================
//
// Regression guard for Bug 1.
//
// Pre-condition: a session pre-loaded with one valid turn via
// setSessionMessages, so we have a known baseline message count and never
// need a working provider for setup.
//
// Action: call generate() with an *already-aborted* AbortSignal. The
// short-circuit checks inside the SDK throw a DOMException with
// `name: "AbortError"`, the catch in runGenerateTextInternalFlow wraps it
// to NeuroLinkError(category: ABORT) (which keeps `name: "AbortError"` for
// backwards compat), and the failure path routes through
// handleGenerateTextInternalFailure WITHOUT touching memory.
//
// Expectation: memory stays at baseline length, no entry has content
// "[generation was interrupted]". Fully deterministic — no provider needed,
// no flake from network timing.
async function testAbortDoesNotPersistSentinel(): Promise<boolean | null> {
  logTest("1. Abort path does not persist sentinel into memory", "TESTING");
  const memorySdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      maxSessions: 5,
      enableSummarization: false,
    },
  });
  try {
    const sessionId = generateTestSessionId("abort-pollution");
    const userId = "user-abort-1";

    // Seed a known baseline without needing a provider.
    const seed: ChatMessage[] = [
      makeMessage("user", "What's the capital of France?"),
      makeMessage("assistant", "Paris."),
    ];
    await memorySdk.setSessionMessages(sessionId, seed, userId);

    const beforeMessages = await memorySdk.getSessionMessages(
      sessionId,
      userId,
    );
    const baseline = beforeMessages.length;
    if (baseline !== seed.length) {
      logTest(
        "1. Abort path does not persist sentinel into memory",
        "FAIL",
        `Seed setup failed: expected ${seed.length} messages, got ${baseline}`,
      );
      return false;
    }

    // Pre-aborted signal: guarantees the abort branch runs without ever
    // hitting the provider.
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;

    let sawAbort = false;
    try {
      await memorySdk.generate({
        input: {
          text: "Write a long essay about distributed systems.",
        },
        maxTokens: TEST_CONFIG.maxTokens,
        ...buildBaseSDKOptions(),
        context: { sessionId, userId },
        abortSignal: signal,
      });
    } catch (err) {
      // Discriminate strictly on error shape, not on signal.aborted (which
      // is tautologically true since we pre-aborted at line 222). The SDK
      // must throw a recognisable abort error for this test to be
      // meaningful — anything else is a regression.
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : "";
      const looksLikeAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("timed out");
      if (looksLikeAbort) {
        sawAbort = true;
      } else if (isExpectedProviderError(msg)) {
        logTest(
          "1. Abort path does not persist sentinel into memory",
          "SKIP",
          `Provider unavailable: ${msg}`,
        );
        return null;
      } else {
        // Unexpected error type — surface it; the abort short-circuit should
        // be the first thing that throws.
        throw err;
      }
    }

    if (!sawAbort) {
      logTest(
        "1. Abort path does not persist sentinel into memory",
        "FAIL",
        "Generate did not throw AbortError despite pre-aborted signal — " +
          "abort short-circuit at generateTextInternal start may have regressed",
      );
      return false;
    }

    // Give any background "store turn after abort" a beat to land.
    await new Promise((r) => setTimeout(r, 200));

    const afterMessages = await memorySdk.getSessionMessages(sessionId, userId);

    const sentinelEntries = afterMessages.filter(
      (m) => m.role === "assistant" && m.content === ABORT_SENTINEL,
    );

    if (sentinelEntries.length > 0) {
      logTest(
        "1. Abort path does not persist sentinel into memory",
        "FAIL",
        `Sentinel found ${sentinelEntries.length}x in memory after abort. ` +
          `Memory grew from ${baseline} → ${afterMessages.length} messages. ` +
          `This entry pollutes the next prompt — exact path: ` +
          `handleGenerateTextInternalFailure → storeConversationTurn(content="${ABORT_SENTINEL}").`,
      );
      return false;
    }

    if (afterMessages.length > baseline) {
      logTest(
        "1. Abort path does not persist sentinel into memory",
        "FAIL",
        `Memory grew from ${baseline} → ${afterMessages.length} messages on abort, ` +
          `but no sentinel string. Some other fabricated turn was inserted; inspect ` +
          `${afterMessages
            .slice(baseline)
            .map(
              (m) => `[${m.role}: ${JSON.stringify(m.content).slice(0, 80)}]`,
            )
            .join(", ")}`,
      );
      return false;
    }

    logTest(
      "1. Abort path does not persist sentinel into memory",
      "PASS",
      `Memory unchanged after abort (${afterMessages.length} messages, no sentinel)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "1. Abort path does not persist sentinel into memory",
        "SKIP",
        msg,
      );
      return null;
    }
    logTest("1. Abort path does not persist sentinel into memory", "FAIL", msg);
    return false;
  } finally {
    try {
      await memorySdk.shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #2: Polluted history must be filtered before reaching the provider
// ============================================================
//
// Reproduces Bug 2 in the issue report.
//
// Pre-condition: simulate a session that has accumulated 6 sentinel turns
// from prior aborts — exactly the production shape captured in Langfuse
// traces 926558b5… (SI-071) and 7e90c234… (SI-069) before the user-visible
// failure: 8 {user, "[generation was interrupted]"} pairs preceding the
// current question.
//
// Action: ask a clean follow-up question.
//
// Expectation (post-fix): the model returns a sensible answer, never echoing
// the sentinel verbatim. Equivalently — the prompt builder filtered out the
// sentinel/empty assistant turns before sending them to the provider.
//
// Today: with enough sentinels, instruction-tuned models (Claude Sonnet,
// GPT-4o) reliably treat the pattern as a few-shot example and emit the
// sentinel as the response — the production symptom this suite is built
// around.
async function testPollutedHistoryDoesNotEchoSentinel(): Promise<
  boolean | null
> {
  logTest(
    "2. Polluted history does not propagate sentinel to provider response",
    "TESTING",
  );
  const memorySdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      maxSessions: 5,
      enableSummarization: false,
    },
  });
  try {
    const sessionId = generateTestSessionId("polluted-history");
    const userId = "user-polluted-1";

    // Pre-populate session with the production pollution pattern: alternating
    // user-question / sentinel-assistant pairs. 6 pairs is the lower bound
    // observed in production traces; we use 6 here as the deterministic
    // few-shot dose.
    const polluted: ChatMessage[] = [];
    for (let i = 0; i < 6; i++) {
      polluted.push(
        makeMessage("user", `Earlier question #${i + 1}: what is ${i} + ${i}?`),
        makeMessage("assistant", ABORT_SENTINEL),
      );
    }
    // Add one empty-assistant turn — the second class of pollution this fix
    // must clean up (the existing storeConversationTurn upper-layer guard
    // skips empty turns, but historical Redis sessions may contain them).
    polluted.push(
      makeMessage("user", "Empty-response edge case"),
      makeMessage("assistant", ""),
    );

    await memorySdk.setSessionMessages(sessionId, polluted, userId);

    // Sanity check that the pollution actually landed
    const seeded = await memorySdk.getSessionMessages(sessionId, userId);
    const seededSentinels = seeded.filter(
      (m) => m.role === "assistant" && m.content === ABORT_SENTINEL,
    ).length;
    if (seededSentinels !== 6) {
      logTest(
        "2. Polluted history does not propagate sentinel to provider response",
        "FAIL",
        `Seed failed: expected 6 sentinel turns in memory, got ${seededSentinels}`,
      );
      return false;
    }

    // Now ask a fresh, distinct question. A correctly-built prompt would never
    // include the sentinel turns, so the model should answer normally.
    let response: Awaited<ReturnType<typeof memorySdk.generate>> | undefined;
    try {
      response = await memorySdk.generate({
        input: {
          text: "Forget the prior context. What is the capital of France? Answer with just the city name.",
        },
        maxTokens: 32,
        ...buildBaseSDKOptions(),
        context: { sessionId, userId },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        logTest(
          "2. Polluted history does not propagate sentinel to provider response",
          "SKIP",
          `Provider unavailable: ${msg}`,
        );
        return null;
      }
      throw err;
    }

    const content = (response?.content || "").trim();

    if (content === ABORT_SENTINEL) {
      logTest(
        "2. Polluted history does not propagate sentinel to provider response",
        "FAIL",
        `Model echoed sentinel verbatim — proves polluted history reached the provider. ` +
          `Response.content === "${ABORT_SENTINEL}".`,
      );
      return false;
    }

    if (content.includes(ABORT_SENTINEL)) {
      logTest(
        "2. Polluted history does not propagate sentinel to provider response",
        "FAIL",
        `Model output contains sentinel substring (${content.length} chars): ` +
          `"${content.slice(0, 200)}"`,
      );
      return false;
    }

    // Optional happy-path check: a clean prompt should answer the question.
    // If the model drifted but didn't echo the sentinel, treat it as a soft
    // pass — the bug we care about is sentinel propagation, not answer
    // quality.
    const answeredCorrectly = /paris/i.test(content);
    logTest(
      "2. Polluted history does not propagate sentinel to provider response",
      "PASS",
      answeredCorrectly
        ? `Model answered cleanly ("${content.slice(0, 80)}"); sentinel never reached provider`
        : `Sentinel never reached provider; model returned ${content.length} chars (not Paris but no sentinel either)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "2. Polluted history does not propagate sentinel to provider response",
        "SKIP",
        msg,
      );
      return null;
    }
    logTest(
      "2. Polluted history does not propagate sentinel to provider response",
      "FAIL",
      msg,
    );
    return false;
  } finally {
    try {
      await memorySdk.shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #3: Prompt-builder boundary strips sentinel + empty assistant turns
// ============================================================
//
// Deterministic complement to Test #2 — no LLM call, no flake. Asserts that
// the utility function the generate path uses to assemble the conversation
// portion of the prompt (`getConversationMessages` in
// src/lib/utils/conversationMemory.ts) returns a list with no sentinel and
// no empty-content assistant entries, given a polluted session.
//
// This test fails today because the utility passes the raw stored messages
// straight through. Once the read-time filter is in place, it passes for
// both freshly-aborted sessions (Bug 1 hadn't been fixed yet) and historic
// Redis sessions (already polluted before any fix shipped) — the same
// "self-healing on next read" property the bug report calls out.
async function testPromptBuilderFiltersPollutedTurns(): Promise<
  boolean | null
> {
  logTest(
    "3. getConversationMessages strips sentinel + empty assistant turns",
    "TESTING",
  );
  const memorySdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      maxSessions: 5,
      enableSummarization: false,
    },
  });
  try {
    const sessionId = generateTestSessionId("filter-determ");
    const userId = "user-filter-1";

    const polluted: ChatMessage[] = [
      makeMessage("user", "What is 2 + 2?"),
      makeMessage("assistant", "4"),
      makeMessage("user", "What is 3 + 3?"),
      makeMessage("assistant", ABORT_SENTINEL),
      makeMessage("user", "What is 5 + 5?"),
      makeMessage("assistant", ""),
      makeMessage("user", "What is 7 + 7?"),
      makeMessage("assistant", "   "),
      makeMessage("user", "What is 11 + 11?"),
      makeMessage("assistant", ABORT_SENTINEL),
      makeMessage("user", "Final question"),
    ];

    await memorySdk.setSessionMessages(sessionId, polluted, userId);

    // Reach into the prompt-building boundary the way generate() does.
    // getConversationMessages is the single function called from
    // runStandardGenerateRequest / attemptMCPGeneration to build the
    // conversation portion of the prompt sent to the provider.
    const utilModule =
      (await import("../dist/lib/utils/conversationMemory.js")) as {
        getConversationMessages: (
          memory: unknown,
          options: unknown,
        ) => Promise<ChatMessage[]>;
      };
    const getConversationMessages = utilModule.getConversationMessages;
    if (typeof getConversationMessages !== "function") {
      logTest(
        "3. getConversationMessages strips sentinel + empty assistant turns",
        "FAIL",
        "Internal utility getConversationMessages is not exported from dist build — cannot assert prompt-builder boundary",
      );
      return false;
    }

    // The util reads conversationMemory off the SDK instance. Both private
    // fields exist on the built NeuroLink class; access via cast to keep
    // the test harness type-safe without leaking private types into the SDK.
    const internal = memorySdk as unknown as {
      conversationMemory: unknown;
    };
    const memory = internal.conversationMemory;
    if (!memory) {
      logTest(
        "3. getConversationMessages strips sentinel + empty assistant turns",
        "FAIL",
        "NeuroLink instance has no conversationMemory after setSessionMessages — harness setup is wrong",
      );
      return false;
    }

    const built = await getConversationMessages(memory, {
      provider: TEST_CONFIG.provider,
      context: { sessionId, userId },
      enableSummarization: false,
    });

    const sentinelInBuilt = built.filter(
      (m) => m.role === "assistant" && m.content === ABORT_SENTINEL,
    );
    const emptyInBuilt = built.filter(
      (m) =>
        m.role === "assistant" &&
        typeof m.content === "string" &&
        m.content.trim() === "",
    );

    if (sentinelInBuilt.length > 0 || emptyInBuilt.length > 0) {
      logTest(
        "3. getConversationMessages strips sentinel + empty assistant turns",
        "FAIL",
        `Prompt-builder leaks polluted turns: ${sentinelInBuilt.length} sentinel, ` +
          `${emptyInBuilt.length} empty/whitespace assistant. These reach the provider verbatim.`,
      );
      return false;
    }

    // Confirm valid history is preserved.
    const validAssistant = built.filter(
      (m) => m.role === "assistant" && m.content && m.content.trim() !== "",
    );
    if (validAssistant.length === 0) {
      logTest(
        "3. getConversationMessages strips sentinel + empty assistant turns",
        "FAIL",
        `Filter was overzealous — valid "4" assistant turn was dropped along with the noise. Prompt builder returned ${built.length} messages: ${built
          .map((m) => `[${m.role}:${m.content.slice(0, 20)}]`)
          .join(", ")}`,
      );
      return false;
    }

    logTest(
      "3. getConversationMessages strips sentinel + empty assistant turns",
      "PASS",
      `${built.length} clean messages from ${polluted.length} stored (filtered ${polluted.length - built.length} polluted turns)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(
      "3. getConversationMessages strips sentinel + empty assistant turns",
      "FAIL",
      msg,
    );
    return false;
  } finally {
    try {
      await memorySdk.shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #4: Aborts surface with typed structured fields
// ============================================================
//
// Closes the error-contract gap surfaced by SI-069 / SI-071. Before this
// fix, callers had to message-string match ("operation was aborted",
// "interrupted", etc.) to distinguish user cancellation from real provider
// failures. After the fix, NeuroLink wraps the raw DOMException at the
// generateTextInternal boundary into ErrorFactory.aborted() — adding
// `category=abort`, `code=OPERATION_ABORTED`, `retriable=false` while
// preserving `name="AbortError"` so existing string/name-based detection
// keeps working unchanged. New code branches on the structured fields.
async function testAbortThrowsTypedError(): Promise<boolean | null> {
  logTest("4. Aborts throw typed abort error (category=abort)", "TESTING");
  const memorySdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      maxSessions: 5,
      enableSummarization: false,
    },
  });
  try {
    const sessionId = generateTestSessionId("typed-abort");
    const userId = "user-typed-1";

    const controller = new AbortController();
    controller.abort();

    let caught: unknown = null;
    try {
      await memorySdk.generate({
        input: { text: "Anything." },
        ...buildBaseSDKOptions(),
        context: { sessionId, userId },
        abortSignal: controller.signal,
      });
    } catch (err) {
      caught = err;
    }

    if (!caught) {
      logTest(
        "4. Aborts throw typed abort error (category=abort)",
        "FAIL",
        "Generate did not throw despite pre-aborted signal",
      );
      return false;
    }

    const errAny = caught as {
      name?: string;
      category?: string;
      code?: string;
      retriable?: boolean;
      message?: string;
    };

    // Backwards-compat: name stays "AbortError" so existing
    // `err.name === "AbortError"` consumers keep working unchanged.
    if (errAny.name !== "AbortError") {
      logTest(
        "4. Aborts throw typed abort error (category=abort)",
        "FAIL",
        `Backwards-compat broken: expected name="AbortError", got "${errAny.name}". ` +
          `Callers branching on err.name === "AbortError" will silently fail.`,
      );
      return false;
    }
    // New structured fields — what new code should branch on.
    if (errAny.category !== "abort") {
      logTest(
        "4. Aborts throw typed abort error (category=abort)",
        "FAIL",
        `Expected category="abort", got "${errAny.category}". Callers cannot branch correctly.`,
      );
      return false;
    }
    if (errAny.code !== "OPERATION_ABORTED") {
      logTest(
        "4. Aborts throw typed abort error (category=abort)",
        "FAIL",
        `Expected code="OPERATION_ABORTED", got "${errAny.code}".`,
      );
      return false;
    }
    if (errAny.retriable !== false) {
      logTest(
        "4. Aborts throw typed abort error (category=abort)",
        "FAIL",
        `Aborts must be non-retriable; got retriable=${errAny.retriable}.`,
      );
      return false;
    }

    logTest(
      "4. Aborts throw typed abort error (category=abort)",
      "PASS",
      `name=AbortError (compat), category=abort, code=OPERATION_ABORTED, retriable=false`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("4. Aborts throw typed abort error (category=abort)", "FAIL", msg);
    return false;
  } finally {
    try {
      await memorySdk.shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// TEST #5: Read filter preserves tool-bearing assistant turns
// ============================================================
//
// Regression guard. The read filter must drop sentinel / empty-text
// assistant turns but NEVER drop assistant turns whose surface text is empty
// because the assistant invoked a tool instead of speaking. Dropping those
// would break tool-pair semantics in the next prompt and corrupt
// repairToolPairs invariants.
async function testFilterPreservesToolBearingTurns(): Promise<boolean | null> {
  logTest("5. Read filter preserves tool-bearing assistant turns", "TESTING");
  const memorySdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      maxSessions: 5,
      enableSummarization: false,
    },
  });
  try {
    const sessionId = generateTestSessionId("filter-tool-bearing");
    const userId = "user-tool-1";

    const toolBearingAssistant: ChatMessage = {
      id: "msg-tool",
      role: "assistant",
      content: "", // empty surface text — but had a tool call
      timestamp: nowIso(),
      events: [
        {
          type: "tool:start",
          toolName: "search",
        } as unknown as NonNullable<ChatMessage["events"]>[number],
      ],
    };

    const polluted: ChatMessage[] = [
      makeMessage("user", "Find the weather"),
      toolBearingAssistant,
      makeMessage("user", "Now what?"),
      makeMessage("assistant", ABORT_SENTINEL),
      makeMessage("user", "And next?"),
      makeMessage("assistant", ""),
    ];

    await memorySdk.setSessionMessages(sessionId, polluted, userId);

    const utilModule =
      (await import("../dist/lib/utils/conversationMemory.js")) as {
        getConversationMessages: (
          memory: unknown,
          options: unknown,
        ) => Promise<ChatMessage[]>;
      };
    const internal = memorySdk as unknown as { conversationMemory: unknown };

    const built = await utilModule.getConversationMessages(
      internal.conversationMemory,
      {
        provider: TEST_CONFIG.provider,
        context: { sessionId, userId },
        enableSummarization: false,
      },
    );

    const toolPreserved = built.some(
      (m) =>
        m.role === "assistant" &&
        m.content === "" &&
        Array.isArray(m.events) &&
        m.events.some(
          (e) =>
            (e as { type?: string }).type === "tool:start" ||
            (e as { type?: string }).type === "tool:end",
        ),
    );

    const sentinelDropped = !built.some(
      (m) => m.role === "assistant" && m.content === ABORT_SENTINEL,
    );
    const plainEmptyDropped = !built.some(
      (m) =>
        m.role === "assistant" &&
        m.content === "" &&
        (!Array.isArray(m.events) || m.events.length === 0),
    );

    if (!toolPreserved) {
      logTest(
        "5. Read filter preserves tool-bearing assistant turns",
        "FAIL",
        "Tool-bearing assistant turn (empty content + tool:start event) was incorrectly dropped — would break repairToolPairs",
      );
      return false;
    }
    if (!sentinelDropped) {
      logTest(
        "5. Read filter preserves tool-bearing assistant turns",
        "FAIL",
        "Filter failed to drop sentinel turn",
      );
      return false;
    }
    if (!plainEmptyDropped) {
      logTest(
        "5. Read filter preserves tool-bearing assistant turns",
        "FAIL",
        "Filter failed to drop plain empty assistant turn (no tool events)",
      );
      return false;
    }

    logTest(
      "5. Read filter preserves tool-bearing assistant turns",
      "PASS",
      `${built.length} returned: tool-bearing kept, sentinel + empty dropped`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(
      "5. Read filter preserves tool-bearing assistant turns",
      "FAIL",
      msg,
    );
    return false;
  } finally {
    try {
      await memorySdk.shutdown?.();
    } catch {
      /* ignore */
    }
  }
}

// ============================================================
// SUITE RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\n🐛 NeuroLink Continuous Test Suite: Session Memory Bugs", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );
  log(`   Sentinel under test: "${ABORT_SENTINEL}"`, "cyan");

  // Prerequisite checks
  const fs = await import("fs");
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    {
      name: "1. Abort path does not persist sentinel into memory",
      fn: testAbortDoesNotPersistSentinel,
    },
    {
      name: "2. Polluted history does not propagate sentinel to provider response",
      fn: testPollutedHistoryDoesNotEchoSentinel,
    },
    {
      name: "3. getConversationMessages strips sentinel + empty assistant turns",
      fn: testPromptBuilderFiltersPollutedTurns,
    },
    {
      name: "4. Aborts throw typed abort error (category=abort)",
      fn: testAbortThrowsTypedError,
    },
    {
      name: "5. Read filter preserves tool-bearing assistant turns",
      fn: testFilterPreservesToolBearingTurns,
    },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;
  testResults.forEach((t) => {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  });
  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        `Usage: npx tsx test/continuous-test-suite-session-memory-bugs.ts [--provider=X] [--model=Y]

Reproduces conversation-memory pollution bugs (Curator SI-069 / SI-071).

Options:
  --provider=X    AI provider (default: openai)
  --model=Y       Model name (default: provider default)
  --help          Show this help

Environment Variables:
  TEST_PROVIDER   Default provider
  TEST_MODEL      Default model`,
      );
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 1024;
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: Session Memory Bugs", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}
