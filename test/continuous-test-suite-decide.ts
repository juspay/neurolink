#!/usr/bin/env tsx
import "dotenv/config";

// Patches globalThis.fetch before any test runs, so section 6's session-signal
// test can read the outbound decision request. ES imports are hoisted, so this
// runs after dist/ has loaded; it works because fetch is resolved at request
// time (same usage as continuous-test-suite-context.ts's issue-02 tests).
import { installFetchCapture } from "./helpers/fetchCapture.js";
const fetchCapture = installFetchCapture();

/**
 * Continuous Test Suite — the `decide` inference type (TypeSafe / Jev)
 *
 * `decide` is the third inference type, alongside `generate` and `stream`. A
 * decision model takes one `state` plus typed questions and returns typed,
 * calibrated answers — no text. NeuroLink uses it for model routing the moment
 * a decision provider's key is set, and must behave exactly as it did before
 * when that key is absent, wrong, or the service is unreachable.
 *
 * Strategy: drive the PUBLIC surface only — `neurolink.decide()`,
 * `tryDecide()`, the reader helpers, the descriptor discriminator and
 * `ClassifierRouter` — all imported from `../dist/index.js`, never from
 * `src/lib/`, so this exercises the copy callers actually load (CLAUDE.md
 * rule 15, "one module graph per suite").
 *
 * Live tests skip without the key of the provider they exercise. The
 * degradation and discriminator tests do NOT skip: "behaves correctly with no
 * key" and "a text-less provider is unreachable from generation" are the
 * contracts that matter most, and neither needs a key.
 *
 * ⚠️ Assertion messages here never interpolate a response payload. `test()`
 * downgrades a throw to SKIP when the message looks like a provider error, so
 * quoting a body containing e.g. "502" turns a real failure green.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-decide.ts
 *      pnpm run test:decide
 */

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import {
  AIProviderName,
  buildModelCatalog,
  buildRegistryIndex,
  CLASSIFIER_CONTEXT_SCOPES,
  ClassifierRouter,
  contextScopeToThreshold,
  DECISION_PROVIDERS,
  decideSearchPlan,
  DEFAULT_COMPACTION_THRESHOLD,
  decisionBooleanConfidence,
  decisionKey,
  enrichCandidate,
  estimateDecisionStateTokens,
  gateDecisionBoolean,
  NeuroLink,
  PROVIDER_DESCRIPTORS_BY_NAME,
  rankCatalogue,
  readDecisionBoolean,
  readDecisionChoice,
  readDecisionScore,
  renderCandidate,
  resolveDefaultDecisionProvider,
  resolveHistoryBudget,
  selectIrrelevantMessages,
  selectServersByDecision,
  servesInferenceKind,
  summaryPreservesContext,
  TYPESAFE_MAX_STATE_TOKENS,
} from "../dist/index.js";
import type {
  DecisionAfterEvent,
  DecisionBeforeEvent,
  DecisionHookAnswersContext,
  DecisionHookContext,
  DecisionQuestionMap,
} from "../dist/index.js";
import { defineSuite, delay, logSection, runCLI } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { flatPng } from "./helpers/flatPng.js";

assertDistFresh();

const { test, runSuite } = defineSuite("decide inference type (TypeSafe/Jev)", {
  perTestTimeoutMs: 90_000,
});

const REAL_KEY = process.env.TYPESAFE_API_KEY;
const HAS_KEY = typeof REAL_KEY === "string" && REAL_KEY.trim() !== "";

// There are TWO keys that configure a decision provider, not one. Every
// "nothing is configured" test below has to clear both, because transport
// resolution falls back to the gateway when only the gateway key is present —
// so a suite run with AI_GATEWAY_API_KEY in the ambient environment would
// otherwise find a working provider in exactly the tests asserting there
// isn't one, and eight degradation tests would fail for the wrong reason.
const REAL_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY;
// Laya's key configures a decision provider as well. A developer's .env
// holding it would otherwise hand every "nothing is configured" test a working
// provider, exactly as the gateway key would.
const REAL_LAYA_KEY = process.env.LAYA_API_KEY;
const HAS_LAYA_KEY =
  typeof REAL_LAYA_KEY === "string" && REAL_LAYA_KEY.trim() !== "";
// Laya has no built-in endpoint, so its live tests also need LAYA_BASE_URL.
const REAL_LAYA_BASE_URL = process.env.LAYA_BASE_URL;
const HAS_LAYA_BASE_URL =
  typeof REAL_LAYA_BASE_URL === "string" && REAL_LAYA_BASE_URL.trim() !== "";
// XOR's key configures a decision provider too, and like Laya it has no
// built-in endpoint, so its live tests also need XOR_BASE_URL.
const REAL_XOR_KEY = process.env.XOR_API_KEY;
const HAS_XOR_KEY =
  typeof REAL_XOR_KEY === "string" && REAL_XOR_KEY.trim() !== "";
const REAL_XOR_BASE_URL = process.env.XOR_BASE_URL;
const HAS_XOR_BASE_URL =
  typeof REAL_XOR_BASE_URL === "string" && REAL_XOR_BASE_URL.trim() !== "";
// Perplexity's Decisions API reads PERPLEXITY_API_KEY, the same key the
// `perplexity` text provider reads, so an ambient key from a developer's .env
// configures a decision provider here too. It has a public endpoint, so the key
// alone is enough and every "nothing is configured" test must blank it.
const REAL_PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const HAS_PERPLEXITY_KEY =
  typeof REAL_PERPLEXITY_KEY === "string" && REAL_PERPLEXITY_KEY.trim() !== "";
const REAL_PERPLEXITY_DECIDER_BASE_URL =
  process.env.PERPLEXITY_DECIDER_BASE_URL;
const REAL_PERPLEXITY_DECIDER_MODEL = process.env.PERPLEXITY_DECIDER_MODEL;
// Cloudflare Clef reads CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID, the same
// two the `cloudflare` Workers AI text provider reads, so an ambient pair from
// a developer's .env configures a decision provider here too (last in the
// order). Both are needed, and every "nothing is configured" test must blank
// both.
const REAL_CLOUDFLARE_KEY = process.env.CLOUDFLARE_API_KEY;
const REAL_CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const HAS_CLOUDFLARE_CLEF =
  typeof REAL_CLOUDFLARE_KEY === "string" &&
  REAL_CLOUDFLARE_KEY.trim() !== "" &&
  typeof REAL_CLOUDFLARE_ACCOUNT_ID === "string" &&
  REAL_CLOUDFLARE_ACCOUNT_ID.trim() !== "";
const REAL_CLOUDFLARE_CLEF_BASE_URL = process.env.CLOUDFLARE_CLEF_BASE_URL;
const REAL_CLOUDFLARE_CLEF_MODEL = process.env.CLOUDFLARE_CLEF_MODEL;
// Section 19 reads LAYA_MODEL as an input to model resolution, so it is
// saved and restored like the keys rather than deleted outright.
const REAL_LAYA_MODEL = process.env.LAYA_MODEL;
// The model the registry recorded for laya: LAYA_MODEL as it read at
// registration, else the default. The registry reads it once, so a test
// that merely deletes LAYA_MODEL mid-run does not change what was already
// registered — asserting against this instead of a hardcoded literal keeps
// these tests correct on a machine or CI job that sets LAYA_MODEL.
const EXPECTED_LAYA_MODEL = process.env.LAYA_MODEL?.trim() || "typed-decisions";
// The model the registry recorded for xor: XOR_MODEL as it read at
// registration, else the default. Never deleted, so this stays the truth.
const EXPECTED_XOR_MODEL = process.env.XOR_MODEL || "xor-1.1";

function restoreEnv(): void {
  if (HAS_KEY) {
    process.env.TYPESAFE_API_KEY = REAL_KEY;
  } else {
    delete process.env.TYPESAFE_API_KEY;
  }
  if (REAL_GATEWAY_KEY !== undefined) {
    process.env.AI_GATEWAY_API_KEY = REAL_GATEWAY_KEY;
  } else {
    delete process.env.AI_GATEWAY_API_KEY;
  }
  if (REAL_LAYA_KEY !== undefined) {
    process.env.LAYA_API_KEY = REAL_LAYA_KEY;
  } else {
    delete process.env.LAYA_API_KEY;
  }
  if (REAL_LAYA_BASE_URL !== undefined) {
    process.env.LAYA_BASE_URL = REAL_LAYA_BASE_URL;
  } else {
    delete process.env.LAYA_BASE_URL;
  }
  if (REAL_XOR_KEY !== undefined) {
    process.env.XOR_API_KEY = REAL_XOR_KEY;
  } else {
    delete process.env.XOR_API_KEY;
  }
  if (REAL_XOR_BASE_URL !== undefined) {
    process.env.XOR_BASE_URL = REAL_XOR_BASE_URL;
  } else {
    delete process.env.XOR_BASE_URL;
  }
  if (REAL_PERPLEXITY_KEY !== undefined) {
    process.env.PERPLEXITY_API_KEY = REAL_PERPLEXITY_KEY;
  } else {
    delete process.env.PERPLEXITY_API_KEY;
  }
  if (REAL_PERPLEXITY_DECIDER_BASE_URL !== undefined) {
    process.env.PERPLEXITY_DECIDER_BASE_URL = REAL_PERPLEXITY_DECIDER_BASE_URL;
  } else {
    delete process.env.PERPLEXITY_DECIDER_BASE_URL;
  }
  if (REAL_PERPLEXITY_DECIDER_MODEL !== undefined) {
    process.env.PERPLEXITY_DECIDER_MODEL = REAL_PERPLEXITY_DECIDER_MODEL;
  } else {
    delete process.env.PERPLEXITY_DECIDER_MODEL;
  }
  if (REAL_CLOUDFLARE_KEY !== undefined) {
    process.env.CLOUDFLARE_API_KEY = REAL_CLOUDFLARE_KEY;
  } else {
    delete process.env.CLOUDFLARE_API_KEY;
  }
  if (REAL_CLOUDFLARE_ACCOUNT_ID !== undefined) {
    process.env.CLOUDFLARE_ACCOUNT_ID = REAL_CLOUDFLARE_ACCOUNT_ID;
  } else {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  }
  if (REAL_CLOUDFLARE_CLEF_BASE_URL !== undefined) {
    process.env.CLOUDFLARE_CLEF_BASE_URL = REAL_CLOUDFLARE_CLEF_BASE_URL;
  } else {
    delete process.env.CLOUDFLARE_CLEF_BASE_URL;
  }
  if (REAL_CLOUDFLARE_CLEF_MODEL !== undefined) {
    process.env.CLOUDFLARE_CLEF_MODEL = REAL_CLOUDFLARE_CLEF_MODEL;
  } else {
    delete process.env.CLOUDFLARE_CLEF_MODEL;
  }
  if (REAL_LAYA_MODEL !== undefined) {
    process.env.LAYA_MODEL = REAL_LAYA_MODEL;
  } else {
    delete process.env.LAYA_MODEL;
  }
}

/**
 * Remove every setting that would configure a decision provider, including
 * LAYA_BASE_URL, which Laya needs alongside its key, and PERPLEXITY_API_KEY,
 * which the `perplexity` text provider shares. The Perplexity base URL and
 * model overrides go too, so a developer's own endpoint or model never decides
 * what a keyless test sees.
 */
function clearDecisionKeys(): void {
  delete process.env.TYPESAFE_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.LAYA_API_KEY;
  delete process.env.LAYA_BASE_URL;
  delete process.env.XOR_API_KEY;
  delete process.env.XOR_BASE_URL;
  delete process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_DECIDER_BASE_URL;
  delete process.env.PERPLEXITY_DECIDER_MODEL;
  delete process.env.CLOUDFLARE_API_KEY;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_CLEF_BASE_URL;
  delete process.env.CLOUDFLARE_CLEF_MODEL;
  delete process.env.LAYA_MODEL;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requireKey(): void {
  if (!HAS_KEY) {
    throw new Error("SKIP: TYPESAFE_API_KEY not set");
  }
}

function requireXorKey(): void {
  if (!HAS_XOR_KEY) {
    throw new Error("SKIP: XOR_API_KEY not set");
  }
  if (!HAS_XOR_BASE_URL) {
    throw new Error("SKIP: XOR_BASE_URL not set");
  }
}

function requirePerplexityKey(): void {
  if (!HAS_PERPLEXITY_KEY) {
    throw new Error("SKIP: PERPLEXITY_API_KEY not set");
  }
}

function requireCloudflareClef(): void {
  if (!HAS_CLOUDFLARE_CLEF) {
    throw new Error(
      "SKIP: CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID not set",
    );
  }
}

function requireLayaKey(): void {
  if (!HAS_LAYA_KEY) {
    throw new Error("SKIP: LAYA_API_KEY not set");
  }
  if (!HAS_LAYA_BASE_URL) {
    throw new Error("SKIP: LAYA_BASE_URL not set");
  }
}

/** Narrows a `JSON.parse` result enough to read named fields off it. */
function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SUPPORT_TICKET =
  "Hi, my Stripe payouts have been failing for three days. I am losing sales " +
  "every hour and nobody has replied to my emails. I need this fixed today.";

const ALL_THREE = {
  urgent: {
    type: "boolean",
    instructions: "Does this message express urgency?",
  },
  team: {
    type: "choice",
    instructions: "Which team should handle this message?",
    criteria: {
      billing: "Payments, invoicing, refunds",
      technical: "Bugs, outages, integrations",
      sales: "Pricing, upgrades, new accounts",
    },
  },
  frustration: {
    type: "score",
    instructions: "How frustrated is the sender?",
    criteria: ["Calm", "Mildly annoyed", "Clearly frustrated", "Furious"],
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
logSection("1. The inference-kind discriminator");
// ───────────────────────────────────────────────────────────────────────────

await test("1.1 — typesafe declares decide and only decide", async () => {
  const descriptor = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.TYPESAFE);
  assert(descriptor !== undefined, "typesafe has no registered descriptor");
  assert(
    servesInferenceKind(descriptor!, "decide"),
    "typesafe must declare the decide inference kind",
  );
  assert(
    !servesInferenceKind(descriptor!, "generate"),
    "a model that emits no text must not declare generate",
  );
  assert(
    !servesInferenceKind(descriptor!, "stream"),
    "a model that emits no text must not declare stream",
  );
});

await test("1.2 — text providers keep their meaning without declaring anything", async () => {
  const openai = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.OPENAI);
  assert(openai !== undefined, "openai has no registered descriptor");
  assert(
    servesInferenceKind(openai!, "generate") &&
      servesInferenceKind(openai!, "stream"),
    "an undeclared descriptor must still default to generate + stream",
  );
  assert(
    !servesInferenceKind(openai!, "decide"),
    "a text provider must not be treated as a decision provider",
  );
});

await test("1.3 — a decision provider is excluded from generation fallback chains", async () => {
  const descriptor = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.TYPESAFE);
  // These three ranks are what put a provider into auto-select and the health
  // sweep. A provider that cannot generate text must carry none of them.
  assert(
    descriptor?.autoSelectPriority === undefined,
    "a decision provider must not join the auto-select fallback chain",
  );
  assert(
    descriptor?.autoSelectPreference === undefined,
    "a decision provider must not be auto-selectable",
  );
  assert(
    descriptor?.defaultHealthSweepPriority === undefined,
    "a decision provider must not join the generation health sweep",
  );
  assert(
    descriptor?.healthCheck !== "live-generate",
    "a decision provider cannot answer a live-generate health probe",
  );
});

await test("1.4 — DECISION_PROVIDERS is derived, not hand-maintained", async () => {
  assert(
    DECISION_PROVIDERS.some((d) => d.name === AIProviderName.TYPESAFE),
    "typesafe must appear in the derived decision-provider list",
  );
  assert(
    DECISION_PROVIDERS.every((d) => servesInferenceKind(d, "decide")),
    "every entry must actually declare the decide kind",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("2. Activation — a key is the only switch");
// ───────────────────────────────────────────────────────────────────────────

await test("2.1 — no key ⇒ no default decision provider", async () => {
  clearDecisionKeys();
  assert(
    resolveDefaultDecisionProvider() === undefined,
    "no decision provider may resolve when no key is set",
  );
  restoreEnv();
});

await test("2.2 — key present ⇒ typesafe resolves as the default", async () => {
  process.env.TYPESAFE_API_KEY = "apikey_placeholder_for_resolution";
  assert(
    resolveDefaultDecisionProvider() === "typesafe",
    "a configured key must make typesafe the default decision provider",
  );
  restoreEnv();
});

await test("2.3 — blank key is treated as absent", async () => {
  // Both credentials have to be blanked: either one alone configures a
  // provider, so leaving the gateway key set would make this pass or fail on
  // the ambient environment rather than on the thing being asserted.
  clearDecisionKeys();
  process.env.TYPESAFE_API_KEY = "   ";
  assert(
    resolveDefaultDecisionProvider() === undefined,
    "a whitespace-only key must not count as configured",
  );
  clearDecisionKeys();
  process.env.AI_GATEWAY_API_KEY = "   ";
  assert(
    resolveDefaultDecisionProvider() === undefined,
    "a whitespace-only gateway key must not count as configured either",
  );
  restoreEnv();
});

// ───────────────────────────────────────────────────────────────────────────
logSection("3. Live evaluation — the three primitives");
// ───────────────────────────────────────────────────────────────────────────

await test("3.1 — one call answers boolean, choice and score together", async () => {
  requireKey();
  restoreEnv();
  const result = await new NeuroLink().decide({
    state: SUPPORT_TICKET,
    questions: ALL_THREE,
  });

  assert(
    Object.keys(result.answers).length === 3,
    "expected exactly one answer per question",
  );
  assert(
    result.model.startsWith("jev-"),
    "response did not report a resolved jev model id",
  );
  assert(result.provider === "typesafe", "result did not name its provider");
  assert(result.usage.inputTokens > 0, "usage.input_tokens was not mapped");
  assert(result.latencyMs > 0, "latencyMs was not measured");

  const urgent = readDecisionBoolean(result.answers, "urgent");
  assert(urgent !== undefined, "boolean answer was not readable");
  assert(urgent! >= 0 && urgent! <= 1, "a probability must be in 0..1");

  const team = readDecisionChoice(result.answers, "team");
  assert(team !== undefined, "choice answer was not readable");
  assert(
    Object.keys(team!.probabilities).length === 3,
    "choice probabilities must cover every option offered",
  );
  const total = Object.values(team!.probabilities).reduce((a, b) => a + b, 0);
  assert(Math.abs(total - 1) < 0.05, "choice probabilities must sum to ~1");

  const frustration = readDecisionScore(result.answers, "frustration");
  assert(frustration !== undefined, "score answer was not readable");
  assert(
    frustration!.score >= 0 && frustration!.score <= 3,
    "score must fall inside the 0-based index range of its rubric",
  );
  assert(
    Object.keys(frustration!.legend).length === 4,
    "score legend must map every rubric level back by index",
  );
});

await test("3.2 — a choice answer is also a ranking", async () => {
  requireKey();
  restoreEnv();
  const result = await new NeuroLink().decide({
    state: SUPPORT_TICKET,
    questions: ALL_THREE,
  });
  const team = readDecisionChoice(result.answers, "team");
  assert(team !== undefined, "choice answer was not readable");
  assert(
    team!.ranked.length === 3,
    "the ranking must cover every option offered",
  );
  assert(
    team!.ranked[0].name === team!.choice,
    "the top of the ranking must be the reported winner",
  );
  for (let i = 1; i < team!.ranked.length; i++) {
    assert(
      team!.ranked[i - 1].probability >= team!.ranked[i].probability,
      "the ranking must be ordered by descending probability",
    );
  }
});

await test("3.3 — the model actually answers sensibly", async () => {
  requireKey();
  restoreEnv();
  const result = await new NeuroLink().decide({
    state: SUPPORT_TICKET,
    questions: ALL_THREE,
  });
  // A payments outage described as losing sales hourly is unambiguous. If a
  // decision model cannot get this right, wiring it into routing is unjustified.
  assert(
    (readDecisionBoolean(result.answers, "urgent") ?? 0) > 0.5,
    "an explicitly time-critical message was not judged urgent",
  );
  assert(
    readDecisionChoice(result.answers, "team")?.choice === "billing",
    "a payouts/Stripe failure was not routed to the billing option",
  );
  assert(
    (readDecisionScore(result.answers, "frustration")?.score ?? 0) > 1,
    "a customer threatening to leave did not score above mild annoyance",
  );
});

await test("3.4 — readers are type-safe, not casts", async () => {
  requireKey();
  restoreEnv();
  const result = await new NeuroLink().decide({
    state: SUPPORT_TICKET,
    questions: ALL_THREE,
  });
  assert(
    readDecisionBoolean(result.answers, "does_not_exist") === undefined,
    "reading an unknown id must yield undefined",
  );
  assert(
    readDecisionBoolean(result.answers, "team") === undefined,
    "reading a choice answer as a boolean must yield undefined",
  );
  assert(
    readDecisionChoice(result.answers, "urgent") === undefined,
    "reading a boolean answer as a choice must yield undefined",
  );
  assert(
    readDecisionScore(result.answers, "team") === undefined,
    "reading a choice answer as a score must yield undefined",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("4. Batching economics — the rule every call site depends on");
// ───────────────────────────────────────────────────────────────────────────

await test("4.1 — 40 questions cost about the same as 1", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const build = (n: number) =>
    Object.fromEntries(
      Array.from({ length: n }, (_, i) => [
        `q${i}`,
        {
          type: "boolean" as const,
          instructions: `Is consideration number ${i} relevant to this message?`,
        },
      ]),
    );

  // Warm the connection; a cold TLS handshake would swamp the signal.
  await nl.decide({ state: SUPPORT_TICKET, questions: build(1) });

  const one = await nl.decide({ state: SUPPORT_TICKET, questions: build(1) });
  const many = await nl.decide({ state: SUPPORT_TICKET, questions: build(40) });

  assert(
    Object.keys(many.answers).length === 40,
    "a 40-question batch did not return 40 answers",
  );
  // Measured at ~70ms extra for 399 extra questions. 4x single-question
  // latency is a loose bound that still fails if batching turns linear —
  // which would invalidate the design of every decision call site.
  assert(
    many.latencyMs < Math.max(one.latencyMs * 4, 3000),
    "batched questions scaled like separate calls; the fan-out assumption no longer holds",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("5. Graceful degradation — the contract that matters most");
// ───────────────────────────────────────────────────────────────────────────

await test("5.1 — tryDecide() returns null with no provider configured", async () => {
  clearDecisionKeys();
  const result = await new NeuroLink().tryDecide({
    state: "anything",
    questions: { q: { type: "boolean", instructions: "Is this true?" } },
  });
  assert(result === null, "tryDecide() must return null rather than throw");
  restoreEnv();
});

await test("5.2 — decide() throws a clear error with no provider configured", async () => {
  clearDecisionKeys();
  let message = "";
  try {
    await new NeuroLink().decide({
      state: "anything",
      questions: { q: { type: "boolean", instructions: "Is this true?" } },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }
  assert(
    message.toLowerCase().includes("no decision provider"),
    "the unconfigured error must say no decision provider is available",
  );
  restoreEnv();
});

await test("5.3 — a rejected key classifies as authentication", async () => {
  let kind: string | undefined;
  try {
    await new NeuroLink().decide({
      state: "anything",
      questions: { q: { type: "boolean", instructions: "Is this true?" } },
      provider: "typesafe",
      credentials: { typesafe: { apiKey: "apikey_definitely_not_valid" } },
    });
  } catch (error) {
    kind = (error as { cause?: { kind?: string } }).cause?.kind;
  }
  assert(
    kind === "authentication",
    "a bad key must classify as authentication",
  );
});

await test("5.4 — tryDecide() swallows a rejected key", async () => {
  const result = await new NeuroLink().tryDecide({
    state: "anything",
    questions: { q: { type: "boolean", instructions: "Is this true?" } },
    provider: "typesafe",
    credentials: { typesafe: { apiKey: "apikey_definitely_not_valid" } },
  });
  assert(result === null, "a rejected key must degrade to null, not throw");
});

await test("5.5 — an oversized state is classified, not thrown raw", async () => {
  requireKey();
  restoreEnv();
  let kind: string | undefined;
  let message = "";
  try {
    await new NeuroLink().decide({
      // Comfortably past the measured ~33,000-token state ceiling.
      state: "The quick brown fox jumps over the lazy dog. ".repeat(6000),
      questions: { q: { type: "boolean", instructions: "Any animals here?" } },
    });
  } catch (error) {
    kind = (error as { cause?: { kind?: string } }).cause?.kind;
    message = error instanceof Error ? error.message : "";
  }
  assert(
    kind === "max_tokens_exceeded",
    "an oversized state must classify as max_tokens_exceeded",
  );
  // The API returns this one with no message at all, so the provider must
  // supply one — an empty string here means a caller gets `undefined`.
  assert(
    message.includes(String(TYPESAFE_MAX_STATE_TOKENS)),
    "the size error must state the actual token budget",
  );
});

await test("5.6 — generating text on a decision provider fails clearly", async () => {
  restoreEnv();
  let message = "";
  try {
    await new NeuroLink().generate({
      input: { text: "hello" },
      provider: "typesafe",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }
  assert(message.length > 0, "generate() on a decision provider must fail");
  assert(
    /decision-only|does not override generate|cannot generate text/i.test(
      message,
    ),
    "the failure must explain that this provider generates no text",
  );
});

await test("5.7 — booleanConfidence maps distance from a coin flip", async () => {
  assert(
    decisionBooleanConfidence(0.5) === 0,
    "an even split must carry zero confidence",
  );
  assert(
    decisionBooleanConfidence(1) === 1,
    "certainty of yes must be full confidence",
  );
  assert(
    decisionBooleanConfidence(0) === 1,
    "certainty of no must be full confidence",
  );
  assert(
    Math.abs(decisionBooleanConfidence(0.75) - 0.5) < 1e-9,
    "0.75 must map to half confidence",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("6. Classifier routing — auto-upgrade and silent fallback");
// ───────────────────────────────────────────────────────────────────────────

const POOL = [
  {
    provider: "google-ai",
    model: "gemini-2.5-flash",
    id: "fast",
    description: "Cheap and fast; rote edits and simple lookups",
    cost: 1,
    quality: 2,
  },
  {
    provider: "anthropic",
    model: "claude-opus-5",
    id: "deep",
    description: "Most capable; architecture and subtle correctness work",
    cost: 20,
    quality: 10,
  },
];

const HARD_PROMPT =
  "Our payment reconciliation job double-charges roughly 1 in 50000 customers " +
  "under concurrent retries. Find the race and design a production-safe fix.";

await test("6.1 — without a key the router uses the heuristic", async () => {
  clearDecisionKeys();
  const nl = new NeuroLink();
  const router = new ClassifierRouter(
    { enabled: true, pool: POOL },
    { decide: (o) => nl.tryDecide(o) },
  );
  const decision = await router.route({ prompt: HARD_PROMPT });
  assert(decision !== null, "the router must still produce a decision");
  assert(
    decision!.reason?.startsWith("heuristic") === true,
    "with no key the router must fall back to the heuristic strategy",
  );
  restoreEnv();
});

await test("6.2 — with a key the router upgrades to the decision model", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const router = new ClassifierRouter(
    { enabled: true, pool: POOL },
    { decide: (o) => nl.tryDecide(o) },
  );
  const decision = await router.route({ prompt: HARD_PROMPT });
  assert(decision !== null, "the router must produce a decision");
  assert(
    decision!.reason?.startsWith("jev") === true,
    "a configured key must select the jev strategy without any code change",
  );
  assert(
    decision!.difficulty === "hard" || decision!.difficulty === "expert",
    "a concurrency bug in payment code must classify as hard or harder",
  );
  assert(
    decision!.model === "claude-opus-5",
    "a hard task must route to the most capable pool member",
  );
});

await test("6.3 — an invalid key degrades silently to the heuristic", async () => {
  process.env.TYPESAFE_API_KEY = "apikey_definitely_not_valid";
  const nl = new NeuroLink();
  const router = new ClassifierRouter(
    { enabled: true, pool: POOL },
    { decide: (o) => nl.tryDecide(o) },
  );
  const decision = await router.route({ prompt: HARD_PROMPT });
  assert(decision !== null, "a broken key must never block routing");
  assert(
    decision!.reason?.startsWith("heuristic") === true,
    "a rejected key must fall through to the heuristic, not surface an error",
  );
  restoreEnv();
});

await test("6.4 — no injected decide fn ⇒ heuristic, even with a key", async () => {
  requireKey();
  restoreEnv();
  // A host that never wires the decision caller must not silently get one.
  const router = new ClassifierRouter({ enabled: true, pool: POOL }, {});
  const decision = await router.route({ prompt: HARD_PROMPT });
  assert(
    decision!.reason?.startsWith("heuristic") === true,
    "without an injected decide fn the router must stay on the heuristic",
  );
});

await test("6.5 — an unreachable confidence bar defers to the heuristic", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const router = new ClassifierRouter(
    {
      enabled: true,
      classifier: "jev",
      minUpgradeConfidence: 1.01,
      minDowngradeConfidence: 1.01,
      pool: POOL,
    },
    { decide: (o) => nl.tryDecide(o) },
  );
  const decision = await router.route({ prompt: HARD_PROMPT });
  assert(decision !== null, "the router must still decide");
  assert(
    decision!.reason?.includes("below the") === true,
    "an unreachable confidence floor must trigger the heuristic fallback path",
  );
});

await test("6.6 — the routing state carries session continuity signals but never the raw session id", async () => {
  requireKey();
  restoreEnv();
  fetchCapture.reset();
  const nl = new NeuroLink();
  const router = new ClassifierRouter(
    { enabled: true, pool: POOL },
    { decide: (o) => nl.tryDecide(o) },
  );
  // A marker distinctive enough that an accidental substring match (e.g.
  // inside the prompt) cannot produce a false pass.
  const RAW_SESSION_ID = "sess_do_not_leak_7f2c9a1e";
  const decision = await router.route({
    prompt: HARD_PROMPT,
    sessionId: RAW_SESSION_ID,
    sessionBound: true,
    priorMessageCount: 7,
  });
  assert(decision !== null, "the router must still produce a decision");

  const jevDispatches = fetchCapture
    .forHostname("typesafe.ai")
    .filter((d) => d.method === "POST" && typeof d.bodyText === "string");
  assert(jevDispatches.length > 0, "no outbound decision request was observed");

  let statesChecked = 0;
  for (const dispatch of jevDispatches) {
    const bodyText = dispatch.bodyText!;
    assert(
      !bodyText.includes(RAW_SESSION_ID),
      "the raw session id must never appear in the outbound decision request",
    );
    const parsed: unknown = JSON.parse(bodyText);
    const state = isRecordLike(parsed) ? parsed.state : undefined;
    if (!isRecordLike(state)) {
      continue;
    }
    statesChecked += 1;
    assert(
      state.session_bound === true,
      "the decision request state is missing session_bound",
    );
    assert(
      state.prior_messages === 7,
      "the decision request state is missing prior_messages",
    );
  }
  // Without this, a capture that saw no structured state would pass having
  // asserted nothing about the continuity fields.
  assert(
    statesChecked > 0,
    "no captured decision request carried a structured state to inspect",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("7. Context budget — the threshold may only ever shrink");
// ───────────────────────────────────────────────────────────────────────────

await test("7.1 — the scope rubric never maps above the default", async () => {
  // The invariant the whole feature rests on. Growing a budget is not a
  // degraded outcome but an unrecoverable one: an oversized request throws a
  // context_window error, which ModelPool records as a PERMANENT cooldown.
  for (let index = 0; index < CLASSIFIER_CONTEXT_SCOPES.length; index++) {
    const threshold = contextScopeToThreshold(index);
    assert(
      threshold <= DEFAULT_COMPACTION_THRESHOLD,
      `scope index ${index} maps above the default compaction threshold`,
    );
    assert(threshold > 0, `scope index ${index} maps to a non-positive budget`);
  }
});

await test("7.2 — out-of-range and fractional scores clamp, never throw", async () => {
  // A score answer is probability-weighted and lands BETWEEN levels, so the
  // mapping is fed non-integers by construction.
  for (const score of [-5, -0.4, 0.5, 1.5, 2.49, 99, Number.NaN]) {
    const threshold = contextScopeToThreshold(score);
    assert(
      threshold > 0 && threshold <= DEFAULT_COMPACTION_THRESHOLD,
      `score ${score} produced a threshold outside the permitted band`,
    );
  }
});

await test("7.3 — the rubric is ordered: narrower scope, smaller budget", async () => {
  let previous = 0;
  for (let index = 0; index < CLASSIFIER_CONTEXT_SCOPES.length; index++) {
    const threshold = contextScopeToThreshold(index);
    assert(
      threshold >= previous,
      `scope index ${index} is not monotonically wider than its predecessor`,
    );
    previous = threshold;
  }
});

await test("7.4 — the default threshold reproduces the previous history budget exactly", async () => {
  // Regression guard on the scale factor. Anything that changes the number a
  // default-configured caller gets is a silent behaviour change to every
  // existing deployment, not a new feature.
  const budget = {
    withinBudget: false,
    estimatedInputTokens: 150_000,
    availableInputTokens: 180_000,
    usageRatio: 0.83,
    shouldCompact: true,
    breakdown: {
      systemPrompt: 2_000,
      conversationHistory: 140_000,
      currentPrompt: 500,
      toolDefinitions: 7_000,
      fileAttachments: 500,
    },
  };
  const unscaled = resolveHistoryBudget(budget);
  assert(
    resolveHistoryBudget(budget, DEFAULT_COMPACTION_THRESHOLD) === unscaled,
    "passing the default threshold changed the history budget",
  );
  assert(
    resolveHistoryBudget(budget, undefined) === unscaled,
    "omitting the threshold changed the history budget",
  );
});

await test("7.5 — a narrower threshold shrinks the budget and a wider one cannot grow it", async () => {
  const budget = {
    withinBudget: false,
    estimatedInputTokens: 150_000,
    availableInputTokens: 180_000,
    usageRatio: 0.83,
    shouldCompact: true,
    breakdown: {
      systemPrompt: 2_000,
      conversationHistory: 140_000,
      currentPrompt: 500,
      toolDefinitions: 7_000,
      fileAttachments: 500,
    },
  };
  const base = resolveHistoryBudget(budget);
  assert(
    resolveHistoryBudget(budget, 0.45) < base,
    "a narrow scope did not shrink the compaction target",
  );
  // The clamp is the safety property: even a caller that passes a threshold
  // above the default gets the default's budget, never a larger one.
  assert(
    resolveHistoryBudget(budget, 0.99) === base,
    "a threshold above the default grew the compaction target",
  );
  assert(
    resolveHistoryBudget(budget, 5) === base,
    "an out-of-range threshold grew the compaction target",
  );
});

await test("7.6 — compactionThreshold is accepted on the public generate surface", async () => {
  // It is a caller-settable knob in its own right, not only something the
  // router fills in. Reaching it must not require widening the type.
  const nl = new NeuroLink();
  const rejected = await nl
    .generate({
      input: { text: "hi" },
      provider: "typesafe",
      compactionThreshold: 0.4,
      maxTokens: 8,
    })
    .then(
      () => null,
      (error: unknown) => error,
    );
  assert(rejected !== null, "a decision-only provider must reject generate()");
});

// ───────────────────────────────────────────────────────────────────────────
logSection("8. The model catalogue");
// ───────────────────────────────────────────────────────────────────────────

await test("8.1 — the catalogue is off unless asked for", async () => {
  assert(
    buildModelCatalog(undefined).length === 0,
    "an absent catalogue config produced members",
  );
  assert(
    buildModelCatalog({ enabled: false }).length === 0,
    "a disabled catalogue produced members",
  );
});

await test("8.2 — catalogue members are capped and carry routing metadata", async () => {
  const members = buildModelCatalog({ enabled: true, maxModels: 5 });
  assert(members.length <= 5, "the catalogue exceeded its own cap");
  for (const member of members) {
    assert(
      typeof member.provider === "string" && member.provider.length > 0,
      "a catalogue member has no provider",
    );
    assert(
      typeof member.model === "string" && member.model.length > 0,
      "a catalogue member has no model",
    );
    // Catalogue members deliberately carry NO cost/quality. Those two fields
    // are how a HOST states its own opinion, and renderCandidate gives a
    // host's opinion precedence over the registry's — so setting them here
    // would make every catalogue member look hand-declared and suppress the
    // very registry data the catalogue exists to surface.
    assert(
      member.cost === undefined && member.quality === undefined,
      "a catalogue member declared cost/quality, which would masquerade as a host statement",
    );
  }
});

await test("8.2b — a catalogue member renders with the registry's own data", async () => {
  const members = buildModelCatalog({ enabled: true, maxModels: 3 });
  if (members.length === 0) {
    throw new Error("SKIP: no reachable providers for a catalogue here");
  }
  const index = buildRegistryIndex();
  const rendered = renderCandidate(
    enrichCandidate("probe", members[0]!, "moderate", index),
  );
  // The regression this pins: catalogue members once carried registry-derived
  // cost/quality, which the declared-wins rule then mistook for a host
  // statement — rendering "relative cost 0.002" (raw per-1K pricing wearing a
  // relative label) and suppressing price, speed, quality and use-case scores.
  assert(
    !rendered.includes("relative cost"),
    "a catalogue member rendered as if the host had declared its cost",
  );
  assert(
    rendered.includes("per 1K in"),
    "a catalogue member lost the registry's real price",
  );
  assert(
    rendered.includes("quality"),
    "a catalogue member lost the registry's quality bucket",
  );
});

await test("8.3 — the catalogue only lists providers this host can reach", async () => {
  const members = buildModelCatalog({ enabled: true, maxModels: 400 });
  // Openai is the clearest case: a key the host does not hold must not put
  // its models into a routable pool, because routing to them fails the turn.
  const hadOpenAIKey =
    typeof process.env.OPENAI_API_KEY === "string" &&
    process.env.OPENAI_API_KEY.trim() !== "";
  if (!hadOpenAIKey) {
    assert(
      members.every((m) => m.provider !== "openai"),
      "an unconfigured provider appeared in the catalogue",
    );
  }
});

await test("8.4 — a provider filter is honoured", async () => {
  const members = buildModelCatalog({
    enabled: true,
    providers: ["ollama"],
    maxModels: 50,
  });
  assert(
    members.every((m) => m.provider === "ollama"),
    "the provider filter admitted an unrequested provider",
  );
});

await test("8.5 — enrichment pulls the context window the registry knows", async () => {
  const index = buildRegistryIndex();
  const candidate = enrichCandidate(
    "probe",
    { provider: "anthropic", model: "claude-sonnet-5" },
    "hard",
    index,
  );
  assert(
    typeof candidate.score === "number",
    "enrichment produced no deterministic score",
  );
  // maxContextTokens existed in the registry all along and routing never read
  // it; this is the assertion that says it now does.
  assert(
    candidate.contextWindow === undefined || candidate.contextWindow > 0,
    "a registry-backed candidate reported a non-positive context window",
  );
});

await test("8.6 — an unknown model still ranks, on what the host declared", async () => {
  const candidate = enrichCandidate(
    "custom",
    {
      provider: "litellm",
      model: "some-self-hosted-model-that-is-not-in-any-registry",
      description: "in-house",
      cost: 0.001,
      quality: 2,
    },
    "moderate",
    buildRegistryIndex(),
  );
  assert(
    typeof candidate.score === "number" && Number.isFinite(candidate.score),
    "a registry-less candidate did not receive a finite score",
  );
  assert(
    candidate.description === "in-house",
    "a host-declared description was overwritten",
  );
});

await test("8.7 — ranking drops models too small for the request", async () => {
  const candidates = [
    {
      id: "tiny",
      provider: "p",
      model: "tiny",
      contextWindow: 4_000,
      score: 9,
    },
    {
      id: "big",
      provider: "p",
      model: "big",
      contextWindow: 200_000,
      score: 1,
    },
  ];
  const ranked = rankCatalogue(candidates, "moderate", {
    estimatedInputTokens: 100_000,
  });
  assert(ranked.length === 1, "the window filter kept an unusable candidate");
  assert(
    ranked[0]!.id === "big",
    "the window filter kept the wrong candidate — a higher score must not beat an unusable window",
  );
});

await test("8.8 — the window filter never empties the pool", async () => {
  const candidates = [
    { id: "a", provider: "p", model: "a", contextWindow: 4_000, score: 2 },
    { id: "b", provider: "p", model: "b", contextWindow: 8_000, score: 1 },
  ];
  const ranked = rankCatalogue(candidates, "moderate", {
    estimatedInputTokens: 1_000_000,
  });
  assert(
    ranked.length === 2,
    "the window filter starved the pool instead of degrading",
  );
});

await test("8.8b — a generous declared quality cannot outrank the registry", async () => {
  const index = buildRegistryIndex();
  // `quality` is an unbounded relative scale, so a host writing 10 to mean
  // "the best in my pool" is legitimate. The registry-less branch divides by
  // 3 to mirror the registry's own 1–3 quality rank, which turned 10 into
  // 3.33 — above the 0–1 band every registry candidate is confined to. One
  // such member then sorted first at EVERY difficulty, including tiers it was
  // never meant for.
  const registryBacked = enrichCandidate(
    "known",
    { provider: "openai", model: "gpt-4o-mini" },
    "expert",
    index,
  );
  const declared = enrichCandidate(
    "unknown",
    { provider: "self-hosted", model: "mystery", quality: 10 },
    "expert",
    index,
  );
  assert(
    registryBacked.score !== undefined && declared.score !== undefined,
    "enrichCandidate did not score both candidates",
  );
  assert(
    declared.score! <= 1,
    "a declared quality above the mirrored 1-3 band escaped the scale",
  );
  // Same clamp, so quality 10 and quality 3 must land on the same score
  // rather than one beating the other on a scale neither shares.
  const three = enrichCandidate(
    "unknown",
    { provider: "self-hosted", model: "mystery", quality: 3 },
    "expert",
    index,
  );
  assert(
    declared.score === three.score,
    "clamping is not saturating at the top of the band",
  );
  // And the ordering the bug inverted: with the cap in place a strong
  // registry model is no longer automatically beaten by one declaration.
  const ranked = rankCatalogue([declared, registryBacked], "expert", {});
  assert(
    ranked.length === 2,
    "ranking dropped a candidate it should have kept",
  );
});

await test("8.9 — host-declared ranking suppresses the registry's opinion", async () => {
  const index = buildRegistryIndex();
  // The pool member says "use this only for rote work" (quality 2 of 10).
  // The registry rates the same model highly on general benchmarks. The
  // host must win: rendering both put five registry clauses against one
  // line of host prose and routed hard tasks to the cheap model.
  const declared = renderCandidate(
    enrichCandidate(
      "fast",
      {
        provider: "google-ai",
        model: "gemini-2.5-flash",
        description: "Cheap and fast; rote edits and simple lookups",
        tiers: ["trivial", "simple"],
        cost: 1,
        quality: 2,
      },
      "hard",
      index,
    ),
  );
  assert(
    declared.includes("capability 2"),
    "the host's declared capability never reached the model",
  );
  assert(
    declared.includes("relative cost 1"),
    "the host's declared cost never reached the model",
  );
  assert(
    declared.includes("intended for trivial/simple tasks"),
    "declared tier eligibility was dropped from the rendering",
  );
  assert(
    !declared.includes("high quality"),
    "the registry's quality bucket contradicted the host's own ranking",
  );
  assert(
    !declared.includes("strong at"),
    "the registry's use-case scores contradicted the host's own ranking",
  );
  // A capability FLAG is a fact about the model, not an opinion about its
  // quality, so it must survive.
  assert(
    declared.includes("supports"),
    "capability flags were suppressed along with the quality opinion",
  );
});

await test("8.10 — with nothing declared, the registry fills in", async () => {
  const rendered = renderCandidate(
    enrichCandidate(
      "bare",
      { provider: "google-ai", model: "gemini-2.5-flash" },
      "moderate",
      buildRegistryIndex(),
    ),
  );
  assert(
    rendered.includes("per 1K in"),
    "a member with no declared ranking got no price from the registry",
  );
  assert(
    rendered.includes("quality"),
    "a member with no declared ranking got no quality from the registry",
  );
});

await test("8.11 — a relative cost is never rendered as a currency", async () => {
  // `cost` is documented as a relative scale. Rendering `cost: 20` as
  // "2000.00c per 1K in" would be three orders of magnitude off and would
  // make the model refuse a model the host actually wanted used.
  const rendered = renderCandidate(
    enrichCandidate(
      "custom",
      {
        provider: "litellm",
        model: "not-in-any-registry-model",
        description: "in-house",
        cost: 20,
        quality: 10,
      },
      "hard",
      buildRegistryIndex(),
    ),
  );
  assert(
    !rendered.includes("per 1K in"),
    "a relative cost was rendered as a per-1K-token price",
  );
  assert(
    rendered.includes("relative cost 20"),
    "the relative cost was not rendered at all",
  );
});

await test("8.12 — a rendered candidate stays terse enough to batch", async () => {
  const members = buildModelCatalog({ enabled: true, maxModels: 120 });
  const index = buildRegistryIndex();
  let total = 0;
  for (const member of members) {
    const line = renderCandidate(
      enrichCandidate(
        `${member.provider}/${member.model}`,
        member,
        "moderate",
        index,
      ),
    );
    total += line.length;
  }
  // The rendered catalogue is a QUESTION, and the binding ceiling is state
  // plus the single longest question at ~33K tokens. At ~4 chars per token a
  // 120-model catalogue must stay far inside that, with room for a long
  // request alongside it.
  const approxTokens = total / 4;
  assert(
    approxTokens < TYPESAFE_MAX_STATE_TOKENS / 2,
    "the rendered catalogue is too large to batch alongside a request",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("9. Tool routing — a server is dropped only on a confident no");
// ───────────────────────────────────────────────────────────────────────────

const CATALOG = [
  {
    id: "github",
    description: "Read and write GitHub issues, pull requests and repositories",
    toolNames: ["github_create_issue", "github_list_prs"],
  },
  {
    id: "weather",
    description: "Current conditions and forecasts for a location",
    toolNames: ["weather_current", "weather_forecast"],
  },
  {
    id: "payments",
    description: "Issue refunds and inspect Stripe charges",
    toolNames: ["payments_refund", "payments_get_charge"],
  },
];

await test("9.1 — no decision provider ⇒ null, so the LLM router still runs", async () => {
  clearDecisionKeys();
  const nl = new NeuroLink();
  const outcome = await selectServersByDecision(
    "open a pull request for the fix",
    CATALOG,
    (o) => nl.tryDecide(o),
  );
  assert(
    outcome === null,
    "an unconfigured decision provider must not produce a routing outcome",
  );
  restoreEnv();
});

await test("9.2 — a single routable server is never routed", async () => {
  restoreEnv();
  const nl = new NeuroLink();
  const outcome = await selectServersByDecision(
    "open a pull request",
    CATALOG.slice(0, 1),
    (o) => nl.tryDecide(o),
  );
  assert(
    outcome === null,
    "routing ran over a catalog with nothing to choose between",
  );
});

await test("9.3 — live: an unrelated server is dropped, the needed one kept", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const outcome = await selectServersByDecision(
    "Open a pull request on the billing repository that fixes the retry loop.",
    CATALOG,
    (o) => nl.tryDecide(o),
  );
  assert(outcome !== null, "the decision router produced no outcome");
  assert(
    outcome!.selectedServerIds.includes("github"),
    "the router dropped the server the request plainly needs",
  );
  assert(
    outcome!.excludedServerIds.includes("weather"),
    "the router kept a server with no bearing on the request",
  );
  assert(
    outcome!.excludedToolNames.includes("weather_current"),
    "an excluded server's tools were not added to the denylist",
  );
});

await test("9.4 — live: an unreachable bar keeps every server", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  // A confidence bar nothing can clear must degrade to keeping everything,
  // which is indistinguishable from routing being off. This is the asymmetry
  // under test: uncertainty keeps a server, it never drops one.
  const outcome = await selectServersByDecision(
    "Open a pull request on the billing repository.",
    CATALOG,
    (o) => nl.tryDecide(o),
    { minDropConfidence: 1.01 },
  );
  assert(
    outcome === null,
    "an unreachable confidence bar still produced exclusions",
  );
});

await test("9.5 — question keys round-trip distinctly", async () => {
  const keys = new Set(CATALOG.map((_, i) => decisionKey("server", i)));
  assert(
    keys.size === CATALOG.length,
    "two servers collided on one question key",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("10. Context relevance — Stage 0 of compaction");
// ───────────────────────────────────────────────────────────────────────────

const TRANSCRIPT = [
  {
    id: "m1",
    role: "user" as const,
    content:
      "We decided the retry budget for the payments worker is 3 attempts with jitter.",
  },
  {
    id: "m2",
    role: "assistant" as const,
    content: "Understood — 3 attempts with jitter for the payments worker.",
  },
  {
    id: "m3",
    role: "user" as const,
    content:
      "By the way, the office coffee machine is broken again and nobody has called the repair company.",
  },
  {
    id: "m4",
    role: "assistant" as const,
    content: "That sounds annoying. I hope somebody calls them soon.",
  },
  {
    id: "m5",
    role: "user" as const,
    content: "Also my train was delayed 40 minutes this morning.",
  },
  {
    id: "m6",
    role: "assistant" as const,
    content: "Sorry to hear that.",
  },
  {
    id: "m7",
    role: "user" as const,
    content: "Let us come back to the worker later.",
  },
  { id: "m8", role: "assistant" as const, content: "Sure." },
  { id: "m9", role: "user" as const, content: "Ready when you are." },
  { id: "m10", role: "assistant" as const, content: "Ready." },
  { id: "m11", role: "user" as const, content: "Ok." },
  { id: "m12", role: "assistant" as const, content: "Ok." },
];

await test("10.1 — no decision provider ⇒ null, positional stages unaffected", async () => {
  clearDecisionKeys();
  const nl = new NeuroLink();
  const result = await selectIrrelevantMessages(
    TRANSCRIPT,
    "What retry budget did we settle on for the payments worker?",
    (o) => nl.tryDecide(o),
  );
  assert(result === null, "relevance ran without a decision provider");
  restoreEnv();
});

await test("10.2 — an empty request is never acted on", async () => {
  restoreEnv();
  const nl = new NeuroLink();
  const result = await selectIrrelevantMessages(TRANSCRIPT, "   ", (o) =>
    nl.tryDecide(o),
  );
  assert(
    result === null,
    "relevance ran with no request to judge relevance against",
  );
});

await test("10.3 — live: chatter is dropped and the decision is kept", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const result = await selectIrrelevantMessages(
    TRANSCRIPT,
    "What retry budget did we settle on for the payments worker?",
    (o) => nl.tryDecide(o),
  );
  assert(result !== null, "relevance produced no result");
  const keptIds = new Set(result!.messages.map((m) => m.id));
  assert(
    keptIds.has("m1"),
    "the message stating the decision under question was dropped",
  );
  assert(
    !keptIds.has("m3") || !keptIds.has("m5"),
    "no unrelated chatter was dropped at all",
  );
});

await test("10.4 — the recent window is never eligible", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const result = await selectIrrelevantMessages(
    TRANSCRIPT,
    "What retry budget did we settle on for the payments worker?",
    (o) => nl.tryDecide(o),
    { protectRecent: 6, minDropConfidence: 0.01 },
  );
  if (result) {
    const protectedFrom = TRANSCRIPT.length - 6;
    assert(
      result.droppedIndices.every((i) => i < protectedFrom),
      "a protected recent message was dropped",
    );
  }
});

await test("10.5 — the drop ratio is a hard ceiling", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  // Bars set so low that everything qualifies; the cap must still hold, or a
  // single misread request could empty the conversation.
  const result = await selectIrrelevantMessages(
    TRANSCRIPT,
    "What retry budget did we settle on for the payments worker?",
    (o) => nl.tryDecide(o),
    { minDropConfidence: 0.001, maxDropRatio: 0.25, protectRecent: 2 },
  );
  if (result) {
    const eligible = TRANSCRIPT.length - 2;
    assert(
      result.droppedIndices.length <= Math.floor(eligible * 0.25),
      "the relevance stage dropped more than its own ceiling permits",
    );
  }
});

await test("10.6 — a summary gate fails OPEN when unconfigured", async () => {
  clearDecisionKeys();
  const nl = new NeuroLink();
  const accepted = await summaryPreservesContext(
    "A summary.",
    TRANSCRIPT,
    (o) => nl.tryDecide(o),
  );
  assert(
    accepted === true,
    "an unconfigured summary gate rejected a summary — rejecting falls through to truncation, which loses more",
  );
  restoreEnv();
});

await test("10.7 — live: a refusal is rejected, a real summary accepted", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const refusal = await summaryPreservesContext(
    "I'm sorry, I can't help with that request.",
    TRANSCRIPT,
    (o) => nl.tryDecide(o),
  );
  assert(refusal === false, "an outright refusal was accepted as a summary");

  const real = await summaryPreservesContext(
    "Decision: the payments worker retry budget is 3 attempts with jitter. " +
      "Side topics raised: a broken office coffee machine and a delayed train. " +
      "Open question: revisit the worker configuration later.",
    TRANSCRIPT,
    (o) => nl.tryDecide(o),
  );
  assert(real === true, "a faithful summary was rejected");
});

// ───────────────────────────────────────────────────────────────────────────
logSection("11. Per-search retrieval planning");
// ───────────────────────────────────────────────────────────────────────────

await test("11.1 — no decision provider ⇒ null, config stands", async () => {
  clearDecisionKeys();
  const nl = new NeuroLink();
  const plan = await decideSearchPlan(
    "what is the refund window?",
    (o) => nl.tryDecide(o),
    { defaultTopK: 5, canHybrid: true, canGraph: true, canRerank: true },
  );
  assert(plan === null, "a plan was produced with no decision provider");
  restoreEnv();
});

await test("11.2 — a capability the pipeline lacks is never suggested", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const plan = await decideSearchPlan(
    "How does billing relate to entitlements across our services?",
    (o) => nl.tryDecide(o),
    { defaultTopK: 5, canHybrid: false, canGraph: false, canRerank: false },
  );
  if (plan) {
    assert(
      plan.hybrid === undefined,
      "hybrid was suggested but is not available",
    );
    assert(
      plan.graph === undefined,
      "graph was suggested but is not available",
    );
    assert(
      plan.rerank === undefined,
      "rerank was suggested but is not available",
    );
  }
});

await test("11.3 — live: a broad question asks for more passages than a narrow one", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  const caps = {
    defaultTopK: 5,
    canHybrid: true,
    canGraph: true,
    canRerank: true,
  };
  const narrow = await decideSearchPlan(
    "What is the exact refund window in days?",
    (o) => nl.tryDecide(o),
    caps,
  );
  const broad = await decideSearchPlan(
    "Give me a complete survey of every compliance obligation across all of our regions and product lines.",
    (o) => nl.tryDecide(o),
    caps,
  );
  assert(narrow !== null && broad !== null, "one of the plans was empty");
  if (narrow!.topK !== undefined && broad!.topK !== undefined) {
    assert(
      broad!.topK >= narrow!.topK,
      "a corpus-wide survey did not ask for at least as many passages as a single-fact lookup",
    );
  }
  for (const plan of [narrow!, broad!]) {
    if (plan.topK !== undefined) {
      assert(
        plan.topK >= 1 && plan.topK <= 50,
        "a planned topK fell outside its permitted bounds",
      );
    }
  }
});

// ───────────────────────────────────────────────────────────────────────────
logSection("12. The shared boolean gate");
// ───────────────────────────────────────────────────────────────────────────

await test("12.1 — three outcomes stay distinguishable", async () => {
  const answers = {
    yes: { type: "boolean" as const, probability: 0.95 },
    no: { type: "boolean" as const, probability: 0.03 },
    unsure: { type: "boolean" as const, probability: 0.52 },
    wrongType: {
      type: "choice" as const,
      choice: "a",
      probabilities: { a: 1 },
      confidence: 1,
    },
  };
  assert(
    gateDecisionBoolean(answers, "yes") === true,
    "a confident yes did not read as true",
  );
  assert(
    gateDecisionBoolean(answers, "no") === false,
    "a confident no did not read as false",
  );
  assert(
    gateDecisionBoolean(answers, "unsure") === undefined,
    "a near-coin-flip was treated as an answer",
  );
  assert(
    gateDecisionBoolean(answers, "missing") === undefined,
    "an absent id produced an answer",
  );
  assert(
    gateDecisionBoolean(answers, "wrongType") === undefined,
    "a mismatched answer type produced a boolean",
  );
});

await test("12.2 — raising the bar turns an answer into an abstention", async () => {
  const answers = { q: { type: "boolean" as const, probability: 0.8 } };
  assert(
    gateDecisionBoolean(answers, "q") === true,
    "0.8 did not clear the default bar",
  );
  assert(
    gateDecisionBoolean(answers, "q", { minConfidence: 0.9 }) === undefined,
    "a raised confidence bar did not force an abstention",
  );
  assert(
    decisionBooleanConfidence(0.5) === 0,
    "a coin flip reported non-zero confidence",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("13. Telemetry — a fail-open path has to be observable");
// ───────────────────────────────────────────────────────────────────────────

await test("13.1 — a decision records a span on the instance aggregator", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  nl.resetMetrics();
  await nl.decide({
    state: SUPPORT_TICKET,
    questions: { urgent: ALL_THREE.urgent },
  });
  // `getSpans()` reads the INSTANCE aggregator. Recording only to the global
  // singleton would make a decision invisible to the very API a caller would
  // reach for to check whether it ran.
  const spans = nl.getSpans().filter((s) => s.type === "model.decision");
  assert(spans.length === 1, "a decision did not produce exactly one span");
  const span = spans[0]!;
  assert(span.status === 1, "a successful decision was not recorded as OK");
  assert(
    typeof span.durationMs === "number" && span.durationMs > 0,
    "the decision span carries no duration",
  );
});

await test("13.2 — the span carries the attributes cost aggregation reads", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  nl.resetMetrics();
  await nl.decide({ state: SUPPORT_TICKET, questions: ALL_THREE });
  const span = nl.getSpans().find((s) => s.type === "model.decision");
  assert(span !== undefined, "no decision span was recorded");
  const attrs = span!.attributes;
  assert(attrs["ai.provider"] === "typesafe", "span has no provider attribute");
  // The RESOLVED model, not the alias that was sent — spend has to be
  // attributed to what actually ran.
  assert(
    typeof attrs["ai.model"] === "string" &&
      (attrs["ai.model"] as string).length > 0,
    "span has no resolved model attribute",
  );
  assert(
    typeof attrs["ai.tokens.input"] === "number" &&
      (attrs["ai.tokens.input"] as number) > 0,
    "span reports no input tokens",
  );
  assert(
    attrs["decision.question_count"] === 3,
    "span does not report how many questions were asked",
  );
  assert(
    attrs["decision.answer_count"] === 3,
    "span does not report how many answers came back",
  );
});

await test("13.3 — a decision is priced, and priced as input-only", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  nl.resetMetrics();
  const result = await nl.decide({
    state: SUPPORT_TICKET,
    questions: ALL_THREE,
  });
  const span = nl.getSpans().find((s) => s.type === "model.decision");
  assert(span !== undefined, "no decision span was recorded");
  const total = span!.attributes["ai.cost.total"];
  assert(typeof total === "number", "the decision span carries no cost");
  assert(
    (total as number) > 0,
    "a priced provider recorded a zero-cost decision",
  );
  assert(
    span!.attributes["ai.cost.output"] === 0,
    "output was billed for a model whose output rate is zero",
  );
  // Output tokens ARE reported — measured at roughly 17 per question — they
  // are simply billed at zero. Asserting they are absent would pin a fiction
  // and would break the moment anyone read a real response.
  assert(
    result.usage.outputTokens > 0,
    "the provider stopped reporting output tokens",
  );
  // The precise claim: the whole cost is the input tokens at $0.042/M, so
  // output contributed exactly nothing. This is stronger than a magnitude
  // check and it is what "output is free" actually means.
  const expected =
    Math.round(((result.usage.inputTokens * 0.042) / 1_000_000) * 1_000_000) /
    1_000_000;
  assert(
    total === expected,
    "the decision cost is not exactly the input tokens priced at the input rate",
  );
});

await test("13.4 — a decision is NOT counted as a generation", async () => {
  requireKey();
  restoreEnv();
  const nl = new NeuroLink();
  nl.resetMetrics();
  await nl.decide({
    state: SUPPORT_TICKET,
    questions: { urgent: ALL_THREE.urgent },
  });
  // Folding decisions into model.generation would distort generation counts,
  // latency percentiles and the output-token aggregate at once.
  assert(
    nl.getSpans().every((s) => s.type !== "model.generation"),
    "a decision was recorded as a generation span",
  );
});

await test("13.5 — a failed decision records an ERROR span, not silence", async () => {
  restoreEnv();
  process.env.TYPESAFE_API_KEY = "apikey_definitely-not-a-valid-key";
  const nl = new NeuroLink();
  nl.resetMetrics();
  let threw = false;
  try {
    await nl.decide({
      state: "x",
      questions: { q: { type: "boolean", instructions: "?" } },
    });
  } catch {
    threw = true;
  }
  restoreEnv();
  assert(threw, "an invalid key did not surface an error from decide()");
  const spans = nl.getSpans().filter((s) => s.type === "model.decision");
  assert(spans.length === 1, "a failed decision recorded no span");
  assert(
    spans[0]!.status === 2,
    "a failed decision was not recorded with ERROR status",
  );
});

await test("13.6 — tryDecide stays silent to callers but not to telemetry", async () => {
  restoreEnv();
  process.env.TYPESAFE_API_KEY = "apikey_definitely-not-a-valid-key";
  const nl = new NeuroLink();
  nl.resetMetrics();
  const result = await nl.tryDecide({
    state: "x",
    questions: { q: { type: "boolean", instructions: "?" } },
  });
  restoreEnv();
  // This is the pairing that makes a fail-open design operable: the caller
  // sees null and carries on, while the failure is still recorded. Without
  // the span, a decision path that quietly stopped working would be
  // indistinguishable from one that was never configured.
  assert(result === null, "tryDecide surfaced a failure to its caller");
  const spans = nl.getSpans().filter((s) => s.type === "model.decision");
  assert(
    spans.length === 1 && spans[0]!.status === 2,
    "a swallowed failure left no trace in telemetry",
  );
});

// ───────────────────────────────────────────────────────────────────────
// Section 14 — the Vercel AI Gateway transport, LIVE.
//
// The mocked contract in continuous-test-suite-providers-mocked.ts pins the
// wire format. It could not pin these, because the mock was written from the
// DIRECT API's shapes and therefore agreed with the code about the wrong
// thing. All three were found by first calling the real gateway:
//
//   1. usage is camelCase here and snake_case on the direct API. Reading one
//      spelling does not error, it reports zero tokens — and a decision is
//      priced on input alone, so every call costs exactly $0.
//   2. confidence is not omitted, it is RELOCATED to providerMetadata. Taking
//      max(probabilities) instead agrees on a confident answer and diverges on
//      an uncertain one, across the default routing bars.
//   3. the gateway's error envelope is a third shape entirely.
//
// Skips without AI_GATEWAY_API_KEY, so it costs nothing in CI.
// ───────────────────────────────────────────────────────────────────────

const GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY?.trim() ?? "";

function requireGatewayKey(): void {
  if (!GATEWAY_KEY) {
    throw new Error("SKIP: AI_GATEWAY_API_KEY not set");
  }
}

/** Run `fn` with ONLY the gateway key visible, then restore. */
async function withGatewayOnly<T>(
  fn: (nl: NeuroLink) => Promise<T>,
): Promise<T> {
  const savedTransport = process.env.TYPESAFE_TRANSPORT;
  clearDecisionKeys();
  // Set the captured key explicitly rather than trusting whatever the ambient
  // environment holds by now: earlier tests clear both credentials, so relying
  // on ambient state made these skip or run depending on execution order.
  process.env.AI_GATEWAY_API_KEY = GATEWAY_KEY;
  process.env.TYPESAFE_TRANSPORT = "gateway";
  try {
    return await fn(new NeuroLink());
  } finally {
    process.env.TYPESAFE_TRANSPORT = savedTransport;
    if (savedTransport === undefined) {
      delete process.env.TYPESAFE_TRANSPORT;
    }
    restoreEnv();
  }
}

await test("14.1 — the gateway answers a real decision", async () => {
  requireGatewayKey();
  const result = await withGatewayOnly((nl) =>
    nl.decide({
      provider: "typesafe",
      state: {
        request: "Rename a local variable from foo to bar in one file.",
      },
      questions: {
        trivial: {
          type: "boolean",
          instructions: "A mechanical, local edit needing no reasoning.",
        },
      },
    }),
  );
  const answer = result.answers.trivial;
  assert(answer !== undefined, "gateway returned no answer for the question");
  assert(answer.type === "boolean", "gateway answer was not typed boolean");
});

await test("14.2 — gateway usage is read, so a decision is not costed at zero", async () => {
  requireGatewayKey();
  const result = await withGatewayOnly((nl) =>
    nl.decide({
      provider: "typesafe",
      state: {
        request: "Rename a local variable from foo to bar in one file.",
      },
      questions: {
        trivial: { type: "boolean", instructions: "A mechanical, local edit." },
      },
    }),
  );
  // The regression this guards is silent: nothing throws when the spelling is
  // wrong, the number is just always 0 and every decision is free.
  assert(
    (result.usage?.inputTokens ?? 0) > 0,
    "gateway input tokens read as zero — the camelCase spelling is not being parsed",
  );
});

await test("14.3 — gateway confidence comes from the vendor, not the distribution peak", async () => {
  requireGatewayKey();
  // Deliberately ambiguous, so the distribution is flat and the reported
  // confidence and max(probabilities) cannot coincide by luck.
  const result = await withGatewayOnly((nl) =>
    nl.decide({
      provider: "typesafe",
      state: { request: "it depends on the situation, maybe, possibly not" },
      questions: {
        pick: {
          type: "choice",
          instructions: "Which category does this belong to?",
          criteria: {
            alpha: "Things that are alpha.",
            beta: "Things that are beta.",
            gamma: "Things that are gamma.",
            delta: "Things that are delta.",
          },
        },
      },
    }),
  );
  const pick = result.answers.pick;
  assert(pick !== undefined && pick.type === "choice", "no choice answer");
  const peak = Math.max(...Object.values(pick.probabilities));
  // A flat four-way distribution peaks around 0.3; the calibrated confidence
  // for the same answer is far lower. If they are equal the vendor field was
  // not read and the derived peak leaked through.
  assert(
    pick.confidence < peak,
    "gateway confidence equals the distribution peak — providerMetadata is not being read",
  );
  // And the pick must not clear the default upgrade bar on a near-random
  // distribution, which is exactly what the derived peak used to do.
  assert(
    pick.confidence < 0.3,
    "a near-random four-way pick reported a confidence that clears the upgrade bar",
  );
});

await test("14.4 — a gateway failure fails open through tryDecide", async () => {
  requireGatewayKey();
  const savedTransport = process.env.TYPESAFE_TRANSPORT;
  const savedGateway = process.env.AI_GATEWAY_API_KEY;
  clearDecisionKeys();
  process.env.TYPESAFE_TRANSPORT = "gateway";
  process.env.AI_GATEWAY_API_KEY = "vck_definitely-not-a-valid-gateway-key";
  try {
    const nl = new NeuroLink();
    const result = await nl.tryDecide({
      provider: "typesafe",
      state: "x",
      questions: { q: { type: "boolean", instructions: "?" } },
    });
    assert(result === null, "a rejected gateway key surfaced to the caller");
  } finally {
    process.env.AI_GATEWAY_API_KEY = savedGateway;
    process.env.TYPESAFE_TRANSPORT = savedTransport;
    if (savedTransport === undefined) {
      delete process.env.TYPESAFE_TRANSPORT;
    }
    restoreEnv();
  }
});

// ───────────────────────────────────────────────────────────────────────────
logSection("15. The decide command (CLI)");
// ───────────────────────────────────────────────────────────────────────────
// Drives the BUILT CLI (`node dist/cli/index.js decide ...`) via `runCLI`,
// never the source command module — the same "one module graph" discipline
// as the SDK tests above, just for the CLI surface instead of `dist/index.js`.

/** True when a stdout/stderr blob contains a printed JS stack frame. */
function looksLikeStackTrace(output: string): boolean {
  return output.split("\n").some((line) => /^\s*at\s+\S/.test(line));
}

// Deterministic: every decision-provider env var is blanked for the child
// regardless of what the parent process has ambient, so this behaves the
// same in a shell with TYPESAFE_API_KEY exported and one without.
const NO_PROVIDER_ENV = {
  TYPESAFE_API_KEY: "",
  AI_GATEWAY_API_KEY: "",
  LAYA_API_KEY: "",
  LAYA_BASE_URL: "",
  XOR_API_KEY: "",
  XOR_BASE_URL: "",
  PERPLEXITY_API_KEY: "",
  PERPLEXITY_DECIDER_BASE_URL: "",
  PERPLEXITY_DECIDER_MODEL: "",
  CLOUDFLARE_API_KEY: "",
  CLOUDFLARE_ACCOUNT_ID: "",
  CLOUDFLARE_CLEF_BASE_URL: "",
  CLOUDFLARE_CLEF_MODEL: "",
};

await test("15.1 — no decision provider configured ⇒ clean one-line error, no stack trace", async () => {
  const result = await runCLI(
    [
      "decide",
      "Refund request for a damaged item",
      "--questions",
      JSON.stringify({
        urgent: { type: "boolean", instructions: "Is this urgent?" },
      }),
    ],
    { env: NO_PROVIDER_ENV, timeoutMs: 30_000 },
  );
  assert(
    result.exitCode !== 0,
    "decide must fail when no decision provider is configured",
  );
  assert(
    result.stderr.includes(
      "Error: No decision provider is configured. Set TYPESAFE_API_KEY or AI_GATEWAY_API_KEY for typesafe, or LAYA_API_KEY and LAYA_BASE_URL for laya, or XOR_API_KEY and XOR_BASE_URL for xor, or PERPLEXITY_API_KEY for perplexity-decider, or CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID for cloudflare-clef.",
    ),
    "the no-provider case did not print the expected one-line error",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the no-provider error printed a stack trace instead of a clean message",
  );
});

await test("15.2 — malformed --questions fails validation before any provider work", async () => {
  const result = await runCLI(
    ["decide", "some state", "--questions", "{not valid json"],
    { env: NO_PROVIDER_ENV, timeoutMs: 30_000 },
  );
  assert(
    result.exitCode !== 0,
    "a malformed --questions payload must exit non-zero",
  );
  assert(
    result.stderr.includes("Error: --questions is not valid JSON."),
    "the malformed-JSON case did not print the expected validation message",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "a validation failure printed a stack trace instead of a clean message",
  );
});

await test("15.3 — live: boolean + choice + score render in both text and json", async () => {
  requireKey();
  const questions = JSON.stringify(ALL_THREE);
  const liveEnv = { TYPESAFE_API_KEY: REAL_KEY as string };

  const textResult = await runCLI(
    ["decide", SUPPORT_TICKET, "--questions", questions],
    { env: liveEnv, timeoutMs: 60_000 },
  );
  assert(
    textResult.exitCode === 0,
    "the live text-format decide call did not succeed",
  );
  assert(
    /^urgent: probability \d/m.test(textResult.stdout),
    "text output is missing the boolean answer line",
  );
  assert(
    /^team: choice \S/m.test(textResult.stdout),
    "text output is missing the choice answer line",
  );
  assert(
    /^frustration: score \d/m.test(textResult.stdout),
    "text output is missing the score answer line",
  );
  assert(
    textResult.stdout.includes("Model:"),
    "text output is missing the Model line",
  );
  assert(
    textResult.stdout.includes("Latency:"),
    "text output is missing the Latency line",
  );

  const jsonResult = await runCLI(
    ["decide", SUPPORT_TICKET, "--questions", questions, "--format", "json"],
    { env: liveEnv, timeoutMs: 60_000 },
  );
  assert(
    jsonResult.exitCode === 0,
    "the live json-format decide call did not succeed",
  );
  const parsed: unknown = JSON.parse(jsonResult.stdout);
  assert(
    isRecordLike(parsed) && isRecordLike(parsed.answers),
    "json output has no answers object",
  );
  const answers = (parsed as { answers: Record<string, unknown> }).answers;
  for (const id of ["urgent", "team", "frustration"]) {
    assert(id in answers, `json output is missing the "${id}" answer`);
  }
});

// Debug logging at debug level is the noisiest the CLI gets, and most of it
// is emitted while modules are still importing — before any CLI middleware
// runs — so it is the case that would leak into a JSON payload first.
const DEBUG_LOG_ENV = { ...NO_PROVIDER_ENV, NEUROLINK_LOG_LEVEL: "debug" };
const ONE_QUESTION = JSON.stringify({
  urgent: { type: "boolean", instructions: "Is this urgent?" },
});

await test("15.4 — --format json keeps diagnostics off stdout, even with --debug", async () => {
  const json = await runCLI(
    [
      "decide",
      "some state",
      "--questions",
      ONE_QUESTION,
      "--format",
      "json",
      "--debug",
    ],
    { env: DEBUG_LOG_ENV, timeoutMs: 30_000 },
  );
  // Precondition: diagnostics were actually emitted. Without it, a clean
  // stdout would prove nothing.
  assert(
    json.stderr.includes("[NEUROLINK:DEBUG]"),
    "no debug output was produced, so the routing could not be observed",
  );
  assert(
    !json.stdout.includes("[NEUROLINK:"),
    "a diagnostic line reached stdout in JSON mode",
  );

  // Control: text mode keeps the existing behaviour, diagnostics on stdout.
  const text = await runCLI(
    ["decide", "some state", "--questions", ONE_QUESTION, "--debug"],
    { env: DEBUG_LOG_ENV, timeoutMs: 30_000 },
  );
  assert(
    text.stdout.includes("[NEUROLINK:DEBUG]"),
    "text mode no longer writes debug output to stdout",
  );
});

await test("15.5 — a provider error keeps the provider's own detail", async () => {
  // Same network call as 5.3: a key the service rejects, no real key needed.
  const result = await runCLI(
    ["decide", "some state", "--questions", ONE_QUESTION],
    {
      env: {
        TYPESAFE_API_KEY: "apikey_definitely_not_valid",
        AI_GATEWAY_API_KEY: "",
      },
      timeoutMs: 60_000,
    },
  );
  assert(result.exitCode !== 0, "a rejected key must exit non-zero");
  // Only a key rejection can be judged here. When the service is slow or
  // overloaded it answers with a transient error instead, which says nothing
  // about how the CLI reports a rejection — so that run is skipped, not failed.
  const TRANSIENT_REPLIES = [
    "timed out",
    "rate-limiting",
    "overloaded",
    "network error",
    "server error",
  ];
  if (TRANSIENT_REPLIES.some((phrase) => result.stderr.includes(phrase))) {
    throw new Error(
      "SKIP: the decision service returned a transient error, not a key rejection",
    );
  }
  assert(
    /Error: Authentication failed[^\n]*\(.+\)/.test(result.stderr),
    "the rejected-credential message lost the provider's detail",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the rejected-credential message printed a stack trace",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("16. Laya — a decision provider at a configured endpoint");
// ───────────────────────────────────────────────────────────────────────────

await test("16.1 — laya declares decide and only decide, and no generation rank", async () => {
  const laya = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.LAYA);
  assert(laya !== undefined, "laya has no registered descriptor");
  assert(servesInferenceKind(laya!, "decide"), "laya must declare decide");
  assert(
    !servesInferenceKind(laya!, "generate") &&
      !servesInferenceKind(laya!, "stream"),
    "a model that emits no text must not declare generate or stream",
  );
  assert(
    laya!.autoSelectPriority === undefined &&
      laya!.autoSelectPreference === undefined &&
      laya!.defaultHealthSweepPriority === undefined,
    "a decision provider must stay out of every generation fallback chain",
  );
});

// Every section-16 test that swaps in placeholder credentials restores the real
// ones in `finally`: the harness records a failed test and moves on, so an
// early throw would otherwise run every later live test with a placeholder key.
await test("16.2 — typesafe wins when both are configured; laya when alone", async () => {
  try {
    clearDecisionKeys();
    process.env.TYPESAFE_API_KEY = "apikey_placeholder_for_resolution";
    process.env.LAYA_API_KEY = "sk-placeholder-for-resolution";
    process.env.LAYA_BASE_URL = "https://laya.placeholder.invalid";
    const both = resolveDefaultDecisionProvider();
    delete process.env.TYPESAFE_API_KEY;
    const alone = resolveDefaultDecisionProvider();
    delete process.env.LAYA_BASE_URL;
    const keyOnly = resolveDefaultDecisionProvider();
    process.env.LAYA_BASE_URL = "https://laya.placeholder.invalid";
    process.env.LAYA_API_KEY = "   ";
    const blank = resolveDefaultDecisionProvider();
    assert(
      both === "typesafe",
      "with both configured, typesafe must stay the default",
    );
    assert(
      alone === "laya",
      "with only laya configured, laya must become the default",
    );
    assert(
      keyOnly === undefined,
      "a laya key without LAYA_BASE_URL must not count as configured",
    );
    assert(
      blank === undefined,
      "a whitespace-only laya credential must not count as configured",
    );
  } finally {
    restoreEnv();
  }
});

await test("16.3 — descriptor order is the precedence: typesafe before laya", async () => {
  const names: string[] = DECISION_PROVIDERS.map((d) => d.name);
  assert(
    names.indexOf("typesafe") !== -1 &&
      names.indexOf("laya") !== -1 &&
      names.indexOf("typesafe") < names.indexOf("laya"),
    "typesafe must precede laya in the derived decision-provider list",
  );
});

await test("16.4 — an ambient laya credential cannot leak into a keyless test", async () => {
  try {
    process.env.LAYA_API_KEY = "sk-ambient-placeholder";
    clearDecisionKeys();
    const resolved = resolveDefaultDecisionProvider();
    assert(
      resolved === undefined,
      "clearDecisionKeys must clear the laya credential too",
    );
  } finally {
    restoreEnv();
  }
});

await test("16.5 — only a laya credential + a long prompt ⇒ heuristic, nothing sent", async () => {
  // Laya points at a dead local address, so a request that escaped would be
  // recorded (and fail) instead of reaching a real server, whatever
  // LAYA_BASE_URL a developer's .env holds.
  try {
    clearDecisionKeys();
    process.env.LAYA_BASE_URL = "http://127.0.0.1:9/laya";
    process.env.LAYA_API_KEY = "sk-placeholder-for-routing";
    fetchCapture.reset();
    const nl = new NeuroLink();
    const router = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => nl.tryDecide(o) },
    );
    // ~4,500 characters of state: far past laya's window, so the decision must
    // be refused locally and routing must fall back without a round trip.
    const decision = await router.route({ prompt: HARD_PROMPT.repeat(30) });
    const sent = fetchCapture
      .list()
      .filter((c) => c.url.endsWith("/predict")).length;
    assert(decision !== null, "the router must still produce a decision");
    assert(
      decision!.reason?.startsWith("heuristic") === true,
      "an over-window prompt must fall back to the heuristic strategy",
    );
    assert(sent === 0, "a refused decision must never reach the proxy");
  } finally {
    restoreEnv();
  }
});

await test("16.6 — the SDK's nothing-configured error names every provider's variable", async () => {
  clearDecisionKeys();
  let message = "";
  try {
    await new NeuroLink().decide({
      state: "x",
      questions: { q: { type: "boolean", instructions: "?" } },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }
  restoreEnv();
  assert(
    message.includes("LAYA_") && message.includes("TYPESAFE_"),
    "the error must name the variable for each decision provider",
  );
});

await test("16.7 — decide --provider laya with no credential ⇒ one clean line", async () => {
  const result = await runCLI(
    [
      "decide",
      "Refund request for a damaged item",
      "--provider",
      "laya",
      "--questions",
      JSON.stringify({
        urgent: { type: "boolean", instructions: "Is this urgent?" },
      }),
    ],
    { env: NO_PROVIDER_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "decide must fail without a laya credential");
  assert(
    result.stderr.includes("LAYA_"),
    "the failure line must say which variable to set",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace instead of a clean message",
  );
});

/**
 * Transient service replies mean "could not test", not "failed". A `server`
 * kind only counts when the service actually answered 5xx: the provider also
 * reports `server` for a 200 with no answers map, which is a changed response
 * format — exactly what these live tests exist to catch.
 */
const LAYA_TRANSIENT_KINDS = new Set([
  "timeout",
  "rate_limit",
  "overloaded",
  "network",
]);
const LAYA_TRANSIENT_PHRASES = [
  "timed out",
  "rate-limiting",
  "overloaded",
  "network error",
  "server error",
];

function isTransientLayaFailure(error: unknown): boolean {
  const cause = (error as { cause?: { kind?: string; status?: number } }).cause;
  if (!cause?.kind) {
    return false;
  }
  return (
    LAYA_TRANSIENT_KINDS.has(cause.kind) ||
    (cause.kind === "server" && (cause.status ?? 0) >= 500)
  );
}

/** The CLI prints no status, so a 200-without-answers is told apart by its text. */
function isTransientLayaCliFailure(stderr: string): boolean {
  return (
    LAYA_TRANSIENT_PHRASES.some((p) => stderr.includes(p)) &&
    !stderr.includes("answers map")
  );
}

await test("16.8 — live: laya answers boolean, choice and score", async () => {
  requireLayaKey();
  restoreEnv();
  const result = await new NeuroLink()
    .decide({ provider: "laya", state: SUPPORT_TICKET, questions: ALL_THREE })
    .catch((error: unknown) => {
      throw isTransientLayaFailure(error)
        ? new Error("SKIP: the laya service returned a transient reply")
        : error;
    });
  assert(result.provider === "laya", "the result must come from laya");
  assert(
    result.answers.urgent?.type === "boolean",
    "urgent must be a boolean answer",
  );
  assert(
    result.answers.team?.type === "choice",
    "team must be a choice answer",
  );
  assert(
    result.answers.frustration?.type === "score",
    "frustration must be a score answer",
  );
  assert(
    ["typed-decisions", "english", "multilingual"].includes(result.model),
    "the reported model must be a laya checkpoint",
  );
  assert(result.latencyMs > 0, "latency must be measured");
});

await test("16.9 — live: decide --provider laya --format json is clean JSON", async () => {
  requireLayaKey();
  const result = await runCLI(
    [
      "decide",
      SUPPORT_TICKET,
      "--provider",
      "laya",
      "--format",
      "json",
      "--questions",
      JSON.stringify(ALL_THREE),
    ],
    {
      env: {
        TYPESAFE_API_KEY: "",
        AI_GATEWAY_API_KEY: "",
        LAYA_API_KEY: REAL_LAYA_KEY ?? "",
        LAYA_BASE_URL: REAL_LAYA_BASE_URL ?? "",
        XOR_API_KEY: "",
        XOR_BASE_URL: "",
        PERPLEXITY_API_KEY: "",
        PERPLEXITY_DECIDER_BASE_URL: "",
        PERPLEXITY_DECIDER_MODEL: "",
        CLOUDFLARE_API_KEY: "",
        CLOUDFLARE_ACCOUNT_ID: "",
        CLOUDFLARE_CLEF_BASE_URL: "",
        CLOUDFLARE_CLEF_MODEL: "",
      },
      timeoutMs: 60_000,
    },
  );
  if (isTransientLayaCliFailure(result.stderr)) {
    throw new Error("SKIP: the laya service returned a transient reply");
  }
  assert(result.exitCode === 0, "the live laya CLI call must exit zero");
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = undefined;
  }
  assert(isRecordLike(parsed), "stdout must be one JSON object");
  assert(parsed.provider === "laya", "the JSON must report the laya provider");
});

await test("16.10 — live: a rejected laya credential keeps the reason, drops the key echo", async () => {
  requireLayaKey();
  const result = await runCLI(
    [
      "decide",
      "Refund request for a damaged item",
      "--provider",
      "laya",
      "--questions",
      JSON.stringify({
        urgent: { type: "boolean", instructions: "Is this urgent?" },
      }),
    ],
    {
      env: {
        TYPESAFE_API_KEY: "",
        AI_GATEWAY_API_KEY: "",
        LAYA_API_KEY: "sk-definitely-not-valid",
        LAYA_BASE_URL: REAL_LAYA_BASE_URL ?? "",
        XOR_API_KEY: "",
        XOR_BASE_URL: "",
        PERPLEXITY_API_KEY: "",
        PERPLEXITY_DECIDER_BASE_URL: "",
        PERPLEXITY_DECIDER_MODEL: "",
        CLOUDFLARE_API_KEY: "",
        CLOUDFLARE_ACCOUNT_ID: "",
        CLOUDFLARE_CLEF_BASE_URL: "",
        CLOUDFLARE_CLEF_MODEL: "",
      },
      timeoutMs: 30_000,
    },
  );
  if (isTransientLayaCliFailure(result.stderr)) {
    throw new Error("SKIP: the laya service returned a transient reply");
  }
  assert(result.exitCode !== 0, "a rejected credential must exit non-zero");
  assert(
    /\(.+\)/.test(result.stderr),
    "the proxy's own reason must be kept in parentheses",
  );
  assert(
    !result.stderr.includes("Received API"),
    "the masked key echo must be dropped",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the rejection printed a stack trace",
  );
});

await test("16.11 — live: decide --provider laya prints readable text by default", async () => {
  requireLayaKey();
  const result = await runCLI(
    [
      "decide",
      SUPPORT_TICKET,
      "--provider",
      "laya",
      "--questions",
      JSON.stringify(ALL_THREE),
    ],
    {
      env: {
        TYPESAFE_API_KEY: "",
        AI_GATEWAY_API_KEY: "",
        LAYA_API_KEY: REAL_LAYA_KEY ?? "",
        LAYA_BASE_URL: REAL_LAYA_BASE_URL ?? "",
        XOR_API_KEY: "",
        XOR_BASE_URL: "",
        PERPLEXITY_API_KEY: "",
        PERPLEXITY_DECIDER_BASE_URL: "",
        PERPLEXITY_DECIDER_MODEL: "",
        CLOUDFLARE_API_KEY: "",
        CLOUDFLARE_ACCOUNT_ID: "",
        CLOUDFLARE_CLEF_BASE_URL: "",
        CLOUDFLARE_CLEF_MODEL: "",
      },
      timeoutMs: 60_000,
    },
  );
  if (isTransientLayaCliFailure(result.stderr)) {
    throw new Error("SKIP: the laya service returned a transient reply");
  }
  assert(result.exitCode === 0, "the live laya CLI call must exit zero");
  assert(
    result.stdout.includes("urgent: probability") &&
      result.stdout.includes("team: choice") &&
      result.stdout.includes("Model:"),
    "text output must show one line per question and the model",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the text output printed a stack trace",
  );
});

restoreEnv();
logSection("17. XOR — a decision provider that also reads images and video");

await test("17.1 — xor declares decide and only decide, and no generation rank", async () => {
  const xor = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.XOR);
  assert(xor !== undefined, "xor has no registered descriptor");
  assert(servesInferenceKind(xor!, "decide"), "xor must declare decide");
  assert(
    !servesInferenceKind(xor!, "generate") &&
      !servesInferenceKind(xor!, "stream"),
    "a model that emits no text must not declare generate or stream",
  );
  assert(
    xor!.autoSelectPriority === undefined &&
      xor!.autoSelectPreference === undefined &&
      xor!.defaultHealthSweepPriority === undefined,
    "a decision provider must stay out of every generation fallback chain",
  );
});

await test("17.2 — precedence: typesafe, then laya, then xor when alone", async () => {
  try {
    clearDecisionKeys();
    process.env.TYPESAFE_API_KEY = "apikey_placeholder_for_resolution";
    process.env.LAYA_API_KEY = "sk-placeholder-for-resolution";
    process.env.LAYA_BASE_URL = "https://laya.placeholder.invalid";
    process.env.XOR_API_KEY = "sk-placeholder-for-resolution";
    process.env.XOR_BASE_URL = "https://xor.placeholder.invalid";
    const all = resolveDefaultDecisionProvider();
    delete process.env.TYPESAFE_API_KEY;
    const withoutTypeSafe = resolveDefaultDecisionProvider();
    delete process.env.LAYA_API_KEY;
    const xorAlone = resolveDefaultDecisionProvider();
    delete process.env.XOR_BASE_URL;
    const keyOnly = resolveDefaultDecisionProvider();
    process.env.XOR_BASE_URL = "https://xor.placeholder.invalid";
    process.env.XOR_API_KEY = "   ";
    const blank = resolveDefaultDecisionProvider();
    assert(
      all === "typesafe",
      "with all three configured, typesafe must stay the default",
    );
    assert(
      withoutTypeSafe === "laya",
      "without typesafe, laya must stay ahead of xor",
    );
    assert(
      xorAlone === "xor",
      "with only xor configured, xor must become the default",
    );
    assert(
      keyOnly === undefined,
      "an xor key without XOR_BASE_URL must not count as configured",
    );
    assert(
      blank === undefined,
      "a whitespace-only xor credential must not count as configured",
    );
  } finally {
    restoreEnv();
  }
});

await test("17.3 — descriptor order is the precedence: typesafe, laya, xor", async () => {
  const names: string[] = DECISION_PROVIDERS.map((d) => d.name);
  assert(
    names.indexOf("typesafe") !== -1 &&
      names.indexOf("typesafe") < names.indexOf("laya") &&
      names.indexOf("laya") < names.indexOf("xor"),
    "the derived decision-provider list must read typesafe, laya, xor",
  );
});

await test("17.4 — an ambient xor credential cannot leak into a keyless test", async () => {
  try {
    process.env.XOR_API_KEY = "sk-ambient-placeholder";
    process.env.XOR_BASE_URL = "https://xor.ambient.invalid";
    clearDecisionKeys();
    assert(
      resolveDefaultDecisionProvider() === undefined,
      "clearDecisionKeys must clear the xor credential too",
    );
  } finally {
    restoreEnv();
  }
});

await test("17.5 — the SDK's nothing-configured error names xor's variables too", async () => {
  clearDecisionKeys();
  let message = "";
  try {
    await new NeuroLink().decide({
      state: "x",
      questions: { q: { type: "boolean", instructions: "?" } },
    });
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }
  restoreEnv();
  assert(
    message.includes("XOR_") &&
      message.includes("LAYA_") &&
      message.includes("TYPESAFE_"),
    "the error must name the variable for each decision provider",
  );
});

await test("17.6 — decide --provider xor with no credential ⇒ one clean line", async () => {
  const result = await runCLI(
    [
      "decide",
      "Refund request for a damaged item",
      "--provider",
      "xor",
      "--questions",
      JSON.stringify({
        urgent: { type: "boolean", instructions: "Is this urgent?" },
      }),
    ],
    { env: NO_PROVIDER_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "decide must fail without an xor credential");
  assert(
    result.stderr.includes("XOR_"),
    "the failure line must say which variable to set",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace instead of a clean message",
  );
});

// The CLI media tests use a dead local address, so a request that escaped to
// the network would surface as a connection error instead of the refusal.
const XOR_FIXTURE_DIR = new URL("./fixtures/decide/xor/", import.meta.url)
  .pathname;
const XOR_CLI_ENV = {
  ...NO_PROVIDER_ENV,
  XOR_API_KEY: "sk-placeholder-for-cli",
  XOR_BASE_URL: "http://127.0.0.1:9/xor",
  TYPESAFE_API_KEY: "apikey_placeholder_for_cli",
  TYPESAFE_BASE_URL: "http://127.0.0.1:9/typesafe",
};
await test("17.7 — decide --help lists --image and --video", async () => {
  const result = await runCLI(["decide", "--help"], { timeoutMs: 30_000 });
  assert(
    result.stdout.includes("--image") && result.stdout.includes("--video"),
    "the help must list both flags",
  );
});

await test("17.8 — a positional state after --image is still the state", async () => {
  const result = await runCLI(
    [
      "decide",
      "--image",
      `${XOR_FIXTURE_DIR}red.png`,
      "The state text",
      "--provider",
      "typesafe",
      "--questions",
      ONE_QUESTION,
    ],
    { env: XOR_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "typesafe must refuse an image");
  assert(
    result.stderr.includes("does not accept images"),
    "the image must reach the provider",
  );
  assert(
    !result.stderr.includes("provide state"),
    "the state must not be swallowed by --image",
  );
});

await test("17.9 — nine --image flags ⇒ refused locally, one clean line", async () => {
  const args = [
    "decide",
    "The state text",
    "--provider",
    "xor",
    "--questions",
    ONE_QUESTION,
  ];
  for (let i = 0; i < 9; i++) {
    args.push("--image", `${XOR_FIXTURE_DIR}red.png`);
  }
  const result = await runCLI(args, { env: XOR_CLI_ENV, timeoutMs: 30_000 });
  assert(result.exitCode !== 0, "nine images must be refused");
  assert(result.stderr.includes("at most 8"), "the refusal must say the limit");
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the refusal printed a stack trace",
  );
});

await test("17.10 — a missing --image file ⇒ one clean line naming the image", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "xor",
      "--image",
      `${XOR_FIXTURE_DIR}no-such-file.png`,
      "--questions",
      ONE_QUESTION,
    ],
    { env: XOR_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "a missing image must fail");
  assert(
    result.stderr.includes("Could not read Image 1"),
    "the failure must name the image",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace",
  );
});

await test("17.11 — --video on a provider that takes none ⇒ refused before any request", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "laya",
      "--video",
      `${XOR_FIXTURE_DIR}red.mp4`,
      "--questions",
      ONE_QUESTION,
    ],
    {
      env: {
        ...XOR_CLI_ENV,
        LAYA_API_KEY: "sk-placeholder",
        LAYA_BASE_URL: "http://127.0.0.1:9/laya",
      },
      timeoutMs: 30_000,
    },
  );
  assert(result.exitCode !== 0, "laya must refuse a video");
  assert(
    result.stderr.includes("does not accept images or video"),
    "the refusal must say why",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
});

/** A busy or unreachable XOR is a skip, not a failure: the contract is what is under test. */
function isTransientXorFailure(error: unknown): boolean {
  const cause =
    error instanceof Error
      ? (error as Error & { cause?: { kind?: string } }).cause
      : undefined;
  return ["rate_limit", "overloaded", "timeout", "network"].includes(
    cause?.kind ?? "",
  );
}

/** The CLI prints no status, so a transient failure is told apart by its text; a 200 with no answers is not transient. */
function isTransientXorCliFailure(stderr: string): boolean {
  return (
    [
      "timed out",
      "rate-limiting",
      "overloaded",
      "network error",
      "server error",
    ].some((phrase) => stderr.includes(phrase)) &&
    !stderr.includes("answers map")
  );
}

const XOR_COLOR_QUESTION = {
  color: {
    type: "choice" as const,
    instructions: "What color is the attached image?",
    criteria: { red: "red", blue: "blue", green: "green", yellow: "yellow" },
  },
};

await test("17.12 — live: xor answers boolean, choice and score", async () => {
  requireXorKey();
  restoreEnv();
  const result = await new NeuroLink()
    .decide({ provider: "xor", state: SUPPORT_TICKET, questions: ALL_THREE })
    .catch((error: unknown) => {
      throw isTransientXorFailure(error)
        ? new Error("SKIP: xor returned a transient reply")
        : error;
    });
  assert(result.provider === "xor", "the result must come from xor");
  assert(
    result.answers.urgent?.type === "boolean",
    "urgent must be a boolean answer",
  );
  assert(
    result.answers.team?.type === "choice",
    "team must be a choice answer",
  );
  assert(
    result.answers.frustration?.type === "score",
    "frustration must be a score answer",
  );
  // A LiteLLM route can serve XOR under its own name, so the check is that the
  // server reports the model that was asked for, not that the name says "xor".
  const requestedModel = process.env.XOR_MODEL?.trim() || "xor-1.1";
  assert(
    result.model === requestedModel,
    "the reported model must be the one that was asked for",
  );
  assert(result.usage.inputTokens > 0, "usage must be reported");
  assert(result.latencyMs > 0, "latency must be measured");
});

async function xorColour(
  media: { images?: string[]; video?: string },
  state: string,
): Promise<string> {
  const result = await new NeuroLink()
    .decide({
      provider: "xor",
      state,
      questions: XOR_COLOR_QUESTION,
      ...media,
    })
    .catch((error: unknown) => {
      throw isTransientXorFailure(error)
        ? new Error("SKIP: xor returned a transient reply")
        : error;
    });
  const answer = result.answers.color;
  assert(answer?.type === "choice", "color must be a choice answer");
  return answer.type === "choice" ? answer.choice : "";
}

await test("17.13 — live: red and blue images are told apart (images are really read)", async () => {
  requireXorKey();
  restoreEnv();
  const red = await xorColour(
    { images: [`${XOR_FIXTURE_DIR}red.png`] },
    "Look at the attached image.",
  );
  const blue = await xorColour(
    { images: [`${XOR_FIXTURE_DIR}blue.png`] },
    "Look at the attached image.",
  );
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

await test("17.14 — live: red and blue videos are told apart", async () => {
  requireXorKey();
  restoreEnv();
  const red = await xorColour(
    { video: `${XOR_FIXTURE_DIR}red.mp4` },
    "Look at the attached video.",
  );
  const blue = await xorColour(
    { video: `${XOR_FIXTURE_DIR}blue.mp4` },
    "Look at the attached video.",
  );
  assert(red === "red", "the red video must answer red");
  assert(blue === "blue", "the blue video must answer blue");
});

await test("17.15 — live: decide --provider xor --image --format json is clean JSON", async () => {
  requireXorKey();
  const result = await runCLI(
    [
      "decide",
      "Look at the attached image.",
      "--provider",
      "xor",
      "--image",
      `${XOR_FIXTURE_DIR}red.png`,
      "--format",
      "json",
      "--questions",
      JSON.stringify(XOR_COLOR_QUESTION),
    ],
    { timeoutMs: 60_000 },
  );
  if (result.exitCode !== 0 && isTransientXorCliFailure(result.stderr)) {
    throw new Error("SKIP: xor returned a transient reply");
  }
  assert(result.exitCode === 0, "the live CLI call must succeed");
  const parsed: unknown = JSON.parse(result.stdout);
  assert(
    isRecordLike(parsed) && parsed.provider === "xor",
    "stdout must be the raw JSON result",
  );
  assert(
    !looksLikeStackTrace(result.stderr),
    "stderr must not hold a stack trace",
  );
});

await test('17.16 — --video "" ⇒ one clean line, never silently dropped', async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "xor",
      "--video",
      "",
      "--questions",
      ONE_QUESTION,
    ],
    { env: XOR_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "an empty --video must fail");
  assert(
    result.stderr.includes("empty string"),
    "the failure must say the video is empty",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the failure must happen before any request",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace",
  );
});

await test("17.17 — two --video flags ⇒ refused, one clean line", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "xor",
      "--video",
      `${XOR_FIXTURE_DIR}red.mp4`,
      "--video",
      `${XOR_FIXTURE_DIR}blue.mp4`,
      "--questions",
      ONE_QUESTION,
    ],
    { env: XOR_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "two videos must be refused");
  assert(
    result.stderr.includes("at most one --video"),
    "the refusal must say only one video is allowed",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
});

await test("17.18 — a bare --video with no value ⇒ refused, never dropped", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "xor",
      "--questions",
      ONE_QUESTION,
      "--video",
    ],
    { env: XOR_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "a bare --video must fail");
  assert(
    /video/i.test(result.stderr),
    "the failure must name the flag it is about",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the failure must happen before any request",
  );
});

restoreEnv();
logSection("18. Perplexity Decisions — a hosted decision provider");

// Read off the public surface, not imported from source (rule 15).
type DecideOptions = Parameters<NeuroLink["decide"]>[0];
type DecideResult = Awaited<ReturnType<NeuroLink["decide"]>>;
type DecisionFailure = {
  kind?: string;
  status?: number;
  retryable?: boolean;
  message: string;
};

/** The structured cause every decision provider attaches to its errors, beside the message. */
function readDecisionFailure(error: unknown): DecisionFailure {
  const cause =
    error instanceof Error
      ? (
          error as Error & {
            cause?: { kind?: string; status?: number; retryable?: boolean };
          }
        ).cause
      : undefined;
  return {
    kind: cause?.kind,
    status: cause?.status,
    retryable: cause?.retryable,
    message: error instanceof Error ? error.message : "",
  };
}

/** The failure of a call that is expected to fail, or undefined when it did not. */
async function failureOf(
  run: () => Promise<unknown>,
): Promise<DecisionFailure | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return readDecisionFailure(error);
  }
}

// `fileURLToPath`, not `.pathname`: the latter stays percent-encoded, so a
// checkout under a path with a space in it would not find a single fixture.
const PERPLEXITY_FIXTURE_DIR = fileURLToPath(
  new URL("./fixtures/decide/perplexity-decider/", import.meta.url),
);

await test("18.1 — perplexity-decider declares decide and only decide, and no generation rank", async () => {
  const decider = PROVIDER_DESCRIPTORS_BY_NAME.get(
    AIProviderName.PERPLEXITY_DECIDER,
  );
  assert(
    decider !== undefined,
    "perplexity-decider has no registered descriptor",
  );
  assert(
    servesInferenceKind(decider!, "decide"),
    "perplexity-decider must declare decide",
  );
  assert(
    !servesInferenceKind(decider!, "generate") &&
      !servesInferenceKind(decider!, "stream"),
    "a model that emits no text must not declare generate or stream",
  );
  assert(
    decider!.autoSelectPriority === undefined &&
      decider!.autoSelectPreference === undefined &&
      decider!.defaultHealthSweepPriority === undefined,
    "a decision provider must stay out of every generation fallback chain",
  );
  assert(
    decider!.toolSupport === "none" && decider!.healthCheck !== "live-generate",
    "a decision provider has no tools and cannot answer a live-generate probe",
  );
  assert(
    decider!.credentialsKey === "perplexityDecider",
    "the credentials slice must be the decider's own, not the text provider's",
  );
});

await test("18.2 — it shares its key with the perplexity text provider, which stays a text provider", async () => {
  const decider = PROVIDER_DESCRIPTORS_BY_NAME.get(
    AIProviderName.PERPLEXITY_DECIDER,
  );
  const text = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.PERPLEXITY);
  assert(
    decider !== undefined && text !== undefined,
    "both perplexity descriptors must be registered",
  );
  assert(
    decider!.envVars.apiKey === "PERPLEXITY_API_KEY" &&
      text!.envVars.apiKey === decider!.envVars.apiKey,
    "the two providers must read the same key variable",
  );
  assert(
    servesInferenceKind(text!, "generate") &&
      !servesInferenceKind(text!, "decide"),
    "the text provider must keep generating and must not become a decision provider",
  );
  assert(
    (decider!.envVars.extraRequired ?? []).length === 0,
    "a hosted endpoint needs no second variable: the key alone configures it",
  );
});

await test("18.3 — it declares the limits that were measured: a state window, a question cap, images and no video", async () => {
  const decider = PROVIDER_DESCRIPTORS_BY_NAME.get(
    AIProviderName.PERPLEXITY_DECIDER,
  );
  const limits = decider?.decisionLimits;
  assert(
    limits !== undefined,
    "perplexity-decider must declare decisionLimits",
  );
  assert(
    limits!.maxStateTokens === 100_000,
    "the state window must stay at the measured 100,000 estimated tokens",
  );
  assert(
    limits!.maxStateTokens < 262_144,
    "the local window must sit inside the documented 262,144-token ceiling",
  );
  assert(
    limits!.nonAsciiTokensPerChar === 0.5,
    "non-ASCII text must be charged at the measured half a token per character",
  );
  assert(
    limits!.maxQuestions === 128,
    "the documented 128-question cap must be declared",
  );
  assert(
    limits!.media !== undefined && limits!.media.maxImages === 8,
    "up to 8 images per request must be declared",
  );
  assert(
    limits!.media!.video === false,
    "the API reads no video, so none may be declared",
  );
  assert(
    limits!.media!.maxRequestBytes === 32 * 1024 * 1024,
    "the documented 32 MiB body cap must be declared",
  );
  assert(
    decider!.timeouts?.decideMs === 10_000,
    "the default timeout must stay at 10 seconds",
  );
});

await test("18.4 — descriptor order is the precedence: typesafe, laya, xor, perplexity-decider, and cloudflare-clef last", async () => {
  const names: string[] = DECISION_PROVIDERS.map((d) => d.name);
  const index = (name: string) => names.indexOf(name);
  assert(
    index("typesafe") !== -1 &&
      index("typesafe") < index("laya") &&
      index("laya") < index("xor") &&
      index("xor") < index("perplexity-decider") &&
      index("perplexity-decider") < index("cloudflare-clef"),
    "the derived decision-provider list must read typesafe, laya, xor, perplexity-decider, cloudflare-clef",
  );
  // Perplexity and Cloudflare Clef each share an environment key with a text
  // provider, so they must come after every provider a host sets up on purpose.
  // A provider added after them would be displaced by an ambient key, which is
  // a decision to make deliberately.
  assert(
    names[names.length - 1] === "cloudflare-clef",
    "cloudflare-clef must be the last entry in the precedence order",
  );
});

await test("18.5 — precedence: a shared ambient key activates it only when nothing ahead is configured", async () => {
  try {
    clearDecisionKeys();
    process.env.TYPESAFE_API_KEY = "apikey_placeholder_for_resolution";
    process.env.LAYA_API_KEY = "sk-placeholder-for-resolution";
    process.env.LAYA_BASE_URL = "https://laya.placeholder.invalid";
    process.env.XOR_API_KEY = "sk-placeholder-for-resolution";
    process.env.XOR_BASE_URL = "https://xor.placeholder.invalid";
    process.env.PERPLEXITY_API_KEY = "pplx-placeholder-for-resolution";
    const all = resolveDefaultDecisionProvider();
    delete process.env.TYPESAFE_API_KEY;
    const withoutTypeSafe = resolveDefaultDecisionProvider();
    delete process.env.LAYA_API_KEY;
    const withoutLaya = resolveDefaultDecisionProvider();
    delete process.env.XOR_API_KEY;
    const perplexityAlone = resolveDefaultDecisionProvider();
    process.env.PERPLEXITY_API_KEY = "   ";
    const blank = resolveDefaultDecisionProvider();
    assert(
      all === "typesafe",
      "with everything configured, typesafe must stay the default",
    );
    assert(
      withoutTypeSafe === "laya",
      "without typesafe, laya must stay ahead of xor and perplexity-decider",
    );
    assert(
      withoutLaya === "xor",
      "without laya, xor must stay ahead of perplexity-decider",
    );
    assert(
      perplexityAlone === "perplexity-decider",
      "a key alone must configure perplexity-decider: it has no second variable",
    );
    assert(
      blank === undefined,
      "a whitespace-only perplexity key must not count as configured",
    );
  } finally {
    restoreEnv();
  }
});

await test("18.6 — credentials passed to the SDK count: its own slice alone, and a base URL alone does not", async () => {
  try {
    clearDecisionKeys();
    assert(
      resolveDefaultDecisionProvider({
        perplexityDecider: { apiKey: "pplx-placeholder-from-config" },
      }) === "perplexity-decider",
      "the decider's own credentials slice must configure it on its own",
    );
    assert(
      resolveDefaultDecisionProvider({
        perplexityDecider: { baseURL: "https://pplx.placeholder.invalid" },
      }) === undefined,
      "a base URL without a key must not count as configured",
    );
    assert(
      resolveDefaultDecisionProvider({
        perplexityDecider: { apiKey: "   " },
      }) === undefined,
      "a whitespace-only configured key must not count as configured",
    );
    process.env.PERPLEXITY_DECIDER_BASE_URL =
      "https://pplx.placeholder.invalid";
    assert(
      resolveDefaultDecisionProvider() === undefined,
      "the optional base URL variable must not configure it without a key",
    );
  } finally {
    restoreEnv();
  }
});

// A dead local address, so a request that got past a local refusal is recorded
// by the fetch capture and fails at once instead of reaching the real API.
const PERPLEXITY_DEAD_BASE_URL = "http://127.0.0.1:9/dead-perplexity";
const PERPLEXITY_DEAD_ROUTE = "/dead-perplexity/v1/decisions";
const PERPLEXITY_PLACEHOLDER_KEY = "pplx-placeholder-for-the-dead-address";
const PERPLEXITY_ONE_QUESTION = {
  q: { type: "boolean" as const, instructions: "Is this a test?" },
};

/** A client whose Perplexity requests can only land on the dead address. */
function deadPerplexity(baseURL = PERPLEXITY_DEAD_BASE_URL): NeuroLink {
  return new NeuroLink({
    credentials: {
      perplexityDecider: { apiKey: PERPLEXITY_PLACEHOLDER_KEY, baseURL },
    },
  });
}

/** Requests recorded for the dead address, or for a host under the reserved .invalid TLD, since the last reset. */
function escapedRequests(): number {
  return fetchCapture
    .list()
    .filter(
      (c) =>
        c.url.endsWith(PERPLEXITY_DEAD_ROUTE) || /\.invalid[:/]/.test(c.url),
    ).length;
}

await test("18.7 — the key is shared through the environment only: the text provider's credentials do not configure decide", async () => {
  try {
    clearDecisionKeys();
    const textOnly = {
      perplexity: { apiKey: "pplx-placeholder-for-the-text-provider" },
    };
    assert(
      resolveDefaultDecisionProvider(textOnly) === undefined,
      "the text provider's credentials slice must not configure the decision provider",
    );
    process.env.PERPLEXITY_API_KEY = "pplx-placeholder-from-the-environment";
    assert(
      resolveDefaultDecisionProvider() === "perplexity-decider",
      "the shared environment variable must configure the decision provider",
    );
    delete process.env.PERPLEXITY_API_KEY;

    fetchCapture.reset();
    const unnamed = await failureOf(() =>
      new NeuroLink({ credentials: textOnly }).decide({
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
    assert(
      unnamed !== undefined &&
        unnamed.message.includes("No decision provider is configured"),
      "the text provider's slice alone must leave decide with no provider to use",
    );

    const named = await failureOf(() =>
      new NeuroLink({
        credentials: {
          ...textOnly,
          perplexityDecider: { baseURL: PERPLEXITY_DEAD_BASE_URL },
        },
      }).decide({
        provider: "perplexity-decider",
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
    assert(
      named?.kind === "authentication" &&
        named.message.includes("PERPLEXITY_API_KEY"),
      "naming the decider with only the text provider's slice must be refused, saying which variable to set",
    );
    assert(
      escapedRequests() === 0,
      "a call with no key of its own must not send anything",
    );
  } finally {
    restoreEnv();
  }
});

await test("18.8 — an ambient perplexity key cannot leak into a keyless test", async () => {
  try {
    // A developer's own TypeSafe, Laya or XOR key outranks this one, and the
    // suite loads their .env, so start from nothing configured.
    clearDecisionKeys();
    process.env.PERPLEXITY_API_KEY = "pplx-ambient-placeholder";
    process.env.PERPLEXITY_DECIDER_BASE_URL = "https://pplx.ambient.invalid";
    process.env.PERPLEXITY_DECIDER_MODEL = "ambient-placeholder-model";
    assert(
      resolveDefaultDecisionProvider() === "perplexity-decider",
      "precondition: with nothing ahead configured, the ambient key must be seen",
    );
    clearDecisionKeys();
    assert(
      resolveDefaultDecisionProvider() === undefined,
      "clearDecisionKeys must clear the perplexity key too",
    );
    assert(
      process.env.PERPLEXITY_DECIDER_BASE_URL === undefined &&
        process.env.PERPLEXITY_DECIDER_MODEL === undefined,
      "clearDecisionKeys must clear the perplexity base URL and model too",
    );
  } finally {
    restoreEnv();
  }
});

await test("18.9 — the SDK's nothing-configured error names perplexity's variable too", async () => {
  let failure: DecisionFailure | undefined;
  try {
    clearDecisionKeys();
    failure = await failureOf(() =>
      new NeuroLink().decide({
        state: "x",
        questions: { q: { type: "boolean", instructions: "?" } },
      }),
    );
  } finally {
    restoreEnv();
  }
  assert(failure !== undefined, "decide must fail with nothing configured");
  assert(
    failure.message.includes("PERPLEXITY_API_KEY") &&
      failure.message.includes("XOR_") &&
      failure.message.includes("LAYA_") &&
      failure.message.includes("TYPESAFE_"),
    "the error must name the variable for each decision provider",
  );
});

await test("18.10 — decide --provider perplexity-decider with no credential ⇒ one clean line", async () => {
  const result = await runCLI(
    [
      "decide",
      "Refund request for a damaged item",
      "--provider",
      "perplexity-decider",
      "--questions",
      ONE_QUESTION,
    ],
    { env: NO_PROVIDER_ENV, timeoutMs: 30_000 },
  );
  assert(
    result.exitCode !== 0,
    "decide must fail without a perplexity credential",
  );
  assert(
    result.stderr.includes("PERPLEXITY_API_KEY") &&
      result.stderr.includes("credentials.perplexityDecider.apiKey"),
    "the failure line must be perplexity-decider's own: the variable and the credentials slice to set",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace instead of a clean message",
  );
});

// ───────────────────────────────────────────────────────────────────────────
// Local refusals. Each one is a request the API would answer badly or not at
// all (a 400, or a minute's stall and a 504), so the provider turns it away
// before any request. The dead address and the fetch capture prove "before any
// request" rather than assume it.
// ───────────────────────────────────────────────────────────────────────────

type RefusalOptions = Omit<DecideOptions, "provider" | "questions"> &
  Partial<Pick<DecideOptions, "questions">>;

/** A request that must get past every local check and fail at the dead address. */
async function expectReachesTransport(
  label: string,
  options: RefusalOptions,
): Promise<void> {
  fetchCapture.reset();
  const failure = await failureOf(() =>
    deadPerplexity().decide({
      provider: "perplexity-decider",
      questions: PERPLEXITY_ONE_QUESTION,
      ...options,
    }),
  );
  assert(
    failure?.kind === "network",
    `${label}: the request must get as far as the transport`,
  );
  assert(
    escapedRequests() >= 1,
    `${label}: the request must be recorded on its way out`,
  );
}

/** A request that must be refused locally: its kind and wording, and zero requests sent. */
async function expectLocalRefusal(
  label: string,
  options: RefusalOptions,
  expected: { kind: string; text: string },
): Promise<void> {
  fetchCapture.reset();
  const failure = await failureOf(() =>
    deadPerplexity().decide({
      provider: "perplexity-decider",
      questions: PERPLEXITY_ONE_QUESTION,
      ...options,
    }),
  );
  assert(
    failure !== undefined,
    `${label}: the request must be refused, not answered`,
  );
  assert(
    failure.kind === expected.kind,
    `${label}: the refusal has the wrong kind`,
  );
  assert(
    failure.message.includes(expected.text),
    `${label}: the refusal must say why`,
  );
  assert(
    failure.retryable === false,
    `${label}: a refusal must not be retryable`,
  );
  assert(
    escapedRequests() === 0,
    `${label}: a refused request must never reach the transport`,
  );
}

await test("18.11 — positive control: a valid request reaches the transport, however the base URL is spelled", async () => {
  // Without this, every zero-request assertion below could pass because the
  // capture sees nothing at all.
  for (const baseURL of [
    PERPLEXITY_DEAD_BASE_URL,
    `${PERPLEXITY_DEAD_BASE_URL}/`,
    `${PERPLEXITY_DEAD_BASE_URL}/v1`,
    `${PERPLEXITY_DEAD_BASE_URL}/v1/`,
  ]) {
    fetchCapture.reset();
    const failure = await failureOf(() =>
      deadPerplexity(baseURL).decide({
        provider: "perplexity-decider",
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
    assert(
      failure?.kind === "network",
      "a request to a dead address must fail at the transport",
    );
    assert(
      escapedRequests() >= 1,
      "every spelling of the base URL must reach the same route, recorded on its way out",
    );
  }
  // The same filter also has to see a request to a .invalid host, which the
  // remote-URL refusal below relies on.
  fetchCapture.reset();
  await fetch("http://control.example.invalid/", {
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
  assert(
    escapedRequests() === 1,
    "a request to a .invalid host must be recorded too",
  );
});

const TINY_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

await test("18.12 — a GIF is refused locally, as a Buffer and as a data: URL", async () => {
  const refusal = { kind: "invalid_request", text: "PNG, JPEG or WebP" };
  await expectLocalRefusal(
    "a GIF Buffer",
    { state: "x", images: [TINY_GIF] },
    refusal,
  );
  await expectLocalRefusal(
    "a GIF data URL",
    {
      state: "x",
      images: [`data:image/gif;base64,${TINY_GIF.toString("base64")}`],
    },
    refusal,
  );
});

await test("18.13 — a remote image URL is refused locally, and never fetched for you", async () => {
  await expectLocalRefusal(
    "a remote image URL",
    { state: "x", images: ["https://images.example.invalid/red.png"] },
    { kind: "invalid_request", text: "remote URL" },
  );
});

await test("18.14 — a video is refused locally: the API reads images only", async () => {
  const refusal = { kind: "invalid_request", text: "does not accept video" };
  await expectLocalRefusal(
    "a video",
    { state: "x", video: `${XOR_FIXTURE_DIR}red.mp4` },
    refusal,
  );
  await expectLocalRefusal(
    "a video beside a valid image",
    {
      state: "x",
      images: [`${PERPLEXITY_FIXTURE_DIR}red.png`],
      video: `${XOR_FIXTURE_DIR}red.mp4`,
    },
    refusal,
  );
});

await test("18.15 — nine images are refused locally, and eight are sent", async () => {
  const image = `${PERPLEXITY_FIXTURE_DIR}red.png`;
  await expectLocalRefusal(
    "nine images",
    { state: "x", images: Array.from({ length: 9 }, () => image) },
    { kind: "invalid_request", text: "at most 8 images" },
  );
  await expectReachesTransport("eight images", {
    state: "x",
    images: Array.from({ length: 8 }, () => image),
  });
});

await test("18.16 — an image past 2,048 tiles of 32x32 pixels is refused locally, in every format the API reads", async () => {
  // The API does not refuse these: it holds the request for about a minute and
  // answers 504. 1600x1310 is the documentation's own example of one that does
  // not fit: 50 x 41 tiles once each side is rounded to a multiple of 32.
  const refusal = (size: string) => ({
    kind: "invalid_request",
    text: `${size} pixels`,
  });
  await expectLocalRefusal(
    "a 2048x2048 PNG",
    { state: "x", images: [flatPng(2048, 2048)] },
    refusal("2048x2048"),
  );
  await expectLocalRefusal(
    "a 1600x1310 PNG",
    { state: "x", images: [flatPng(1600, 1310)] },
    refusal("1600x1310"),
  );
  await expectLocalRefusal(
    "a 1600x1310 JPEG",
    {
      state: "x",
      images: [`${PERPLEXITY_FIXTURE_DIR}too-large-1600x1310.jpg`],
    },
    refusal("1600x1310"),
  );
  // A WebP header comes in three layouts that put the size in different
  // places: lossy (VP8), lossless (VP8L) and extended (VP8X, what an alpha
  // channel produces). One real file of each.
  for (const [layout, file] of [
    ["lossy", "too-large-1600x1310.webp"],
    ["lossless", "too-large-1600x1310-lossless.webp"],
    ["extended", "too-large-1600x1310-alpha.webp"],
  ]) {
    await expectLocalRefusal(
      `a 1600x1310 ${layout} WebP`,
      { state: "x", images: [`${PERPLEXITY_FIXTURE_DIR}${file}`] },
      refusal("1600x1310"),
    );
  }
});

await test("18.17 — the sizes the API documents as fitting are sent", async () => {
  await expectReachesTransport("a 1440x1440 PNG", {
    state: "x",
    images: [flatPng(1440, 1440)],
  });
  await expectReachesTransport("a 2048x1024 PNG", {
    state: "x",
    images: [flatPng(2048, 1024)],
  });
});

await test("18.18 — a state past the window is refused locally, and one inside it is sent", async () => {
  // ASCII is estimated at a quarter of a token per character plus a 5% margin,
  // against a window of 100,000 tokens: roughly 381,000 characters.
  await expectLocalRefusal(
    "a 390,000-character ASCII state",
    { state: "x".repeat(390_000) },
    { kind: "max_tokens_exceeded", text: "Shorten the state" },
  );
  await expectReachesTransport("a 370,000-character ASCII state", {
    state: "x".repeat(370_000),
  });
});

await test("18.19 — the CJK charge is pinned from both sides: 190,000 characters are sent and 210,000 are refused", async () => {
  // Half a token per character: 95,000 and 105,000 estimated tokens against the
  // same 100,000. What the server charges per CJK character depends on the text
  // (0.46 and 0.55 were measured live for two different texts), so half a token
  // is a mid-range charge, not an upper bound; the window sitting well inside
  // the server's 262,144-token ceiling is what absorbs the difference. The
  // first state goes out, and the live test below shows the API accepts it.
  await expectReachesTransport("190,000 CJK characters", {
    state: "中".repeat(190_000),
  });
  await expectLocalRefusal(
    "210,000 CJK characters",
    { state: "中".repeat(210_000) },
    { kind: "max_tokens_exceeded", text: "Shorten the state" },
  );
});

await test("18.20 — 129 questions are refused locally, and 128 are sent", async () => {
  const questions = (count: number) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `q${i}`,
        { type: "boolean" as const, instructions: "Is this a test?" },
      ]),
    );
  await expectLocalRefusal(
    "129 questions",
    { state: "x", questions: questions(129) },
    { kind: "max_tokens_exceeded", text: "at most 128 questions" },
  );
  await expectReachesTransport("128 questions", {
    state: "x",
    questions: questions(128),
  });
});

// The CLI refusals use a dead local address too, so a request that escaped to
// the network would surface as a connection error instead of the refusal. The
// positive control below proves that address really is where a sent request
// lands, so the refusals after it are not passing vacuously.
const PERPLEXITY_CLI_ENV = {
  ...NO_PROVIDER_ENV,
  PERPLEXITY_API_KEY: "pplx-placeholder-for-cli",
  PERPLEXITY_DECIDER_BASE_URL: "http://127.0.0.1:9/pplx",
};

await test("18.21 — positive control: a valid image request does reach the transport", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "perplexity-decider",
      "--image",
      `${PERPLEXITY_FIXTURE_DIR}red.png`,
      "--questions",
      ONE_QUESTION,
    ],
    { env: PERPLEXITY_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "nothing listens on the dead address");
  assert(
    /ECONNREFUSED|network|fetch failed/i.test(result.stderr),
    "a valid request must fail at the transport, which is what the refusals below must not do",
  );
});

await test("18.22 — nine --image flags ⇒ refused locally, one clean line", async () => {
  const args = [
    "decide",
    "The state text",
    "--provider",
    "perplexity-decider",
    "--questions",
    ONE_QUESTION,
  ];
  for (let i = 0; i < 9; i++) {
    args.push("--image", `${PERPLEXITY_FIXTURE_DIR}red.png`);
  }
  const result = await runCLI(args, {
    env: PERPLEXITY_CLI_ENV,
    timeoutMs: 30_000,
  });
  assert(result.exitCode !== 0, "nine images must be refused");
  assert(result.stderr.includes("at most 8"), "the refusal must say the limit");
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the refusal printed a stack trace",
  );
});

await test("18.23 — --video ⇒ refused before any request, because the API reads no video", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "perplexity-decider",
      "--video",
      `${XOR_FIXTURE_DIR}red.mp4`,
      "--questions",
      ONE_QUESTION,
    ],
    { env: PERPLEXITY_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "a video must be refused");
  assert(
    result.stderr.includes("does not accept video"),
    "the refusal must say why",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the refusal printed a stack trace",
  );
});

await test("18.24 — a missing --image file ⇒ one clean line naming the image", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "perplexity-decider",
      "--image",
      `${PERPLEXITY_FIXTURE_DIR}no-such-file.png`,
      "--questions",
      ONE_QUESTION,
    ],
    { env: PERPLEXITY_CLI_ENV, timeoutMs: 30_000 },
  );
  assert(result.exitCode !== 0, "a missing image must fail");
  assert(
    result.stderr.includes("Could not read Image 1"),
    "the failure must name the image",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the failure must happen before any request",
  );
  assert(
    !looksLikeStackTrace(result.stdout + result.stderr),
    "the failure printed a stack trace",
  );
});

await test("18.25 — a base URL that carries a credential ⇒ refused locally, never echoed", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "perplexity-decider",
      "--questions",
      ONE_QUESTION,
    ],
    {
      env: {
        ...PERPLEXITY_CLI_ENV,
        PERPLEXITY_DECIDER_BASE_URL:
          "https://ops:hunter2-basic@pplx.internal.invalid/proxy",
      },
      timeoutMs: 30_000,
    },
  );
  assert(result.exitCode !== 0, "a credentialed base URL must be refused");
  assert(
    result.stderr.includes("PERPLEXITY_DECIDER_BASE_URL"),
    "the refusal must say which variable to fix",
  );
  assert(
    !(result.stdout + result.stderr).includes("hunter2"),
    "nothing from the base URL may be echoed",
  );
  assert(
    !/ECONNREFUSED|network/i.test(result.stderr),
    "the refusal must happen before any request",
  );
});

await test("18.26 — typesafe refuses an image and names perplexity-decider as one that takes it", async () => {
  const result = await runCLI(
    [
      "decide",
      "The state text",
      "--provider",
      "typesafe",
      "--image",
      `${PERPLEXITY_FIXTURE_DIR}red.png`,
      "--questions",
      ONE_QUESTION,
    ],
    {
      env: {
        ...PERPLEXITY_CLI_ENV,
        TYPESAFE_API_KEY: "apikey_placeholder_for_cli",
        TYPESAFE_BASE_URL: "http://127.0.0.1:9/typesafe",
      },
      timeoutMs: 30_000,
    },
  );
  assert(result.exitCode !== 0, "typesafe must refuse an image");
  assert(
    result.stderr.includes("does not accept images") &&
      result.stderr.includes("perplexity-decider"),
    "the refusal must name the providers that do read images",
  );
});

// The real API's 401 never repeats the key, so no live call can show that a
// repeated one is stripped. A gateway at PERPLEXITY_DECIDER_BASE_URL can, so
// this one does: it answers 401 and repeats the bearer token it was sent,
// beside a key-shaped string that was never configured. The configured key is
// not shaped like a Perplexity key, so only an exact-match strip can remove it.
const ECHOED_KEY = "placeholder-key-the-gateway-repeats";
const ECHOED_STRANGER = `pplx-${"k".repeat(48)}`;

type GatewayAnswer = { status: number; body: unknown };

/** Runs `run` against a local gateway that answers each request as `answer` says, handing it the bearer token of every request the gateway has received. */
async function withGateway<T>(
  answer: (bearer: string) => GatewayAnswer,
  run: (baseURL: string, bearers: readonly string[]) => Promise<T>,
): Promise<T> {
  const bearers: string[] = [];
  const gateway = createServer((request, response) => {
    request.resume();
    const bearer = (request.headers.authorization ?? "").replace(
      /^Bearer /,
      "",
    );
    bearers.push(bearer);
    const { status, body } = answer(bearer);
    response.writeHead(status, {
      "content-type": "application/json",
      connection: "close",
    });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  try {
    const address = gateway.address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;
    assert(port > 0, "the test gateway must listen on a port");
    return await run(`http://127.0.0.1:${port}`, bearers);
  } finally {
    gateway.closeAllConnections();
    await new Promise<void>((resolve) => gateway.close(() => resolve()));
  }
}

/** A gateway that refuses with a 401 and repeats the bearer token it was sent, beside a key-shaped string it never saw. */
const withEchoingGateway = <T>(
  run: (baseURL: string, bearers: readonly string[]) => Promise<T>,
): Promise<T> =>
  withGateway(
    (bearer) => ({
      status: 401,
      body: {
        error: {
          message: `Invalid key ${bearer}, and ${ECHOED_STRANGER} is not on file`,
          type: "invalid_request_error",
          code: 401,
        },
      },
    }),
    run,
  );

await test("18.26b — a gateway that repeats the key in its error text: the reason stays and the key does not, in the SDK and the CLI", async () => {
  await withEchoingGateway(async (baseURL, bearers) => {
    const failure = await failureOf(() =>
      new NeuroLink({
        credentials: { perplexityDecider: { apiKey: ECHOED_KEY, baseURL } },
      }).decide({
        provider: "perplexity-decider",
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
    const message = failure?.message ?? "";
    // The gateway's body repeats whatever bearer it received, so this is what
    // makes the keys' absence below mean something: they were sent, and repeated.
    // Read into a number first: asserting on `bearers.length` itself narrows it
    // to the literal 1, and the count after the CLI call could not be compared.
    const sentBySdk: number = bearers.length;
    assert(
      sentBySdk === 1 && bearers[0] === ECHOED_KEY,
      "precondition: the configured key must reach the gateway, once",
    );
    assert(
      failure?.kind === "authentication" && failure.status === 401,
      "the gateway's refusal must come back as authentication with its own status",
    );
    assert(
      !message.includes(ECHOED_KEY),
      "the configured key must be stripped from the failure",
    );
    assert(
      !message.includes(ECHOED_STRANGER),
      "a key-shaped string must be stripped from the failure",
    );
    assert(
      message.includes("is not on file"),
      "the gateway's own reason must be kept",
    );

    const result = await runCLI(
      [
        "decide",
        "The state text",
        "--provider",
        "perplexity-decider",
        "--questions",
        ONE_QUESTION,
      ],
      {
        env: {
          ...NO_PROVIDER_ENV,
          PERPLEXITY_API_KEY: ECHOED_KEY,
          PERPLEXITY_DECIDER_BASE_URL: baseURL,
        },
        timeoutMs: 30_000,
      },
    );
    const output = result.stdout + result.stderr;
    assert(result.exitCode !== 0, "a refused key must exit non-zero");
    assert(
      bearers.length === 2 && bearers[1] === ECHOED_KEY,
      "precondition: the CLI must send the configured key to the gateway too",
    );
    assert(
      !output.includes(ECHOED_KEY) && !output.includes(ECHOED_STRANGER),
      "neither repeated key may reach the CLI's output",
    );
    assert(
      output.includes("is not on file"),
      "the CLI must print the gateway's own reason",
    );
  });
});

// The CLI's success path, without a key or a network: the one live test of it
// (18.34) skips whenever the service does not answer, and a CLI that never
// exits would otherwise be invisible here. The harness reports a command it had
// to kill as exit code -1, which this test does not accept.
await test("18.26c — the CLI against a gateway that answers: exit 0, clean JSON on stdout, the key sent once", async () => {
  await withGateway(
    () => ({
      status: 200,
      body: {
        model: "pplx-decider-v1-27b",
        answers: { urgent: { type: "noul", noul: 0.75 } },
        usage: { input_tokens: 7, output_tokens: 1 },
      },
    }),
    async (baseURL, bearers) => {
      const result = await runCLI(
        [
          "decide",
          "The state text",
          "--provider",
          "perplexity-decider",
          "--format",
          "json",
          "--questions",
          ONE_QUESTION,
        ],
        {
          env: {
            ...NO_PROVIDER_ENV,
            PERPLEXITY_API_KEY: ECHOED_KEY,
            PERPLEXITY_DECIDER_BASE_URL: baseURL,
          },
          timeoutMs: 30_000,
        },
      );
      assert(
        result.exitCode === 0,
        "the CLI must exit 0 once the gateway has answered",
      );
      const sent: number = bearers.length;
      assert(
        sent === 1 && bearers[0] === ECHOED_KEY,
        "the configured key must reach the gateway, once",
      );
      const parsed: unknown = JSON.parse(result.stdout);
      assert(
        isRecordLike(parsed) && parsed.provider === "perplexity-decider",
        "stdout must be the raw JSON result",
      );
      const answers = isRecordLike(parsed) ? parsed.answers : undefined;
      const urgent = isRecordLike(answers) ? answers.urgent : undefined;
      assert(
        isRecordLike(urgent) &&
          urgent.type === "boolean" &&
          urgent.probability === 0.75,
        "the gateway's answer must come through as a boolean probability",
      );
      assert(
        !looksLikeStackTrace(result.stderr),
        "stderr must not hold a stack trace",
      );
    },
  );
});

// ───────────────────────────────────────────────────────────────────────────
// Against the real API. A service that is busy, throttled or unreachable says
// nothing about the contract, and neither does a key it refuses, so those skip;
// a 200 without an answers map is a changed response format and fails.
// ───────────────────────────────────────────────────────────────────────────

function isTransientPerplexityFailure(failure: DecisionFailure): boolean {
  return (
    ["rate_limit", "overloaded", "timeout", "network"].includes(
      failure.kind ?? "",
    ) ||
    (failure.kind === "server" && (failure.status ?? 0) >= 500)
  );
}

/** Skipped by kind, not by the wording of the refusal, which would split the live half between skips and failures. */
function isRefusedPerplexityKey(failure: DecisionFailure): boolean {
  return failure.kind === "authentication";
}

/** The CLI prints no status, so a transient failure is told apart by its text; a 200 with no answers is not transient. */
function isTransientPerplexityCliFailure(stderr: string): boolean {
  return (
    [
      "timed out",
      "rate-limiting",
      "overloaded",
      "network error",
      "server error",
    ].some((phrase) => stderr.includes(phrase)) &&
    !stderr.includes("answers map")
  );
}

/** The CLI's own line for the `authentication` kind, which is what a refused key prints. */
function isRefusedPerplexityCliKey(stderr: string): boolean {
  return stderr.includes("Authentication failed");
}

/** One real decision against the configured endpoint, skipping on a transient or refused-key reply. */
async function decideLive(
  options: Omit<DecideOptions, "provider">,
): Promise<DecideResult> {
  restoreEnv();
  try {
    return await new NeuroLink().decide({
      provider: "perplexity-decider",
      ...options,
    });
  } catch (error) {
    const failure = readDecisionFailure(error);
    if (isTransientPerplexityFailure(failure)) {
      throw new Error("SKIP: perplexity returned a transient reply", {
        cause: error,
      });
    }
    if (isRefusedPerplexityKey(failure)) {
      throw new Error("SKIP: perplexity refused the configured key", {
        cause: error,
      });
    }
    throw error;
  }
}

/** The API echoes the model it was sent, so compare against the requested one, never a name prefix. */
function requestedPerplexityModel(): string {
  return process.env.PERPLEXITY_DECIDER_MODEL?.trim() || "pplx-decider-v1-27b";
}

await test("18.27 — a rejected key reaches the real API and comes back as authentication, sent once", async () => {
  // Needs no credential of ours: the point is that the API's own 401 maps to
  // `authentication` and that it is not retried. Whether a repeated key is
  // stripped is 18.26b: this API's 401 never repeats it, so nothing here shows it.
  const rejectedKey = "pplx-definitely-not-a-valid-key-0123456789";
  let failure: DecisionFailure | undefined;
  try {
    // Cleared so the default endpoint is the one asked, whatever a
    // developer's own .env holds.
    clearDecisionKeys();
    fetchCapture.reset();
    failure = await failureOf(() =>
      new NeuroLink({
        credentials: { perplexityDecider: { apiKey: rejectedKey } },
      }).decide({
        provider: "perplexity-decider",
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
  } finally {
    restoreEnv();
  }
  assert(failure !== undefined, "a rejected key must not produce an answer");
  if (isTransientPerplexityFailure(failure)) {
    throw new Error("SKIP: the Perplexity API was unreachable or throttled");
  }
  assert(
    failure.kind === "authentication" && failure.status === 401,
    "a rejected key must come back as authentication, with the API's own status",
  );
  assert(failure.retryable === false, "a rejected key must not be retried");
  assert(
    fetchCapture
      .list()
      .filter((c) => c.url === "https://api.perplexity.ai/v1/decisions")
      .length === 1,
    "a rejected key must be sent exactly once, to the default endpoint",
  );
});

// The example from the API's own quickstart: one review, three questions.
const PERPLEXITY_DOCS_STATE = {
  title: "Battery died after two weeks",
  review:
    "The headphones sound great, but the battery stopped charging after two weeks.",
};
const PERPLEXITY_DOCS_QUESTIONS = {
  defect: {
    type: "boolean",
    instructions: "Does the review report a product defect?",
  },
  sentiment: {
    type: "choice",
    instructions: "What is the overall sentiment of the review?",
    criteria: {
      positive: "Mostly satisfied",
      mixed: "Praise and complaints in one review",
      negative: "Mostly dissatisfied",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe is the reported problem?",
    criteria: ["Cosmetic", "Inconvenient", "Product unusable"],
  },
} as const;

await test("18.28 — live: the documentation's example answers boolean, choice and score", async () => {
  requirePerplexityKey();
  const result = await decideLive({
    state: PERPLEXITY_DOCS_STATE,
    questions: PERPLEXITY_DOCS_QUESTIONS,
  });
  const { defect, sentiment, severity } = result.answers;
  assert(
    result.provider === "perplexity-decider",
    "the result must come from perplexity-decider",
  );
  assert(
    defect?.type === "boolean" && defect.probability > 0.5,
    "a review that reports a broken battery must score above one half for a defect",
  );
  assert(
    sentiment?.type === "choice" && sentiment.choice === "mixed",
    "praise and a complaint in one review must read as mixed",
  );
  assert(
    Object.keys(sentiment.probabilities).sort().join() ===
      "mixed,negative,positive",
    "the distribution must cover exactly the options that were offered",
  );
  assert(
    Math.abs(
      Object.values(sentiment.probabilities).reduce((a, b) => a + b, 0) - 1,
    ) < 0.05,
    "the probabilities must sum to about one",
  );
  assert(
    sentiment.confidence >= 0 && sentiment.confidence <= 1,
    "the choice confidence must be a probability",
  );
  assert(
    severity?.type === "score" && severity.score >= 1 && severity.score <= 2,
    "a battery that stopped charging must score between inconvenient and unusable",
  );
  assert(
    severity.legend["0"] === "Cosmetic" &&
      severity.legend["2"] === "Product unusable",
    "the legend must map each level back to the rubric",
  );
  assert(
    result.model === requestedPerplexityModel(),
    "the reported model must be the one that was asked for",
  );
  assert(result.usage.inputTokens > 0, "usage must be reported");
  assert(result.latencyMs > 0, "latency must be measured");
  assert(
    typeof result.requestId === "string" && result.requestId.length > 0,
    "the request id header must be carried through",
  );
  assert(
    result.mediaBytes === undefined,
    "a request with no image must report no media",
  );
});

const PERPLEXITY_COLOR_QUESTION = {
  color: {
    type: "choice" as const,
    instructions: "What color is the attached image?",
    criteria: { red: "red", blue: "blue", green: "green", yellow: "yellow" },
  },
};

async function perplexityColour(
  images: NonNullable<DecideOptions["images"]>,
): Promise<string> {
  const result = await decideLive({
    state: "Look at the attached image.",
    questions: PERPLEXITY_COLOR_QUESTION,
    images,
  });
  const answer = result.answers.color;
  assert(answer?.type === "choice", "color must be a choice answer");
  assert((result.mediaBytes ?? 0) > 0, "the image must be reported as sent");
  return answer.choice;
}

const readFixture = (name: string): Buffer =>
  readFileSync(`${PERPLEXITY_FIXTURE_DIR}${name}`);

// Each format arrives in a different form, so one run also shows that a file
// path, a Buffer and a data: URL all reach the API as the image they hold.
await test("18.29 — live: red and blue PNG images (file paths) are told apart", async () => {
  requirePerplexityKey();
  const red = await perplexityColour([`${PERPLEXITY_FIXTURE_DIR}red.png`]);
  const blue = await perplexityColour([`${PERPLEXITY_FIXTURE_DIR}blue.png`]);
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

await test("18.30 — live: red and blue JPEG images (Buffers) are told apart", async () => {
  requirePerplexityKey();
  const red = await perplexityColour([readFixture("red.jpg")]);
  const blue = await perplexityColour([readFixture("blue.jpg")]);
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

await test("18.31 — live: red and blue WebP images (data: URLs) are told apart", async () => {
  requirePerplexityKey();
  const dataUrl = (name: string) =>
    `data:image/webp;base64,${readFixture(name).toString("base64")}`;
  const red = await perplexityColour([dataUrl("red.webp")]);
  const blue = await perplexityColour([dataUrl("blue.webp")]);
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

/** Digits from a seeded generator: a fixed text with no repeating structure for a tokenizer to merge. */
function digitState(length: number): string {
  let seed = 0x2545f491;
  const digits: string[] = [];
  for (let i = 0; i < length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    digits.push(String((seed >>> 16) % 10));
  }
  return digits.join("");
}

await test("18.32 — live: a state past the server's own ceiling comes back as max_tokens_exceeded with status 400, sent once", async () => {
  requirePerplexityKey();
  // 360,000 digits estimate at 94,500 tokens, inside the local window, yet the
  // server counts them against its own 262,144-token ceiling and refuses.
  const state = digitState(360_000);
  await expectReachesTransport("the 360,000-digit state", {
    state,
    timeoutMs: 30_000,
  });

  restoreEnv();
  fetchCapture.reset();
  const startedAt = Date.now();
  const failure = await failureOf(() =>
    new NeuroLink().decide({
      provider: "perplexity-decider",
      state,
      questions: PERPLEXITY_ONE_QUESTION,
      timeoutMs: 30_000,
    }),
  );
  const elapsedMs = Date.now() - startedAt;
  assert(
    failure !== undefined,
    "a state past the server's ceiling must be refused, not answered",
  );
  if (isTransientPerplexityFailure(failure)) {
    throw new Error("SKIP: perplexity returned a transient reply");
  }
  if (isRefusedPerplexityKey(failure)) {
    throw new Error("SKIP: perplexity refused the configured key");
  }
  assert(
    failure.kind === "max_tokens_exceeded",
    "the server's over-length refusal must map to max_tokens_exceeded",
  );
  assert(
    failure.status === 400,
    "the refusal must carry the server's own status, which shows it was not the local window",
  );
  assert(
    failure.retryable === false,
    "an over-length request must not be retried",
  );
  assert(
    fetchCapture
      .list()
      .filter((c) => c.method === "POST" && c.url.endsWith("/v1/decisions"))
      .length === 1,
    "the over-length request must be sent exactly once",
  );
  // Printed, not asserted: a 400 that arrives late is still the explicit
  // refusal, and the status above is what shows it was one.
  console.log(`    refused by the server in ${elapsedMs}ms`);
});

const CJK_PARAGRAPH =
  "客户在周一下午提交了退款申请，原因是收到的商品与页面描述不符，包装也有明显的破损。客服人员核对了订单记录和物流信息，确认商品在运输途中受到挤压，因此同意全额退款，并将在三个工作日内把款项退回到原支付账户。";

/** Exactly `chars` characters of running Chinese text, all in the Basic Multilingual Plane. */
function cjkState(chars: number): string {
  return CJK_PARAGRAPH.repeat(Math.ceil(chars / CJK_PARAGRAPH.length)).slice(
    0,
    chars,
  );
}

await test("18.33 — live: 190,000 CJK characters are accepted by the server as well as by the local window", async () => {
  requirePerplexityKey();
  // 190,000 characters at half a token each is 95,000 estimated tokens, so the
  // window lets them through. The figure printed below is what the server
  // counted for this paragraph; a change in it is worth a look, not a failure.
  const chars = 190_000;
  const result = await decideLive({
    state: cjkState(chars),
    questions: PERPLEXITY_ONE_QUESTION,
    timeoutMs: 30_000,
  });
  assert(
    result.answers.q?.type === "boolean",
    "the question must be answered, not refused",
  );
  assert(
    result.usage.inputTokens > 0 && result.usage.inputTokens < 262_144,
    "the server's own count must sit inside its ceiling",
  );
  console.log(
    `    measured ${(result.usage.inputTokens / chars).toFixed(3)} input tokens per character over ${chars} characters in ${result.latencyMs}ms`,
  );
});

await test("18.34 — live: decide --provider perplexity-decider --image --format json is clean JSON", async () => {
  requirePerplexityKey();
  restoreEnv();
  const result = await runCLI(
    [
      "decide",
      "Look at the attached image.",
      "--provider",
      "perplexity-decider",
      "--image",
      `${PERPLEXITY_FIXTURE_DIR}red.png`,
      "--format",
      "json",
      "--questions",
      JSON.stringify(PERPLEXITY_COLOR_QUESTION),
    ],
    { timeoutMs: 60_000 },
  );
  // A positive exit code only: the harness reports a command it had to kill as
  // -1 and writes "timed out" into stderr itself, which the predicate would
  // otherwise read as the service being slow, turning a CLI that never exits
  // into a skip.
  if (result.exitCode > 0 && isTransientPerplexityCliFailure(result.stderr)) {
    throw new Error("SKIP: perplexity returned a transient reply");
  }
  if (result.exitCode > 0 && isRefusedPerplexityCliKey(result.stderr)) {
    throw new Error("SKIP: perplexity refused the configured key");
  }
  assert(result.exitCode === 0, "the live CLI call must succeed");
  const parsed: unknown = JSON.parse(result.stdout);
  assert(
    isRecordLike(parsed) && parsed.provider === "perplexity-decider",
    "stdout must be the raw JSON result",
  );
  const answers = isRecordLike(parsed) ? parsed.answers : undefined;
  const color = isRecordLike(answers) ? answers.color : undefined;
  assert(
    isRecordLike(color) && color.choice === "red",
    "the image the CLI sent must be read as red",
  );
  assert(
    !looksLikeStackTrace(result.stderr),
    "stderr must not hold a stack trace",
  );
});

// ───────────────────────────────────────────────────────────────────────
// 19. Cloudflare Clef (decide-only), on Workers AI
// ───────────────────────────────────────────────────────────────────────

await test("19.1 — cloudflare-clef declares decide and only decide, and no generation rank", async () => {
  const clef = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.CLOUDFLARE_CLEF);
  assert(clef !== undefined, "cloudflare-clef has no registered descriptor");
  assert(
    servesInferenceKind(clef!, "decide"),
    "cloudflare-clef must declare decide",
  );
  assert(
    !servesInferenceKind(clef!, "generate") &&
      !servesInferenceKind(clef!, "stream"),
    "a model that emits no text must not declare generate or stream",
  );
  assert(
    clef!.autoSelectPriority === undefined &&
      clef!.autoSelectPreference === undefined &&
      clef!.defaultHealthSweepPriority === undefined,
    "a decision provider must stay out of every generation fallback chain",
  );
  assert(
    clef!.toolSupport === "none" && clef!.healthCheck !== "live-generate",
    "a decision provider has no tools and cannot answer a live-generate probe",
  );
  assert(
    clef!.credentialsKey === "cloudflareClef",
    "the credentials slice must be Clef's own, not the text provider's",
  );
});

await test("19.2 — it shares its token and account id with the cloudflare text provider, which stays a text provider", async () => {
  const clef = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.CLOUDFLARE_CLEF);
  const text = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.CLOUDFLARE);
  assert(
    clef !== undefined && text !== undefined,
    "both cloudflare descriptors must be registered",
  );
  assert(
    clef!.envVars.apiKey === "CLOUDFLARE_API_KEY" &&
      text!.envVars.apiKey === clef!.envVars.apiKey,
    "the two providers must read the same token variable",
  );
  assert(
    servesInferenceKind(text!, "generate") &&
      !servesInferenceKind(text!, "decide"),
    "the text provider must keep generating and must not become a decision provider",
  );
  assert(
    (clef!.envVars.extraRequired ?? []).join() === "CLOUDFLARE_ACCOUNT_ID",
    "the route carries the account id, so it must be required beside the token",
  );
  assert(
    clef!.envVars.extraRequiredCredentialFields?.CLOUDFLARE_ACCOUNT_ID ===
      "accountId",
    "credentials.cloudflareClef.accountId must stand in for CLOUDFLARE_ACCOUNT_ID",
  );
});

await test("19.3 — it declares limits chosen from what was measured: a state window inside what was read in full, a question cap, four images and no video", async () => {
  const limits = PROVIDER_DESCRIPTORS_BY_NAME.get(
    AIProviderName.CLOUDFLARE_CLEF,
  )?.decisionLimits;
  assert(limits !== undefined, "cloudflare-clef must declare decisionLimits");
  // 16,000 is a chosen figure, in the estimator's tokens. On 2026-10-07 the
  // estimate ran 35% over the real token count for prose and 14% under it for a
  // JSON array of digits, so the limit is at most about 18,400 real tokens.
  assert(
    limits!.maxStateTokens === 16_000,
    "the state window must stay at the chosen 16,000 estimated tokens",
  );
  assert(
    limits!.maxStateTokens * 1.15 < 52_154,
    "the local window, at the worst measured real-to-estimated ratio (1.15), must sit inside the 52,154 tokens clef was seen to read in full on 2026-10-07",
  );
  assert(
    limits!.digitTokensPerChar === 1,
    "digits must be charged a token each: the tokenizer reads them one by one",
  );
  assert(
    limits!.symbolTokensPerChar === 0.75,
    "punctuation must be charged 0.75 a character: a JSON array of digits costs a real token a character, commas included",
  );
  assert(
    limits!.astralTokensPerChar === 3,
    "emoji must be charged 3 tokens each: measured 2.9",
  );
  assert(
    limits!.nonAsciiTokensPerChar === 1.5,
    "non-ASCII text must be charged 1.5 tokens per character",
  );
  assert(
    limits!.maxQuestions === 64,
    "the documented 64-question cap must be declared",
  );
  assert(
    limits!.media !== undefined && limits!.media.maxImages === 4,
    "up to 4 images per request must be declared",
  );
  assert(
    limits!.media!.video === false,
    "the API refuses video, so none may be declared",
  );
  assert(
    limits!.media!.maxRequestBytes === 256_000,
    "the request cap must stay under Cloudflare's measured 262,144-character estimate",
  );
});

await test("19.4 — it is the last decision provider in the precedence order, after perplexity-decider", async () => {
  const names: string[] = DECISION_PROVIDERS.map((d) => d.name);
  assert(
    names.indexOf("perplexity-decider") !== -1 &&
      names.indexOf("perplexity-decider") < names.indexOf("cloudflare-clef"),
    "cloudflare-clef must come after perplexity-decider",
  );
  assert(
    names[names.length - 1] === "cloudflare-clef",
    "cloudflare-clef must be the last entry in the precedence order",
  );
});

/** Cloudflare's own Workers AI example: one support request, three questions. */
const CLEF_DOCS_STATE =
  "Checkout has been failing for every customer for the last hour.";
const CLEF_DOCS_QUESTIONS = {
  urgent: {
    type: "boolean",
    instructions: "Is this support request urgent?",
  },
  team: {
    type: "choice",
    instructions: "Which team should handle this request?",
    criteria: {
      billing: "Payments, invoices, and refunds",
      technical: "Outages, errors, and configuration",
      sales: "Plans and upgrades",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe is the customer impact?",
    criteria: ["No impact", "Minor", "Major", "Critical"],
  },
} as const;

const CLEF_BASE = "https://api.cloudflare.com/client/v4";

/** One real decision against Workers AI, skipping on a transient or refused-token reply. */
async function decideClefLive(
  options: Omit<DecideOptions, "provider">,
): Promise<DecideResult> {
  restoreEnv();
  try {
    return await new NeuroLink().decide({
      provider: "cloudflare-clef",
      ...options,
    });
  } catch (error) {
    const failure = readDecisionFailure(error);
    if (isTransientPerplexityFailure(failure)) {
      throw new Error("SKIP: Cloudflare returned a transient reply", {
        cause: error,
      });
    }
    // Only a status of 401 is a refused token. A missing token or account id is
    // also an `authentication` error, with no status, and must fail loudly
    // here: skipping it would let a provider that stopped reading
    // CLOUDFLARE_API_KEY pass every live case as a SKIP.
    if (failure.kind === "authentication" && failure.status === 401) {
      throw new Error("SKIP: Cloudflare refused the configured token", {
        cause: error,
      });
    }
    throw error;
  }
}

/** A raw call that bypasses NeuroLink's local limits, to see what the service itself does. */
async function clefRaw(model: string, body: unknown) {
  const response = await fetch(
    `${CLEF_BASE}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID?.trim()}/ai/run/@cf/cloudflare/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`SKIP: Cloudflare answered ${response.status}`);
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("SKIP: Cloudflare refused the configured token");
  }
  return {
    status: response.status,
    json: (await response.json().catch(() => undefined)) as unknown,
  };
}

const requestedClefModel = (): string =>
  (process.env.CLOUDFLARE_CLEF_MODEL?.trim() || "clef").replace(
    /^@cf\/cloudflare\//,
    "",
  );

await test("19.5 — live: the documentation's example answers boolean, choice and score", async () => {
  requireCloudflareClef();
  const result = await decideClefLive({
    state: CLEF_DOCS_STATE,
    questions: CLEF_DOCS_QUESTIONS,
  });
  const { urgent, team, severity } = result.answers;
  assert(
    result.provider === "cloudflare-clef",
    "the result must come from cloudflare-clef",
  );
  assert(
    urgent?.type === "boolean" && urgent.probability > 0.5,
    "a checkout outage for every customer must score above one half for urgent",
  );
  assert(
    team?.type === "choice" && team.choice === "technical",
    "an outage must be routed to the technical team",
  );
  assert(
    Object.keys(team.probabilities).sort().join() === "billing,sales,technical",
    "the distribution must cover exactly the options that were offered",
  );
  assert(
    Math.abs(Object.values(team.probabilities).reduce((a, b) => a + b, 0) - 1) <
      0.05,
    "the probabilities must sum to about one",
  );
  assert(
    severity?.type === "score" && severity.score >= 2 && severity.score <= 3,
    "a total outage must score between major and critical",
  );
  assert(
    severity.legend["0"] === "No impact" && severity.legend["3"] === "Critical",
    "the legend must map each level back to the rubric",
  );
  assert(
    result.model === requestedClefModel(),
    "the reported model must be the one that was asked for",
  );
  assert(result.usage.inputTokens > 0, "usage must be reported");
  assert(result.latencyMs > 0, "latency must be measured");
  assert(
    typeof result.requestId === "string" && result.requestId.length > 0,
    "the request id header must be carried through",
  );
  assert(
    result.mediaBytes === undefined,
    "a request with no image must report no media",
  );
});

await test("19.6 — live: clef-flash answers the same example when asked for it per call", async () => {
  requireCloudflareClef();
  const result = await decideClefLive({
    state: CLEF_DOCS_STATE,
    questions: CLEF_DOCS_QUESTIONS,
    model: "clef-flash",
  });
  assert(result.model === "clef-flash", "the answer must come from clef-flash");
  assert(
    result.answers.team?.type === "choice" &&
      result.answers.team.choice === "technical",
    "the faster model must route an outage to the technical team too",
  );
});

async function clefColour(
  images: NonNullable<DecideOptions["images"]>,
  model?: string,
): Promise<string> {
  const result = await decideClefLive({
    state: "Look at the attached image.",
    questions: PERPLEXITY_COLOR_QUESTION,
    images,
    ...(model ? { model } : {}),
  });
  const answer = result.answers.color;
  assert(answer?.type === "choice", "color must be a choice answer");
  assert((result.mediaBytes ?? 0) > 0, "the image must be reported as sent");
  return answer.choice;
}

// The images are the same small fixtures the Perplexity cases use: each format
// in a different form, so one run also shows that a file path, a Buffer and a
// data: URL all reach the API as the image they hold.
await test("19.7 — live: red and blue PNG images (file paths) are told apart", async () => {
  requireCloudflareClef();
  const red = await clefColour([`${PERPLEXITY_FIXTURE_DIR}red.png`]);
  const blue = await clefColour([`${PERPLEXITY_FIXTURE_DIR}blue.png`]);
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

await test("19.8 — live: red and blue JPEG images (Buffers) are told apart", async () => {
  requireCloudflareClef();
  const red = await clefColour([readFixture("red.jpg")], "clef-flash");
  const blue = await clefColour([readFixture("blue.jpg")], "clef-flash");
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

await test("19.9 — live: red and blue WebP images (data: URLs) are told apart", async () => {
  requireCloudflareClef();
  const dataUrl = (name: string) =>
    `data:image/webp;base64,${readFixture(name).toString("base64")}`;
  const red = await clefColour([dataUrl("red.webp")], "clef-flash");
  const blue = await clefColour([dataUrl("blue.webp")], "clef-flash");
  assert(red === "red", "the red image must answer red");
  assert(blue === "blue", "the blue image must answer blue");
});

// What keeps decisionLimits honest. The state limit is a local refusal, correct
// only while the service reads everything NeuroLink admits. On 2026-10-03 and
// 2026-10-04 it did not (about 2,048 tokens were read, whatever the length); on
// 2026-10-07 it read states of at least 190,153 tokens. These two cases send,
// through NeuroLink, a state just under its own limit with a fact at the very end,
// to both models: if the service starts ignoring text again below the limit, they
// fail with an instruction to re-measure and lower maxStateTokens. They do not
// notice a service that reads more than the limit allows; the bracketing probe
// kept with the 2026-10-07 evidence does.
const CLEF_CANARY_FACT = " The vault code colour is blue.";
// Estimated tokens per character of the two states below, measured against the
// estimator on 2026-10-07: prose 0.2692, a JSON array of digits 0.8749.
const CLEF_PROSE_ESTIMATE_PER_CHAR = 0.2692;
const CLEF_DIGITS_ESTIMATE_PER_CHAR = 0.8749;

function clefLocalLimit(): number {
  const limit = PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.CLOUDFLARE_CLEF)
    ?.decisionLimits?.maxStateTokens;
  assert(limit !== undefined, "cloudflare-clef must declare maxStateTokens");
  return limit!;
}

async function clefEndFactRead(
  state: string,
  model: string,
): Promise<{ blue: number; inputTokens: number }> {
  const result = await decideClefLive({
    state,
    questions: {
      v: {
        type: "choice",
        instructions: "What colour does the text say the vault code is?",
        criteria: { red: "red", blue: "blue", green: "green" },
      },
    },
    model,
  });
  const answer = result.answers.v;
  assert(
    answer?.type === "choice",
    "the question must be answered as a choice",
  );
  return {
    blue: answer.probabilities.blue ?? 0,
    inputTokens: result.usage.inputTokens,
  };
}

await test("19.10 — live: a prose state just under NeuroLink's limit is read to its last sentence by both models", async () => {
  requireCloudflareClef();
  const limit = clefLocalLimit();
  const filler =
    "The warehouse schedule was reviewed and nothing else of note was recorded. ";
  const chars = Math.floor((limit * 0.95) / CLEF_PROSE_ESTIMATE_PER_CHAR);
  const state =
    filler.repeat(Math.ceil(chars / filler.length)).slice(0, chars) +
    CLEF_CANARY_FACT;
  for (const model of ["clef-flash", "clef"]) {
    const { blue, inputTokens } = await clefEndFactRead(state, model);
    assert(
      blue >= 0.8,
      `${model} did not read a fact at the end of a ${chars}-character state that NeuroLink admits (blue ${blue}): the service ignores text again below the local limit; re-measure, then lower maxStateTokens for cloudflare-clef and the docs`,
    );
    assert(
      inputTokens >= limit * 0.5,
      `${model} billed ${inputTokens} input tokens for a state estimated near ${Math.round(limit * 0.95)}: the state was not read in full`,
    );
  }
});

await test("19.10b — live: a JSON array of digits just under NeuroLink's limit is read to its end by both models", async () => {
  requireCloudflareClef();
  const limit = clefLocalLimit();
  const chars = Math.floor((limit * 0.95) / CLEF_DIGITS_ESTIMATE_PER_CHAR);
  let array = "[";
  for (let i = 0; array.length < chars; i++) {
    array += `${i % 10},`;
  }
  const state = array.slice(0, chars) + CLEF_CANARY_FACT;
  for (const model of ["clef-flash", "clef"]) {
    const { blue, inputTokens } = await clefEndFactRead(state, model);
    assert(
      blue >= 0.8,
      `${model} did not read a fact at the end of a ${chars}-character digit array that NeuroLink admits (blue ${blue}): the service ignores text again below the local limit; re-measure, then lower maxStateTokens and revisit digitTokensPerChar and symbolTokensPerChar`,
    );
    assert(
      inputTokens >= limit * 0.9,
      `${model} billed ${inputTokens} input tokens for a digit array estimated near ${Math.round(limit * 0.95)}: the state was not read in full`,
    );
  }
});

// Text-only canary on clef-flash: 520,000 state characters accepted and
// 525,000 refused with 413/code 5021 on 2026-10-04. This does not live-test
// the 256,000-byte local cap with images. A changed result requires remeasurement.
await test("19.11 — live: clef-flash text-only service ceiling accepts 520,000 and refuses 525,000 with 413/code 5021", async () => {
  requireCloudflareClef();
  restoreEnv();
  const questions = {
    q: { type: "noul", instructions: "Is this about checkout?" },
  };
  const inside = await clefRaw("clef-flash", {
    model: "clef-flash",
    state: "a".repeat(520_000),
    questions,
  });
  assert(
    inside.status === 200,
    `a 520,000-character request must be accepted (got ${inside.status}): the observed service ceiling changed; re-measure before changing NeuroLink's conservative 256,000-byte cap`,
  );
  const { status, json } = await clefRaw("clef-flash", {
    model: "clef-flash",
    state: "a".repeat(525_000),
    questions,
  });
  const code = (json as { errors?: Array<{ code?: number }> })?.errors?.[0]
    ?.code;
  assert(
    status === 413 && code === 5021,
    `an over-long request must be refused with 413 and code 5021 (got ${status}, ${code}): Cloudflare may have raised its cap; re-measure the request limit`,
  );
});

await test("19.12 — live: a rejected token reaches the real API and comes back as authentication, sent once", async () => {
  requireCloudflareClef();
  restoreEnv();
  // Read before the environment is cleared: the account id is real, the token
  // is not, so only the token is what is being refused.
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  let failure: DecisionFailure | undefined;
  try {
    clearDecisionKeys();
    fetchCapture.reset();
    failure = await failureOf(() =>
      new NeuroLink({
        credentials: {
          cloudflareClef: {
            apiKey: "definitely-not-a-valid-token-0123456789",
            accountId,
          },
        },
      }).decide({
        provider: "cloudflare-clef",
        state: "x",
        questions: PERPLEXITY_ONE_QUESTION,
      }),
    );
  } finally {
    restoreEnv();
  }
  assert(failure !== undefined, "a rejected token must not produce an answer");
  if (isTransientPerplexityFailure(failure)) {
    throw new Error("SKIP: the Cloudflare API was unreachable or throttled");
  }
  assert(
    failure.kind === "authentication" && failure.status === 401,
    "a rejected token must come back as authentication, with the API's own status",
  );
  assert(failure.retryable === false, "a rejected token must not be retried");
  assert(
    fetchCapture
      .list()
      .filter(
        (c) =>
          c.url ===
          `${CLEF_BASE}/accounts/${accountId}/ai/run/@cf/cloudflare/clef`,
      ).length === 1,
    "a rejected token must be sent exactly once, to the account's route",
  );
});

await test("19.13 — live: decide --provider cloudflare-clef --image --format json is clean JSON", async () => {
  requireCloudflareClef();
  restoreEnv();
  const result = await runCLI(
    [
      "decide",
      "Look at the attached image.",
      "--provider",
      "cloudflare-clef",
      "--image",
      `${PERPLEXITY_FIXTURE_DIR}red.png`,
      "--format",
      "json",
      "--questions",
      JSON.stringify(PERPLEXITY_COLOR_QUESTION),
    ],
    { timeoutMs: 60_000 },
  );
  if (result.exitCode > 0 && isTransientPerplexityCliFailure(result.stderr)) {
    throw new Error("SKIP: cloudflare returned a transient reply");
  }
  if (result.exitCode > 0 && isRefusedPerplexityCliKey(result.stderr)) {
    throw new Error("SKIP: cloudflare refused the configured token");
  }
  assert(result.exitCode === 0, "the live CLI call must succeed");
  const parsed: unknown = JSON.parse(result.stdout);
  assert(
    isRecordLike(parsed) && parsed.provider === "cloudflare-clef",
    "stdout must be the raw JSON result",
  );
  const answers = isRecordLike(parsed) ? parsed.answers : undefined;
  const color = isRecordLike(answers) ? answers.color : undefined;
  assert(
    isRecordLike(color) && color.choice === "red",
    "the image the CLI sent must be read as red",
  );
  assert(
    !looksLikeStackTrace(result.stderr),
    "stderr must not hold a stack trace",
  );
});

// A valid RGB PNG of about `targetBytes` file bytes whose pixels do not
// compress, so the encoded request is as large as the image is.
function noisePng(targetBytes: number): Buffer {
  const width = 1000;
  const rowBytes = 1 + width * 3;
  const height = Math.max(1, Math.round(targetBytes / rowBytes));
  const raw = Buffer.alloc(height * rowBytes);
  let seed = 12345;
  for (let y = 0; y < height; y++) {
    for (let i = 1; i < rowBytes; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      raw[y * rowBytes + i] = (seed >>> 16) & 0xff;
    }
  }
  const crc32 = (bytes: Buffer): number => {
    let crc = ~0;
    for (const byte of bytes) {
      let c = (crc ^ byte) & 0xff;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc = (crc >>> 8) ^ c;
    }
    return ~crc >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 0 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// NeuroLink caps an encoded request at 256,000 bytes, image data included.
// On 2026-10-05 both models accepted PNG request bodies of 400,000 to 492,000
// bytes, so a request just under the cap must pass NeuroLink's own check and
// be answered. If this case fails with a 413, the service limit has dropped
// below the local cap: re-measure and lower maxRequestBytes.
await test("19.14 — live: an image request just under NeuroLink's 256,000-byte cap is accepted by the service", async () => {
  requireCloudflareClef();
  const image = noisePng(190_000);
  const result = await decideClefLive({
    state: "Checkout is down.",
    questions: {
      checkout: {
        type: "boolean",
        instructions: "Is this about checkout?",
      },
    },
    images: [image],
    model: "clef-flash",
  });
  const mediaBytes = result.mediaBytes ?? 0;
  assert(
    mediaBytes > 240_000 && mediaBytes < 256_000,
    `the image must be reported just under the local cap (got ${mediaBytes} bytes)`,
  );
  assert(
    result.answers.checkout?.type === "boolean",
    "the question must be answered",
  );
});

// ───────────────────────────────────────────────────────────────────────────
logSection("20. Decision hooks, limits and per-call credentials");
// ───────────────────────────────────────────────────────────────────────────

/** One request a fake Laya server received, as much as the tests inspect. */
type FakePredictRequest = {
  path: string;
  authorization: string | null;
  body: Record<string, unknown>;
};

/**
 * A local stand-in for a System One server (Laya's `/predict`, XOR's
 * `/v1/systemone` — same wire): answers whatever questions it receives
 * with well-formed, confident answers, so a decision can be driven
 * end-to-end — hooks, namespacing, caps, events, credentials, media —
 * with no network and no key. Answers are deterministic: a `noul` is 0.9 —
 * except a per-server routing question (`server__N`) and the summary gate's
 * `is_refusal`, which get a confident 0.05 so tool routing has something to
 * drop and a summary is accepted — a `choice` picks "hard" when offered (so
 * the classifier's difficulty verdict clears the upgrade bar) and the first
 * option otherwise, and a `score` lands on the last level. The recorded
 * body keeps `images` / `video` exactly as they arrived, so a test can
 * check what a media request put on the wire.
 */
async function startFakeSystemOne(): Promise<{
  port: number;
  requests: FakePredictRequest[];
  close: () => Promise<void>;
}> {
  const requests: FakePredictRequest[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString());
      const body = isRecordLike(parsed) ? parsed : {};
      requests.push({
        path: req.url ?? "",
        authorization: req.headers.authorization ?? null,
        body,
      });
      const questions = isRecordLike(body.questions) ? body.questions : {};
      const answers: Record<string, unknown> = {};
      for (const [id, raw] of Object.entries(questions)) {
        const question = isRecordLike(raw) ? raw : {};
        if (question.type === "noul") {
          const confidentNo = id.startsWith("server__") || id === "is_refusal";
          answers[id] = { type: "noul", noul: confidentNo ? 0.05 : 0.9 };
        } else if (question.type === "choice") {
          const options = isRecordLike(question.criteria)
            ? Object.keys(question.criteria)
            : [];
          const choice = options.includes("hard") ? "hard" : (options[0] ?? "");
          const probabilities: Record<string, number> = {};
          for (const option of options) {
            probabilities[option] =
              option === choice ? 0.85 : 0.15 / Math.max(1, options.length - 1);
          }
          answers[id] = {
            type: "choice",
            choice,
            probabilities,
            confidence: 0.8,
          };
        } else if (question.type === "score") {
          const levels = Array.isArray(question.criteria)
            ? question.criteria
            : [];
          const last = Math.max(0, levels.length - 1);
          const legend: Record<string, string> = {};
          const probabilities: Record<string, number> = {};
          levels.forEach((level, index) => {
            legend[String(index)] = typeof level === "string" ? level : "";
            probabilities[String(index)] =
              index === last ? 0.9 : 0.1 / Math.max(1, last);
          });
          answers[id] = {
            type: "score",
            score: last,
            legend,
            probabilities,
            confidence: 0.9,
          };
        }
      }
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          model:
            typeof body.model === "string" ? body.model : "typed-decisions",
          answers,
          usage: { input_tokens: 120, output_tokens: 0 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** The fake as a Laya deployment: `LAYA_BASE_URL` is the route prefix. */
async function startFakeLaya(): Promise<{
  baseURL: string;
  requests: FakePredictRequest[];
  close: () => Promise<void>;
}> {
  const fake = await startFakeSystemOne();
  return { ...fake, baseURL: `http://127.0.0.1:${fake.port}/laya` };
}

/**
 * The fake as an XOR deployment: `XOR_BASE_URL` is the origin, and the
 * provider appends `/v1/systemone` itself.
 */
async function startFakeXor(): Promise<{
  baseURL: string;
  requests: FakePredictRequest[];
  close: () => Promise<void>;
}> {
  const fake = await startFakeSystemOne();
  return { ...fake, baseURL: `http://127.0.0.1:${fake.port}` };
}

/** Question ids a fake request carried, in wire order. */
function questionIdsOf(request: FakePredictRequest): string[] {
  return isRecordLike(request.body.questions)
    ? Object.keys(request.body.questions)
    : [];
}

const HOST_QUESTIONS: DecisionQuestionMap = {
  tone: {
    type: "boolean",
    instructions: "Is the request phrased politely?",
  },
  team: {
    type: "choice",
    instructions: "Which team owns this?",
    criteria: { payments: "Money movement", platform: "Everything else" },
  },
};

await test("20.1 — decisionLimits() is null with no decision provider configured", async () => {
  try {
    clearDecisionKeys();
    const nl = new NeuroLink();
    assert(
      nl.decisionLimits() === null,
      "a reading was produced with no decision provider configured",
    );
  } finally {
    restoreEnv();
  }
});

await test("20.2 — laya limits flatten per model and are enforced locally", async () => {
  try {
    // A developer's own LAYA_MODEL must not decide which model "the default" is.
    clearDecisionKeys();
    const nl = new NeuroLink();
    const unlisted = nl.decisionLimits({ provider: "laya", model: "en" });
    assert(unlisted !== null, "no reading for an unlisted laya model");
    assert(
      unlisted!.provider === "laya" &&
        unlisted!.maxStateTokens === 320 &&
        unlisted!.maxQuestions === 64 &&
        unlisted!.nonAsciiTokensPerChar === 1.5 &&
        unlisted!.enforcedLocally === true,
      "an unlisted laya model must read the base 320/64/1.5, enforced locally",
    );
    const typed = nl.decisionLimits({
      provider: "laya",
      model: "typed-decisions",
    });
    assert(
      typed !== null &&
        typed.maxStateTokens === 768 &&
        typed.nonAsciiTokensPerChar === 1.5 &&
        typed.maxQuestions === 64,
      "typed-decisions must override the state window and inherit the rest",
    );
    const multilingual = nl.decisionLimits({
      provider: "laya",
      model: "multilingual",
    });
    assert(
      multilingual !== null &&
        multilingual.maxStateTokens === 768 &&
        multilingual.nonAsciiTokensPerChar === 0.6,
      "multilingual must override both the window and the non-ASCII rate",
    );
    // No model named: the model decide() sends — the one registered for the
    // provider (LAYA_MODEL as read at registration, else the default).
    // EXPECTED_LAYA_MODEL mirrors that read, so this holds whether or not
    // LAYA_MODEL is set in this run's environment; 20.19 proves the
    // agreement with the wire either way.
    const byDefault = nl.decisionLimits({ provider: "laya" });
    assert(
      byDefault !== null &&
        byDefault.model === EXPECTED_LAYA_MODEL &&
        (EXPECTED_LAYA_MODEL !== "typed-decisions" ||
          byDefault.maxStateTokens === 768),
      "the default laya model must be the one decide() would send",
    );
  } finally {
    restoreEnv();
  }
});

await test("20.3 — typesafe limits are advisory: reported, not enforced", async () => {
  const nl = new NeuroLink();
  const reading = nl.decisionLimits({ provider: "typesafe" });
  assert(reading !== null, "no reading for typesafe");
  assert(
    reading!.maxStateTokens === TYPESAFE_MAX_STATE_TOKENS,
    "the descriptor's advisory window must equal the exported constant",
  );
  assert(
    reading!.enforcedLocally === false,
    "typesafe limits must not be enforced locally",
  );
  assert(
    reading!.maxQuestions === undefined,
    "typesafe caps a request by tokens, not by question count",
  );
  assert(
    reading!.model === "jev-latest",
    "the default typesafe model must be reported",
  );
  // An alias resolves the same as the canonical name, as it does in decide().
  const viaAlias = nl.decisionLimits({ provider: "jev" });
  assert(
    viaAlias !== null && viaAlias.provider === "typesafe",
    "a provider alias must resolve to the canonical descriptor",
  );
  // A text provider has no decision limits to read.
  assert(
    nl.decisionLimits({ provider: "openai" }) === null,
    "a text provider must not produce a decision reading",
  );
});

await test("20.4 — decisionLimits() resolves the default provider from SDK credentials", async () => {
  try {
    clearDecisionKeys();
    const nl = new NeuroLink({
      credentials: {
        laya: { apiKey: "sk-placeholder", baseURL: "http://127.0.0.1:9/laya" },
      },
    });
    const reading = nl.decisionLimits();
    assert(
      reading !== null && reading.provider === "laya",
      "credentials given to the constructor must configure the default provider",
    );
    // Per-call credentials count too, as they do for decide().
    const bare = new NeuroLink();
    const perCall = bare.decisionLimits({
      credentials: {
        laya: { apiKey: "sk-placeholder", baseURL: "http://127.0.0.1:9/laya" },
      },
    });
    assert(
      perCall !== null && perCall.provider === "laya",
      "per-call credentials must configure the default provider",
    );
    // A named model wins over the registered default, and the reading is
    // flattened for it.
    const named = nl.decisionLimits({ model: "english" });
    assert(
      named !== null &&
        named.model === "english" &&
        named.maxStateTokens === 320,
      "query.model must select the model the reading is flattened for",
    );
  } finally {
    restoreEnv();
  }
});

await test("20.5 — estimateDecisionStateTokens is the pre-flight refusal's own estimator", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
    });
    const limits = nl.decisionLimits({
      provider: "laya",
      model: "typed-decisions",
    });
    assert(limits !== null, "no laya reading");
    // Non-ASCII text is exactly where the two estimates could disagree: the
    // reading carries the rate, so the estimate must too.
    // 22 characters per repeat, 4 of them non-ASCII: 100 repeats estimate to
    // ~550 tokens at 4 chars/token but ~1,050 once the 1.5-per-character
    // rate is charged, which is what puts the fixture over a 768 window.
    const fits = "Wörter über Prüfung — ".repeat(20);
    const overflows = "Wörter über Prüfung — ".repeat(100);
    const fitsTokens = estimateDecisionStateTokens(fits, limits!);
    const overflowTokens = estimateDecisionStateTokens(overflows, limits!);
    assert(
      fitsTokens <= limits!.maxStateTokens &&
        overflowTokens > limits!.maxStateTokens,
      "the two fixtures must sit on opposite sides of the reading's window",
    );
    // Without the rate the over-window state would be estimated as fitting —
    // which is why the reading's rate is part of the contract.
    assert(
      estimateDecisionStateTokens(overflows) <= limits!.maxStateTokens,
      "the fixture must only overflow once non-ASCII characters are charged at the rate",
    );

    fetchCapture.reset();
    const accepted = await nl.decide({
      provider: "laya",
      model: "typed-decisions",
      state: fits,
      questions: { urgent: ALL_THREE.urgent },
    });
    assert(
      accepted.answers.urgent !== undefined,
      "the in-window state was not answered",
    );
    assert(
      fake.requests.length === 1,
      "the in-window state must reach the server exactly once",
    );

    let refused: unknown = null;
    try {
      await nl.decide({
        provider: "laya",
        model: "typed-decisions",
        state: overflows,
        questions: { urgent: ALL_THREE.urgent },
      });
    } catch (error) {
      refused = error;
    }
    assert(refused !== null, "the over-window state was not refused");
    const cause = (refused as { cause?: { kind?: string } }).cause;
    assert(
      cause?.kind === "max_tokens_exceeded",
      "the refusal must be classified as max_tokens_exceeded",
    );
    assert(
      fake.requests.length === 1,
      "a locally refused state must never reach the server",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.6 — through generate(): the routing site runs the hooks, namespaces host ids, answers under the host's", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const seen: DecisionHookContext[] = [];
    const answered: DecisionHookAnswersContext[] = [];
    const before: DecisionBeforeEvent[] = [];
    const after: DecisionAfterEvent[] = [];
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
      classifierRouter: { enabled: true, pool: POOL },
      decisionHooks: {
        extendQuestions: (context) => {
          seen.push(context);
          return HOST_QUESTIONS;
        },
        onAnswers: (context) => {
          answered.push(context);
        },
      },
    });
    const emitter = nl.getEventEmitter();
    emitter.on("decision:before", (event) =>
      before.push(event as DecisionBeforeEvent),
    );
    emitter.on("decision:after", (event) =>
      after.push(event as DecisionAfterEvent),
    );

    // `typesafe` generates no text, so the turn fails locally right after
    // routing — which is the only part under test — with no LLM call.
    await nl
      .generate({ input: { text: HARD_PROMPT }, provider: "typesafe" })
      .then(
        () => null,
        () => null,
      );

    assert(
      seen.length === 1,
      "extendQuestions must run exactly once per routing turn",
    );
    assert(
      seen[0]!.site === "routing",
      "the classifier's call must be stamped as the routing site",
    );
    assert(
      "difficulty" in seen[0]!.questions && !("tone" in seen[0]!.questions),
      "the hook must see NeuroLink's own questions, not its own",
    );

    assert(
      fake.requests.length === 1,
      "exactly one decision request must reach the server",
    );
    const wireIds = questionIdsOf(fake.requests[0]!);
    assert(
      wireIds.includes("difficulty") &&
        wireIds.includes("host__0") &&
        wireIds.includes("host__1") &&
        !wireIds.includes("tone") &&
        !wireIds.includes("team"),
      "host questions must travel under the host namespace, never their own ids",
    );

    assert(answered.length === 1, "onAnswers must run exactly once");
    const hostAnswers = answered[0]!.answers;
    assert(
      readDecisionBoolean(hostAnswers, "tone") === 0.9 &&
        readDecisionChoice(hostAnswers, "team")?.choice === "payments",
      "host answers must come back under the host's original ids",
    );
    assert(
      !("host__0" in hostAnswers) && !("difficulty" in hostAnswers),
      "the host's answer map must hold only the host's answers",
    );
    assert(
      "difficulty" in answered[0]!.result.answers &&
        "host__0" in answered[0]!.result.answers,
      "the full result must still carry every answer under its wire id",
    );

    assert(
      before.length === 1 && after.length === 1,
      "one before/after pair must fire for the turn",
    );
    assert(
      before[0]!.site === "routing" && before[0]!.hostQuestionCount === 2,
      "decision:before must name the site and count the host questions",
    );
    assert(
      after[0]!.site === "routing" &&
        after[0]!.provider === "laya" &&
        after[0]!.model === EXPECTED_LAYA_MODEL &&
        typeof after[0]!.latencyMs === "number" &&
        "difficulty" in after[0]!.answers &&
        !("host__0" in after[0]!.answers) &&
        readDecisionBoolean(after[0]!.hostAnswers, "tone") === 0.9,
      "decision:after must split NeuroLink's answers from the host's",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.7 — host additions are capped at the provider's question limit, and warned about", async () => {
  const fake = await startFakeLaya();
  const previousDebug = process.env.NEUROLINK_DEBUG;
  try {
    clearDecisionKeys();
    // Warnings are hidden unless debugging; the cap warning is part of the contract.
    process.env.NEUROLINK_DEBUG = "true";
    const tooMany: Record<string, { type: "boolean"; instructions: string }> =
      {};
    for (let index = 0; index < 100; index++) {
      tooMany[`q${index}`] = {
        type: "boolean",
        instructions: `Host question ${index}?`,
      };
    }
    const warnings: string[] = [];
    let hostAnswerCount = -1;
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
      classifierRouter: { enabled: true, pool: POOL },
      decisionHooks: {
        extendQuestions: () => tooMany,
        onAnswers: (context) => {
          hostAnswerCount = Object.keys(context.answers).length;
        },
      },
    });
    nl.getEventEmitter().on("log-event", (event) => {
      const entry = event as { level?: string; message?: string };
      if (entry.level === "warn" && typeof entry.message === "string") {
        warnings.push(entry.message);
      }
    });
    await nl
      .generate({ input: { text: HARD_PROMPT }, provider: "typesafe" })
      .then(
        () => null,
        () => null,
      );
    const limits = nl.decisionLimits({ provider: "laya" });
    assert(limits !== null, "no laya reading");
    assert(
      fake.requests.length === 1,
      "the capped request must still be sent, once",
    );
    const wireIds = questionIdsOf(fake.requests[0]!);
    assert(
      wireIds.length === limits!.maxQuestions,
      "the request must carry exactly the provider's maximum, not one more",
    );
    const ownCount = wireIds.filter((id) => !id.startsWith("host__")).length;
    assert(
      ownCount > 0 &&
        wireIds.filter((id) => id.startsWith("host__")).length ===
          limits!.maxQuestions - ownCount,
      "every one of NeuroLink's own questions must survive; only host questions are dropped",
    );
    assert(
      hostAnswerCount === limits!.maxQuestions - ownCount,
      "the host must get an answer for every question that was sent",
    );
    assert(
      warnings.some(
        (message) =>
          message.includes("dropped") && message.includes("host question"),
      ),
      "dropping host questions must be warned about",
    );
  } finally {
    if (previousDebug === undefined) {
      delete process.env.NEUROLINK_DEBUG;
    } else {
      process.env.NEUROLINK_DEBUG = previousDebug;
    }
    await fake.close();
    restoreEnv();
  }
});

await test("20.8 — a throwing hook, or a malformed question, never changes the routing verdict", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    // A host-wired ClassifierRouter decides its strategy from the
    // environment (no `hasDecisionProvider` dep here), so the fake is
    // configured there; the instances below inherit it.
    process.env.LAYA_API_KEY = "sk-fake";
    process.env.LAYA_BASE_URL = fake.baseURL;
    // Reference verdict: same fake, no hooks.
    const plain = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => new NeuroLink().tryDecide(o) },
    );
    const reference = await plain.route({ prompt: HARD_PROMPT });
    assert(
      reference !== null && reference.reason?.startsWith("jev") === true,
      "the fake server must drive the jev strategy for the reference verdict",
    );

    const throwing = new NeuroLink({
      decisionHooks: {
        extendQuestions: () => {
          throw new Error("host hook exploded");
        },
        onAnswers: () => {
          throw new Error("host observer exploded");
        },
      },
    });
    const throwingRouter = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => throwing.tryDecide(o) },
    );
    const withThrow = await throwingRouter.route({ prompt: HARD_PROMPT });
    assert(
      withThrow !== null &&
        withThrow.difficulty === reference!.difficulty &&
        withThrow.model === reference!.model &&
        withThrow.provider === reference!.provider,
      "a throwing hook must leave the routing verdict exactly as without hooks",
    );
    assert(
      questionIdsOf(fake.requests[fake.requests.length - 1]!).every(
        (id) => !id.startsWith("host__"),
      ),
      "a throwing hook must add nothing to the wire",
    );

    // A malformed question is dropped on its own; a valid sibling still rides along.
    const malformed = new NeuroLink({
      decisionHooks: {
        extendQuestions: () =>
          ({
            broken: {
              type: "choice",
              instructions: "one option only",
              criteria: { only: "x" },
            },
            missing: { type: "boolean" },
            fine: { type: "boolean", instructions: "Is it fine?" },
          }) as unknown as DecisionQuestionMap,
      },
    });
    const malformedRouter = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => malformed.tryDecide(o) },
    );
    const withMalformed = await malformedRouter.route({ prompt: HARD_PROMPT });
    assert(
      withMalformed !== null &&
        withMalformed.difficulty === reference!.difficulty,
      "a malformed host question must not change the verdict",
    );
    const lastIds = questionIdsOf(fake.requests[fake.requests.length - 1]!);
    assert(
      lastIds.filter((id) => id.startsWith("host__")).length === 1,
      "only the well-formed host question may reach the wire",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.13 — a hung hook, a throwing listener and an onAnswers mutation are all contained", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    process.env.LAYA_API_KEY = "sk-fake";
    process.env.LAYA_BASE_URL = fake.baseURL;
    const plain = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => new NeuroLink().tryDecide(o) },
    );
    const reference = await plain.route({ prompt: HARD_PROMPT });
    assert(
      reference !== null && reference.reason?.startsWith("jev") === true,
      "the fake server must drive the jev strategy for the reference verdict",
    );

    // 1. extendQuestions that never resolves: bounded by hookTimeoutMs, the
    //    call proceeds with NeuroLink's own questions and finishes promptly.
    let mutatedByHost = false;
    const nl = new NeuroLink({
      decisionHooks: {
        hookTimeoutMs: 100,
        extendQuestions: () => new Promise<undefined>(() => undefined),
        onAnswers: ({ result }) => {
          // 3. Edit what the host is handed; the consumer must not see it.
          for (const answer of Object.values(result.answers)) {
            // Every variant carries a probability-ish number; flipping it to
            // an impossible value would derail the classifier if it leaked.
            if (answer.type === "boolean") {
              (answer as { probability: number }).probability = -1;
            } else if (answer.type === "choice") {
              (answer as { choice: string }).choice = "tampered";
            } else {
              (answer as { score: number }).score = -1;
            }
          }
          mutatedByHost = true;
        },
      },
    });
    // 2. A listener that throws on both events.
    const emitter = nl.getEventEmitter();
    const boom = () => {
      throw new Error("listener exploded");
    };
    emitter.on("decision:before", boom);
    emitter.on("decision:after", boom);
    const router = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => nl.tryDecide(o) },
    );
    const startedAt = Date.now();
    const verdict = await router.route({ prompt: HARD_PROMPT });
    const elapsed = Date.now() - startedAt;
    emitter.off("decision:before", boom);
    emitter.off("decision:after", boom);
    assert(
      verdict !== null &&
        verdict.difficulty === reference!.difficulty &&
        verdict.model === reference!.model,
      "a hung hook and a throwing listener must leave the verdict as without hooks",
    );
    assert(
      elapsed < 5_000,
      "a hung extendQuestions must be cut off at hookTimeoutMs, not stall the turn",
    );
    assert(
      questionIdsOf(fake.requests[fake.requests.length - 1]!).every(
        (id) => !id.startsWith("host__"),
      ),
      "a timed-out hook must add nothing to the wire",
    );
    assert(mutatedByHost, "onAnswers must still run after the hook timeout");
    assert(
      verdict!.reason?.startsWith("jev") === true,
      "the consumer's answers must be unaffected by the host's mutation",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.9 — every built-in site is stamped, and a host-wired consumer gets the hooks too", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const sites: string[] = [];
    const before: string[] = [];
    const after: string[] = [];
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
      decisionHooks: {
        extendQuestions: (context) => {
          sites.push(context.site);
          return undefined;
        },
      },
    });
    const emitter = nl.getEventEmitter();
    emitter.on("decision:before", (event) =>
      before.push((event as DecisionBeforeEvent).site),
    );
    emitter.on("decision:after", (event) =>
      after.push((event as DecisionAfterEvent).site),
    );
    // The same wiring a host uses for its own RAGPipeline / ClassifierRouter.
    const decide = (o: Parameters<typeof nl.tryDecide>[0]) => nl.tryDecide(o);

    const servers = await selectServersByDecision(
      "open a pull request",
      CATALOG,
      decide,
    );
    assert(
      servers !== null,
      "tool routing produced no outcome against the fake",
    );
    const dropped = await selectIrrelevantMessages(
      TRANSCRIPT,
      "rename the retry constant",
      decide,
      { protectRecent: 1 },
    );
    // The fake answers every message as needed, so nothing is dropped — the
    // call itself is what is under test here.
    assert(dropped === null, "the fake must answer every message as needed");
    const kept = await summaryPreservesContext(
      "A faithful summary.",
      TRANSCRIPT,
      decide,
    );
    assert(kept === true, "a confident yes must accept the summary");
    const plan = await decideSearchPlan("what is the refund window?", decide, {
      defaultTopK: 5,
      canHybrid: true,
      canGraph: true,
      canRerank: true,
    });
    assert(plan !== null, "RAG planning produced no plan against the fake");

    const expected = [
      "toolRouting",
      "contextRelevance",
      "summaryGate",
      "ragPlan",
    ];
    assert(
      JSON.stringify(sites) === JSON.stringify(expected),
      "each consumer must stamp its own site, in call order",
    );
    assert(
      JSON.stringify(before) === JSON.stringify(expected) &&
        JSON.stringify(after) === JSON.stringify(expected),
      "one decision:before and one decision:after must fire per site call",
    );
    assert(
      fake.requests.length === 4,
      "each site must cost exactly one round trip",
    );

    // A host's own tryDecide call is not a site: no hook, no event.
    await nl.tryDecide({
      state: SUPPORT_TICKET,
      questions: { urgent: ALL_THREE.urgent },
    });
    assert(
      sites.length === 4 && before.length === 4,
      "a plain tryDecide call must run no hook and emit no site event",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.10 — the decision span names its site and counts the host's questions", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
      decisionHooks: { extendQuestions: () => HOST_QUESTIONS },
    });
    nl.resetMetrics();
    await decideSearchPlan(
      "what is the refund window?",
      (o) => nl.tryDecide(o),
      {
        defaultTopK: 5,
        canHybrid: true,
        canGraph: true,
        canRerank: true,
      },
    );
    const span = nl.getSpans().find((s) => s.type === "model.decision");
    assert(span !== undefined, "no decision span was recorded");
    assert(
      span!.attributes["decision.site"] === "ragPlan",
      "the span must name the site that asked",
    );
    assert(
      span!.attributes["decision.host_question_count"] === 2,
      "the span must count the host's questions",
    );
    assert(
      span!.attributes["decision.question_count"] === 6,
      "question_count must count everything sent, NeuroLink's four plus the host's two",
    );
    // A plain call carries neither attribute — it is not a site.
    nl.resetMetrics();
    await nl.tryDecide({
      state: SUPPORT_TICKET,
      questions: { urgent: ALL_THREE.urgent },
    });
    const plain = nl.getSpans().find((s) => s.type === "model.decision");
    assert(
      plain !== undefined && !("decision.site" in plain.attributes),
      "a host's own decision must not be attributed to a site",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.11 — per-call credentials reach the classifier's decision, not the instance's", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    fetchCapture.reset();
    // The instance points at a dead address: if the routing decision used the
    // instance credentials it would be recorded there and fail, not answered.
    const nl = new NeuroLink({
      credentials: {
        laya: { apiKey: "sk-instance", baseURL: "http://127.0.0.1:9/laya" },
      },
      classifierRouter: { enabled: true, pool: POOL },
    });
    await nl
      .generate({
        input: { text: HARD_PROMPT },
        provider: "typesafe",
        credentials: { laya: { apiKey: "sk-per-call", baseURL: fake.baseURL } },
      })
      .then(
        () => null,
        () => null,
      );
    assert(
      fake.requests.length === 1,
      "the per-call server must see exactly one decision request",
    );
    assert(
      fake.requests[0]!.authorization === "Bearer sk-per-call",
      "the decision must carry the per-call key, not the instance key",
    );
    assert(
      fake.requests[0]!.path === "/laya/predict",
      "the decision must go to the per-call base URL",
    );
    assert(
      fetchCapture.list().filter((c) => c.url.startsWith("http://127.0.0.1:9/"))
        .length === 0,
      "nothing may be sent to the instance-level base URL",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.12 — a host-wired consumer can pass per-call credentials on the options it hands tryDecide", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const sitesSeen: string[] = [];
    const nl = new NeuroLink({
      credentials: {
        laya: { apiKey: "sk-instance", baseURL: "http://127.0.0.1:9/laya" },
      },
      decisionHooks: {
        extendQuestions: (context) => {
          sitesSeen.push(context.site);
          return undefined;
        },
      },
    });
    const perCall = { laya: { apiKey: "sk-per-call", baseURL: fake.baseURL } };
    // Tool routing, as generate() wires it: the outer request's credentials
    // travel on the options the site hands to tryDecide.
    const servers = await selectServersByDecision(
      "open a pull request",
      CATALOG,
      (o) => nl.tryDecide({ ...o, credentials: perCall }),
    );
    assert(
      servers !== null,
      "tool routing produced no outcome against the fake",
    );
    assert(
      fake.requests.length === 1 &&
        fake.requests[0]!.authorization === "Bearer sk-per-call",
      "the tool routing decision must carry the per-call key",
    );
    assert(
      sitesSeen.length === 1 && sitesSeen[0] === "toolRouting",
      "the hook must see the tool routing site",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

/** Warn-level log messages from `nl`, visible only with NEUROLINK_DEBUG. */
function collectWarnings(nl: InstanceType<typeof NeuroLink>): string[] {
  const warnings: string[] = [];
  nl.getEventEmitter().on("log-event", (event) => {
    const entry = event as { level?: string; message?: string };
    if (entry.level === "warn" && typeof entry.message === "string") {
      warnings.push(entry.message);
    }
  });
  return warnings;
}

/** Runs `fn` with warnings visible, restoring NEUROLINK_DEBUG afterwards. */
async function withDebugLogs<T>(fn: () => Promise<T>): Promise<T> {
  const previous = process.env.NEUROLINK_DEBUG;
  process.env.NEUROLINK_DEBUG = "true";
  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env.NEUROLINK_DEBUG;
    } else {
      process.env.NEUROLINK_DEBUG = previous;
    }
  }
}

/** A site-stamped request, as a host-wired consumer hands it to tryDecide. */
const RAG_PLAN_REQUEST = {
  site: "ragPlan" as const,
  state: SUPPORT_TICKET,
  questions: { urgent: ALL_THREE.urgent },
};

await test("20.14 — an out-of-range hookTimeoutMs falls back to the default with one warning, instead of timing every hook out", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    await withDebugLogs(async () => {
      // Infinity is the natural way to say "no bound" — a timer given it
      // fires at once, so a 150 ms hook would never contribute a question.
      const nl = new NeuroLink({
        credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
        decisionHooks: {
          hookTimeoutMs: Number.POSITIVE_INFINITY,
          extendQuestions: async () => {
            await delay(150);
            return HOST_QUESTIONS;
          },
        },
      });
      const warnings = collectWarnings(nl);
      const first = await nl.tryDecide(RAG_PLAN_REQUEST);
      const second = await nl.tryDecide(RAG_PLAN_REQUEST);
      assert(
        first !== null && second !== null,
        "both site calls must produce a result",
      );
      assert(
        fake.requests.length === 2 &&
          fake.requests.every((request) =>
            questionIdsOf(request).includes("host__1"),
          ),
        "the slow hook must still contribute its questions under the default bound",
      );
      assert(
        warnings.filter((message) => message.includes("hookTimeoutMs"))
          .length === 1,
        "the invalid bound must be warned about exactly once per instance",
      );
      // Every other unusable value takes the same fallback.
      for (const bad of [0, -5, Number.NaN, 2 ** 31]) {
        const other = new NeuroLink({
          credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
          decisionHooks: {
            hookTimeoutMs: bad,
            extendQuestions: async () => {
              await delay(50);
              return HOST_QUESTIONS;
            },
          },
        });
        const otherWarnings = collectWarnings(other);
        await other.tryDecide(RAG_PLAN_REQUEST);
        assert(
          questionIdsOf(fake.requests[fake.requests.length - 1]!).includes(
            "host__0",
          ) && otherWarnings.some((m) => m.includes("hookTimeoutMs")),
          "an unusable bound must fall back to the default and be warned about",
        );
      }
    });
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.15 — without a decision provider the hooks and events are inert: no hook runs, no event fires, null as before", async () => {
  try {
    clearDecisionKeys();
    let extendCalls = 0;
    let answerCalls = 0;
    let events = 0;
    const nl = new NeuroLink({
      decisionHooks: {
        extendQuestions: () => {
          extendCalls += 1;
          return HOST_QUESTIONS;
        },
        onAnswers: () => {
          answerCalls += 1;
        },
      },
    });
    const emitter = nl.getEventEmitter();
    emitter.on("decision:before", () => (events += 1));
    emitter.on("decision:after", () => (events += 1));
    // Precondition: nothing is configured.
    assert(
      nl.decisionLimits() === null,
      "precondition: no decision provider may be configured",
    );
    const result = await nl.tryDecide({
      site: "toolRouting",
      state: SUPPORT_TICKET,
      questions: { urgent: ALL_THREE.urgent },
    });
    assert(result === null, "with no provider the site call must return null");
    assert(
      extendCalls === 0 && answerCalls === 0,
      "no hook may run when no decision request can be made",
    );
    assert(
      events === 0,
      "no decision event may fire when no decision request can be made",
    );
  } finally {
    restoreEnv();
  }
});

await test("20.16 — a host cannot turn a site decision into an exception: unreadable hook returns, a missing question map", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const credentials = {
      laya: { apiKey: "sk-fake", baseURL: fake.baseURL },
    };
    const own = { urgent: ALL_THREE.urgent };
    // A return value whose keys cannot even be listed.
    const proxied = new NeuroLink({
      credentials,
      decisionHooks: {
        extendQuestions: () =>
          new Proxy(
            {},
            {
              ownKeys: () => {
                throw new Error("boom-ownKeys");
              },
            },
          ) as DecisionQuestionMap,
      },
    });
    const viaProxy = await proxied.tryDecide(RAG_PLAN_REQUEST);
    assert(
      viaProxy !== null && "urgent" in viaProxy.answers,
      "a proxy that throws on enumeration must still yield NeuroLink's own answers",
    );
    // A question whose getter throws, beside a well-formed sibling.
    const throwingGetter = new NeuroLink({
      credentials,
      decisionHooks: {
        extendQuestions: () => {
          const bag: Record<string, unknown> = { fine: HOST_QUESTIONS.tone };
          Object.defineProperty(bag, "broken", {
            enumerable: true,
            get: () => {
              throw new Error("boom-getter");
            },
          });
          return bag as DecisionQuestionMap;
        },
      },
    });
    const viaGetter = await throwingGetter.tryDecide(RAG_PLAN_REQUEST);
    assert(
      viaGetter !== null && "urgent" in viaGetter.answers,
      "a throwing getter must still yield NeuroLink's own answers",
    );
    assert(
      Object.keys(viaGetter!.answers).every((id) => !id.startsWith("host__")),
      "the consumer must never see a host id, whichever path answered",
    );
    // A site-stamped request with no question map at all: null, never a throw.
    const plain = new NeuroLink({ credentials });
    const withoutQuestions = await plain.tryDecide({
      site: "ragPlan",
      state: SUPPORT_TICKET,
      questions: undefined as unknown as DecisionQuestionMap,
    });
    assert(
      withoutQuestions === null,
      "a malformed site request must resolve to null, exactly as without a site",
    );
    // A listener that throws only AFTER the wire call returned: the consumer
    // still gets the answers that call produced, and no second call is made.
    const before = fake.requests.length;
    const lateThrow = new NeuroLink({
      credentials,
      decisionHooks: { extendQuestions: () => HOST_QUESTIONS },
    });
    lateThrow.getEventEmitter().on("decision:after", () => {
      throw new Error("after-listener exploded");
    });
    const afterThrow = await lateThrow.tryDecide({
      site: "ragPlan",
      state: SUPPORT_TICKET,
      questions: own,
    });
    assert(
      afterThrow !== null &&
        "urgent" in afterThrow.answers &&
        !("host__0" in afterThrow.answers),
      "a throwing after-listener must leave the consumer its own answers",
    );
    assert(
      fake.requests.length === before + 1,
      "a failure after the call must not cost a second round trip",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.17 — a listener or hook that edits what it is handed changes neither the wire nor the next call", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    process.env.LAYA_API_KEY = "sk-fake";
    process.env.LAYA_BASE_URL = fake.baseURL;
    const nl = new NeuroLink({
      decisionHooks: {
        extendQuestions: (context) => {
          // Edit the consumer's own question and state in place.
          (
            context.questions as Record<string, { instructions: unknown }>
          ).difficulty!.instructions = "HOOK-REWRITTEN";
          (context.state as Record<string, unknown>).injected_by_hook = true;
          return undefined;
        },
      },
    });
    nl.getEventEmitter().on("decision:before", (event) => {
      const payload = event as DecisionBeforeEvent;
      const difficulty = (
        payload.questions as Record<
          string,
          { criteria: Record<string, string> }
        >
      ).difficulty!;
      // The rubric is a module constant inside the classifier: an edit that
      // reached it would rewrite every later routing call in the process.
      difficulty.criteria.trivial = "LISTENER-REWRITTEN RUBRIC";
      (payload.state as Record<string, unknown>).injected_by_listener = true;
    });
    const router = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => nl.tryDecide(o) },
    );
    await router.route({ prompt: HARD_PROMPT });
    // Second call with the listener still attached, then a third from a
    // fresh instance with no hooks or listeners at all.
    await router.route({ prompt: HARD_PROMPT });
    const bare = new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => new NeuroLink().tryDecide(o) },
    );
    await bare.route({ prompt: HARD_PROMPT });
    assert(fake.requests.length === 3, "three routing requests must be sent");
    for (const request of fake.requests) {
      const questions = request.body.questions as Record<
        string,
        { instructions?: unknown; criteria?: Record<string, string> }
      >;
      const state = request.body.state as Record<string, unknown>;
      assert(
        questions.difficulty?.instructions !== "HOOK-REWRITTEN" &&
          questions.difficulty?.criteria?.trivial !==
            "LISTENER-REWRITTEN RUBRIC",
        "no edit made by a hook or listener may reach the wire",
      );
      assert(
        !("injected_by_hook" in state) && !("injected_by_listener" in state),
        "no state field added by a hook or listener may reach the wire",
      );
    }
    const trivialRubrics = new Set(
      fake.requests.map(
        (request) =>
          (
            request.body.questions as Record<
              string,
              { criteria?: Record<string, string> }
            >
          ).difficulty?.criteria?.trivial,
      ),
    );
    assert(
      trivialRubrics.size === 1,
      "every call must send the same rubric: the consumer's constant was never edited",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.18 — a host question id of __proto__ or constructor keeps its answer", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    // An object literal with a "__proto__" key sets the prototype; only
    // fromEntries makes it an own key, which is what a host mapping
    // user-defined names to question ids ends up with.
    const hostQuestions = Object.fromEntries([
      ["__proto__", HOST_QUESTIONS.tone],
      ["constructor", HOST_QUESTIONS.tone],
      ["ok", HOST_QUESTIONS.tone],
    ]) as DecisionQuestionMap;
    let answered: DecisionHookAnswersContext | undefined;
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
      decisionHooks: {
        extendQuestions: () => hostQuestions,
        onAnswers: (context) => {
          answered = context;
        },
      },
    });
    const after: DecisionAfterEvent[] = [];
    nl.getEventEmitter().on("decision:after", (event) =>
      after.push(event as DecisionAfterEvent),
    );
    const result = await nl.tryDecide(RAG_PLAN_REQUEST);
    assert(result !== null, "the site call must produce a result");
    assert(
      questionIdsOf(fake.requests[0]!).filter((id) => id.startsWith("host__"))
        .length === 3,
      "all three host questions must travel on the wire",
    );
    assert(answered !== undefined, "onAnswers must have run");
    for (const id of ["__proto__", "constructor", "ok"]) {
      assert(
        Object.hasOwn(answered!.answers, id) &&
          readDecisionBoolean(answered!.answers, id) === 0.9,
        `the host's answer under "${id}" must come back as an own key`,
      );
      assert(
        Object.hasOwn(after[0]!.hostAnswers, id),
        `decision:after must carry the host's "${id}" answer as an own key`,
      );
    }
    assert(
      Object.keys(result!.answers).length === 1 && "urgent" in result!.answers,
      "the consumer must see only its own answer",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.19 — every site call dispatches through decide(): a subclass override and an instance patch both see it", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    // A host-wired ClassifierRouter decides its strategy from the
    // environment (no `hasDecisionProvider` dep), so the fake is configured
    // there; every instance below inherits it.
    process.env.LAYA_API_KEY = "sk-fake";
    process.env.LAYA_BASE_URL = fake.baseURL;
    let overrideCalls = 0;
    class CountingNeuroLink extends NeuroLink {
      override async decide(
        options: Parameters<NeuroLink["decide"]>[0],
      ): ReturnType<NeuroLink["decide"]> {
        overrideCalls += 1;
        return super.decide(options);
      }
    }
    const subclassed = new CountingNeuroLink();
    const routed = await new ClassifierRouter(
      { enabled: true, pool: POOL },
      { decide: (o) => subclassed.tryDecide(o) },
    ).route({ prompt: HARD_PROMPT });
    assert(
      routed !== null && routed.reason?.startsWith("jev") === true,
      "the routing site must have used the decision model",
    );
    // Read through fresh consts: an `asserts` narrowing of the counter to a
    // literal would otherwise make the second comparison a type error.
    const afterRouting = overrideCalls;
    assert(
      afterRouting === 1,
      "the routing site's call must go through the subclass's decide()",
    );
    await subclassed.tryDecide(RAG_PLAN_REQUEST);
    const afterSite = overrideCalls;
    assert(
      afterSite === 2,
      "a host-wired site call must go through the override too",
    );

    // An instance patch — a per-tenant cache or rate limit — is honoured the
    // same way, and its throw stays inside tryDecide's null contract.
    let patchCalls = 0;
    const patched = new NeuroLink();
    const original = patched.decide.bind(patched);
    patched.decide = async (options) => {
      patchCalls += 1;
      if (patchCalls > 1) {
        throw new Error("tenant over quota");
      }
      return original(options);
    };
    const first = await patched.tryDecide(RAG_PLAN_REQUEST);
    const second = await patched.tryDecide(RAG_PLAN_REQUEST);
    assert(
      patchCalls === 2 && first !== null && second === null,
      "an instance patch must see every site call, and its throw must become null",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.20 — decisionLimits() names the model decide() sends, whatever LAYA_MODEL says now", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const nl = new NeuroLink({
      credentials: { laya: { apiKey: "sk-fake", baseURL: fake.baseURL } },
    });
    const sentModel = async (): Promise<string | undefined> => {
      const index = fake.requests.length;
      await nl.decide({
        state: SUPPORT_TICKET,
        questions: { urgent: ALL_THREE.urgent },
      });
      const model = fake.requests[index]?.body.model;
      return typeof model === "string" ? model : undefined;
    };
    // The variable is flipped between calls; decide() sends the model the
    // provider was registered with, and the reading must say the same —
    // sizing a state against a window the pre-flight check will not apply
    // is exactly the mismatch this guards against.
    for (const value of [
      "english",
      "multilingual",
      " typed-decisions ",
      undefined,
    ]) {
      if (value === undefined) {
        delete process.env.LAYA_MODEL;
      } else {
        process.env.LAYA_MODEL = value;
      }
      const sent = await sentModel();
      const reading = nl.decisionLimits();
      assert(
        sent !== undefined && reading !== null && reading.model === sent,
        "the reading must name exactly the model the decision request carried",
      );
      assert(
        nl.decisionLimits({ provider: "laya" })?.model === sent,
        "naming the provider must not change which model the reading is for",
      );
    }
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.21 — the routing site carries the documented top-level requestId, and activates on per-call credentials alone", async () => {
  const fake = await startFakeLaya();
  try {
    clearDecisionKeys();
    const seen: Array<{ site: string; requestId?: string }> = [];
    // No decision key at instance or environment level: the request's own
    // credentials are the only way to a decision model.
    const nl = new NeuroLink({
      classifierRouter: { enabled: true, pool: POOL },
    });
    nl.getEventEmitter().on("decision:before", (event) => {
      const payload = event as DecisionBeforeEvent;
      seen.push({ site: payload.site, requestId: payload.requestId });
    });
    await nl
      .generate({
        input: { text: HARD_PROMPT },
        provider: "typesafe",
        requestId: "req-top-level",
        credentials: { laya: { apiKey: "sk-per-call", baseURL: fake.baseURL } },
      })
      .then(
        () => null,
        () => null,
      );
    assert(
      fake.requests.length === 1 &&
        fake.requests[0]!.authorization === "Bearer sk-per-call",
      "per-call credentials alone must activate the routing site, on the caller's account",
    );
    assert(
      seen.length === 1 &&
        seen[0]!.site === "routing" &&
        seen[0]!.requestId === "req-top-level",
      "the routing event must carry the top-level requestId",
    );
    // Without per-call credentials the same instance routes by heuristic:
    // no request, no event.
    await nl
      .generate({ input: { text: HARD_PROMPT }, provider: "typesafe" })
      .then(
        () => null,
        () => null,
      );
    assert(
      fake.requests.length === 1 && seen.length === 1,
      "with no credentials anywhere the routing site must stay inert",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.22 — xor through the routing site: hooks run, host ids are namespaced, the image reaches the wire as a data URL", async () => {
  const fake = await startFakeXor();
  try {
    clearDecisionKeys();
    const image = await readFile(`${XOR_FIXTURE_DIR}red.png`);
    const expectedDataUrl = `data:image/png;base64,${image.toString("base64")}`;
    const seen: DecisionHookContext[] = [];
    const answered: DecisionHookAnswersContext[] = [];
    const before: DecisionBeforeEvent[] = [];
    const after: DecisionAfterEvent[] = [];
    const nl = new NeuroLink({
      decisionHooks: {
        extendQuestions: (context) => {
          seen.push(context);
          return HOST_QUESTIONS;
        },
        onAnswers: (context) => {
          answered.push(context);
        },
      },
    });
    const emitter = nl.getEventEmitter();
    emitter.on("decision:before", (event) =>
      before.push(event as DecisionBeforeEvent),
    );
    emitter.on("decision:after", (event) =>
      after.push(event as DecisionAfterEvent),
    );

    // A host-wired consumer stamps the site itself. The request names xor,
    // carries one image (which only xor reads) and its own per-call
    // credentials — everything the funnel has to keep intact on its way to
    // the wire.
    const result = await nl.tryDecide({
      site: "routing",
      provider: "xor",
      credentials: { xor: { apiKey: "sk-fake-xor", baseURL: fake.baseURL } },
      state: "A product photo from a listing.",
      questions: { urgent: ALL_THREE.urgent },
      images: [image],
    });
    assert(result !== null, "the fake must answer the xor request");
    assert(
      seen.length === 1 && seen[0]!.site === "routing",
      "extendQuestions must run once, stamped as the routing site",
    );
    assert(
      "urgent" in seen[0]!.questions && !("tone" in seen[0]!.questions),
      "the hook must see the consumer's own questions, not its own",
    );

    assert(
      fake.requests.length === 1,
      "exactly one decision request must reach the server",
    );
    const request = fake.requests[0]!;
    assert(
      request.path === "/v1/systemone" &&
        request.authorization === "Bearer sk-fake-xor",
      "the request must reach xor's route on the per-call credentials",
    );
    assert(
      request.body.model === EXPECTED_XOR_MODEL,
      "the body must name the model the registry recorded for xor",
    );
    const wireIds = questionIdsOf(request);
    assert(
      wireIds.includes("urgent") &&
        wireIds.includes("host__0") &&
        wireIds.includes("host__1") &&
        !wireIds.includes("tone") &&
        !wireIds.includes("team"),
      "host questions must travel under the host namespace, never their own ids",
    );
    const images = request.body.images;
    assert(
      Array.isArray(images) &&
        images.length === 1 &&
        images[0] === expectedDataUrl,
      "the wire body must carry the image as one data URL, byte for byte",
    );
    assert(
      !("video" in request.body),
      "no video was sent, so none may appear on the wire",
    );

    // The consumer's result: its own ids only, media accounting intact.
    assert(
      result!.provider === "xor" &&
        "urgent" in result!.answers &&
        !("host__0" in result!.answers) &&
        !("tone" in result!.answers),
      "the consumer must see only its own answers",
    );
    assert(
      result!.mediaBytes === expectedDataUrl.length,
      "mediaBytes must survive the answer split",
    );
    assert(answered.length === 1, "onAnswers must run exactly once");
    assert(
      readDecisionBoolean(answered[0]!.answers, "tone") === 0.9 &&
        readDecisionChoice(answered[0]!.answers, "team")?.choice ===
          "payments" &&
        answered[0]!.result.mediaBytes === expectedDataUrl.length,
      "onAnswers must get the host's answers under its own ids, and the full result with its media accounting",
    );
    assert(
      before.length === 1 &&
        before[0]!.site === "routing" &&
        before[0]!.hostQuestionCount === 2,
      "decision:before must name the site and count the host questions",
    );
    assert(
      after.length === 1 &&
        after[0]!.site === "routing" &&
        after[0]!.provider === "xor" &&
        after[0]!.model === EXPECTED_XOR_MODEL &&
        after[0]!.result?.mediaBytes === expectedDataUrl.length &&
        "urgent" in after[0]!.answers &&
        !("host__0" in after[0]!.answers) &&
        readDecisionBoolean(after[0]!.hostAnswers, "tone") === 0.9,
      "decision:after must split the answers and carry the media accounting",
    );
    assert(
      Buffer.isBuffer(image) &&
        image.equals(await readFile(`${XOR_FIXTURE_DIR}red.png`)),
      "the caller's image Buffer must be left exactly as it was handed in",
    );
  } finally {
    await fake.close();
    restoreEnv();
  }
});

await test("20.23 — decisionLimits({ provider: 'xor' }): a state window and media limits, no question cap, enforced locally", async () => {
  try {
    clearDecisionKeys();
    const nl = new NeuroLink();
    const reading = nl.decisionLimits({ provider: "xor" });
    assert(reading !== null, "no reading for xor");
    assert(
      reading!.provider === "xor" && reading!.model === EXPECTED_XOR_MODEL,
      "the reading must name xor and the model decide() would send",
    );
    assert(
      reading!.maxStateTokens === 200_000,
      "xor must read its conservative 200,000-token state window",
    );
    assert(
      reading!.nonAsciiTokensPerChar === 1,
      "xor must charge non-ASCII text at one token per character",
    );
    assert(
      !("maxQuestions" in reading!),
      "xor has no question-count cap, so maxQuestions must be absent — not Infinity, not undefined-as-a-key",
    );
    assert(
      reading!.media !== undefined &&
        reading!.media.maxImages === 8 &&
        reading!.media.video === true &&
        reading!.media.maxRequestBytes === 8 * 1024 * 1024,
      "the reading must carry xor's media limits: 8 images, one video, an 8 MiB body",
    );
    assert(
      reading!.enforcedLocally === true,
      "xor's limits are enforced locally, unlike typesafe's advisory row",
    );
    // The two text-only providers still read no media, so a host can tell
    // from the reading alone where an image may go.
    assert(
      nl.decisionLimits({ provider: "laya", model: "typed-decisions" })!
        .media === undefined &&
        nl.decisionLimits({ provider: "typesafe" })!.media === undefined,
      "laya and typesafe must read no media limits",
    );
  } finally {
    restoreEnv();
  }
});

await test("20.24 — with no question cap, every well-formed host addition goes: 100 for xor, where laya would keep 63", async () => {
  const fake = await startFakeXor();
  const previousDebug = process.env.NEUROLINK_DEBUG;
  try {
    clearDecisionKeys();
    // Warnings are hidden unless debugging; the absence of the drop warning
    // is part of the contract here.
    process.env.NEUROLINK_DEBUG = "true";
    const HOST_COUNT = 100;
    const many: Record<string, DecisionQuestionMap[string]> = {};
    for (let index = 0; index < HOST_COUNT; index += 1) {
      many[`q${index}`] = {
        type: "boolean",
        instructions: `Host question ${index}?`,
      };
    }
    const hostIds = new Set<string>();
    const warnings: string[] = [];
    const nl = new NeuroLink({
      credentials: { xor: { apiKey: "sk-fake-xor", baseURL: fake.baseURL } },
      decisionHooks: {
        extendQuestions: () => many,
        onAnswers: (context) => {
          for (const id of Object.keys(context.answers)) {
            hostIds.add(id);
          }
        },
      },
    });
    nl.getEventEmitter().on("log-event", (event) => {
      const entry = event as { level?: string; message?: string };
      if (entry.level === "warn" && typeof entry.message === "string") {
        warnings.push(entry.message);
      }
    });
    const result = await nl.tryDecide({
      site: "toolRouting",
      state: SUPPORT_TICKET,
      questions: { urgent: ALL_THREE.urgent },
    });
    assert(result !== null, "the fake must answer the xor request");
    assert(fake.requests.length === 1, "one request must reach the server");
    const wireIds = questionIdsOf(fake.requests[0]!);
    assert(
      wireIds.length === HOST_COUNT + 1 &&
        wireIds.filter((id) => id.startsWith("host__")).length === HOST_COUNT,
      "every host question must reach the wire when the provider caps by tokens, not by count",
    );
    assert(
      hostIds.size === HOST_COUNT && [...hostIds].every((id) => id in many),
      "every host answer must come back under the host's own id",
    );
    assert(
      Object.keys(result!.answers).length === 1 && "urgent" in result!.answers,
      "the consumer must still see only its own answer",
    );
    assert(
      !warnings.some(
        (message) =>
          message.includes("dropped") && message.includes("host question"),
      ),
      "nothing was dropped, so no drop warning may be logged",
    );
  } finally {
    await fake.close();
    if (previousDebug === undefined) {
      delete process.env.NEUROLINK_DEBUG;
    } else {
      process.env.NEUROLINK_DEBUG = previousDebug;
    }
    restoreEnv();
  }
});

restoreEnv();

await runSuite();
