#!/usr/bin/env tsx
import "dotenv/config";

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
 * This file holds the cases that call a real vendor endpoint. Each one skips
 * without the key of the provider it exercises, so the suite costs nothing
 * where no key is set (CI included), and a credential, quota or availability
 * error from the vendor is reported as a skip, not a failure. The cases that
 * need no key and make no network call are in continuous-test-suite-decide.ts,
 * which is declared `offline` so that a real failure there cannot be taken for
 * a skip. Test numbers are shared between the two files, so this one has gaps.
 * The setup both files read is in helpers/decideSuiteShared.ts.
 *
 * ⚠️ Assertion messages here never interpolate a response payload. `test()`
 * downgrades a throw to SKIP when the message looks like a provider error, so
 * quoting a body containing e.g. "502" turns a real failure green.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-decide-live.ts
 *      pnpm run test:decide-live
 *      pnpm run test:decide        (the offline file, then this one)
 */

import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import {
  AIProviderName,
  ClassifierRouter,
  decideSearchPlan,
  NeuroLink,
  PROVIDER_DESCRIPTORS_BY_NAME,
  readDecisionBoolean,
  readDecisionChoice,
  readDecisionScore,
  readDecisionValue,
  selectIrrelevantMessages,
  selectServersByDecision,
  summaryPreservesContext,
  TYPESAFE_MAX_STATE_TOKENS,
} from "../dist/index.js";
import type { DecisionQuestionMap } from "../dist/index.js";
import { defineSuite, logSection, runCLI } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  ALL_THREE,
  CATALOG,
  HARD_PROMPT,
  HAS_KEY,
  PERPLEXITY_FIXTURE_DIR,
  PERPLEXITY_ONE_QUESTION,
  POOL,
  REAL_CLOUDFLARE_ACCOUNT_ID,
  REAL_CLOUDFLARE_KEY,
  REAL_KEY,
  REAL_LAYA_BASE_URL,
  REAL_LAYA_KEY,
  REAL_PERPLEXITY_KEY,
  REAL_XOR_BASE_URL,
  REAL_XOR_KEY,
  SUPPORT_TICKET,
  TRANSCRIPT,
  XOR_COLOR_QUESTION,
  XOR_FIXTURE_DIR,
  XOR_MEDIA_MODEL,
  assert,
  clearDecisionKeys,
  expectReachesTransport,
  failureOf,
  fetchCapture,
  isRecordLike,
  looksLikeStackTrace,
  readDecisionFailure,
  restoreEnv,
} from "./helpers/decideSuiteShared.js";
import type {
  DecideOptions,
  DecisionFailure,
} from "./helpers/decideSuiteShared.js";

assertDistFresh();

const { test, runSuite } = defineSuite(
  "decide inference type (TypeSafe/Jev) — live",
  { perTestTimeoutMs: 90_000 },
);

const HAS_LAYA_KEY =
  typeof REAL_LAYA_KEY === "string" && REAL_LAYA_KEY.trim() !== "";
const HAS_LAYA_BASE_URL =
  typeof REAL_LAYA_BASE_URL === "string" && REAL_LAYA_BASE_URL.trim() !== "";
const HAS_XOR_KEY =
  typeof REAL_XOR_KEY === "string" && REAL_XOR_KEY.trim() !== "";
const HAS_XOR_BASE_URL =
  typeof REAL_XOR_BASE_URL === "string" && REAL_XOR_BASE_URL.trim() !== "";
const HAS_PERPLEXITY_KEY =
  typeof REAL_PERPLEXITY_KEY === "string" && REAL_PERPLEXITY_KEY.trim() !== "";
const HAS_CLOUDFLARE_CLEF =
  typeof REAL_CLOUDFLARE_KEY === "string" &&
  REAL_CLOUDFLARE_KEY.trim() !== "" &&
  typeof REAL_CLOUDFLARE_ACCOUNT_ID === "string" &&
  REAL_CLOUDFLARE_ACCOUNT_ID.trim() !== "";

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

// ───────────────────────────────────────────────────────────────────────────
logSection("6. Classifier routing — auto-upgrade and silent fallback");
// ───────────────────────────────────────────────────────────────────────────

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
logSection("9. Tool routing — a server is dropped only on a confident no");
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
logSection("10. Context relevance — Stage 0 of compaction");
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
logSection("16. Laya — a decision provider at a configured endpoint");
// ───────────────────────────────────────────────────────────────────────────

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
        SUBQ_API_KEY: "",
        SUBQ_BASE_URL: "",
        SUBQ_MODEL: "",
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "",
        OPENAI_API_BASE: "",
        OPENAI_DECISIONS_BASE_URL: "",
        OPENAI_DECISIONS_MODEL: "",
        SCALEDOWN_API_KEY: "",
        SCALEDOWN_BASE_URL: "",
        SCALEDOWN_MODEL: "",
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
        SUBQ_API_KEY: "",
        SUBQ_BASE_URL: "",
        SUBQ_MODEL: "",
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "",
        OPENAI_API_BASE: "",
        OPENAI_DECISIONS_BASE_URL: "",
        OPENAI_DECISIONS_MODEL: "",
        SCALEDOWN_API_KEY: "",
        SCALEDOWN_BASE_URL: "",
        SCALEDOWN_MODEL: "",
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
        SUBQ_API_KEY: "",
        SUBQ_BASE_URL: "",
        SUBQ_MODEL: "",
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "",
        OPENAI_API_BASE: "",
        OPENAI_DECISIONS_BASE_URL: "",
        OPENAI_DECISIONS_MODEL: "",
        SCALEDOWN_API_KEY: "",
        SCALEDOWN_BASE_URL: "",
        SCALEDOWN_MODEL: "",
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
logSection(
  "17. XOR — a decision provider that also reads an image and audio, and extracts values",
);

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
  // The model asked for is an alias (`xor-latest`), and the server answers with
  // the id that served it (`xor-text-N`), so the alias itself is not what comes
  // back; a LiteLLM route may also serve XOR under a name of its own. The check
  // is that a served model is reported at all.
  assert(
    typeof result.model === "string" && result.model.trim() !== "",
    "the reported model must name the model that served the request",
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
      model: XOR_MEDIA_MODEL,
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

await test("17.15 — live: decide --provider xor --image --format json is clean JSON", async () => {
  requireXorKey();
  const result = await runCLI(
    [
      "decide",
      "Look at the attached image.",
      "--provider",
      "xor",
      "--model",
      XOR_MEDIA_MODEL,
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

const XOR_INVOICE =
  "Invoice INV-2024-0892 for 18,275.50 rupees, due on 15 September.";

function rethrowTransientXor(error: unknown): never {
  throw isTransientXorFailure(error)
    ? new Error("SKIP: xor returned a transient reply")
    : error;
}

await test("17.19 — live: value questions extract a float, a pattern-bound string and an abstained null", async () => {
  requireXorKey();
  restoreEnv();
  const result = await new NeuroLink()
    .decide({
      provider: "xor",
      state: XOR_INVOICE,
      questions: {
        amount: {
          type: "value",
          dtype: "float",
          instructions: "What is the invoice amount?",
        },
        ref: {
          type: "value",
          instructions: "What is the invoice reference?",
          pattern: "INV-[0-9]{4}-[0-9]{4}",
        },
        phone: {
          type: "value",
          instructions: "What is the customer's phone number?",
        },
      },
    })
    .catch(rethrowTransientXor);
  assert(
    readDecisionValue(result.answers, "amount")?.value === 18275.5,
    "the amount must be read as the float on the invoice",
  );
  assert(
    readDecisionValue(result.answers, "ref")?.value === "INV-2024-0892",
    "the reference must match the pattern and the invoice",
  );
  const phone = readDecisionValue(result.answers, "phone");
  assert(
    phone !== undefined && phone.value === null && phone.unknown,
    "a value the state does not hold must come back null and unknown",
  );
});

await test("17.20 — live: a choice with unknown picks unknown when no option fits", async () => {
  requireXorKey();
  restoreEnv();
  const result = await new NeuroLink()
    .decide({
      provider: "xor",
      state: "Customer: what is the weather like in Bengaluru today?",
      questions: {
        intent: {
          type: "choice",
          unknown: true,
          instructions: "What does the customer want to do with their plan?",
          criteria: {
            upgrade: "move to a higher plan",
            downgrade: "move to a lower plan",
          },
        },
      },
    })
    .catch(rethrowTransientXor);
  const intent = result.answers.intent;
  assert(
    intent?.type === "choice" &&
      intent.choice === "unknown" &&
      intent.unknown === true,
    "an off-topic state must be answered unknown",
  );
  assert(
    readDecisionChoice(result.answers, "intent")?.unknown === true,
    "the choice reader must carry the unknown flag",
  );
});

await test("17.21 — live: a score over object levels keeps its legend as JSON text", async () => {
  requireXorKey();
  restoreEnv();
  const result = await new NeuroLink()
    .decide({
      provider: "xor",
      state: "The support was fantastic, thank you so much!",
      questions: {
        mood: {
          type: "score",
          instructions: "How satisfied is the customer?",
          criteria: [{ label: "unhappy" }, { label: "happy" }],
        },
      },
    })
    .catch(rethrowTransientXor);
  const mood = readDecisionScore(result.answers, "mood");
  assert(mood !== undefined, "the score answer must not be dropped");
  assert(
    mood!.legend["1"] === JSON.stringify({ label: "happy" }),
    "the legend must carry the level as its JSON text",
  );
});

// One second of an 8-bit 440 Hz tone: no fixture file, and its tokens prove the
// clip reached the model.
function toneWav(): Buffer {
  const rate = 8000;
  const data = Buffer.alloc(rate);
  for (let i = 0; i < rate; i += 1) {
    data[i] = Math.round(128 + 100 * Math.sin((2 * Math.PI * 440 * i) / rate));
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "latin1");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8, "latin1");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36, "latin1");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

await test("17.22 — live: an audio clip with no state is heard: it costs input tokens a text-only request does not", async () => {
  requireXorKey();
  restoreEnv();
  const nl = new NeuroLink();
  const questions = {
    beep: { type: "boolean" as const, instructions: "Is there a beep?" },
  };
  const silent = await nl
    .decide({ provider: "xor", model: XOR_MEDIA_MODEL, state: "", questions })
    .catch(rethrowTransientXor);
  const heard = await nl
    .decide({
      provider: "xor",
      model: XOR_MEDIA_MODEL,
      state: "",
      questions,
      audio: toneWav(),
    })
    .catch(rethrowTransientXor);
  assert(
    heard.answers.beep?.type === "boolean",
    "the audio request must be answered",
  );
  assert(
    (heard.mediaBytes ?? 0) > 0,
    "the audio must be counted in mediaBytes",
  );
  assert(
    heard.usage.inputTokens > silent.usage.inputTokens,
    "the clip must cost input tokens, or it never reached the model",
  );
  const counts = nl
    .getSpans()
    .filter((span) => span.type === "model.decision")
    .map(
      (span) =>
        (span.attributes as Record<string, unknown>)["decision.audio.count"],
    );
  assert(
    counts.includes(0) && counts.includes(1),
    "the decision spans must count the clip on the audio request alone",
  );
});

await test("17.23 — live: 200 questions through tryDecide come back whole, split at XOR's 128-question cap", async () => {
  requireXorKey();
  restoreEnv();
  const questions: Record<string, DecisionQuestionMap[string]> = {};
  for (let index = 0; index < 200; index += 1) {
    questions[`q${index}`] = {
      type: "boolean",
      instructions: `Statement ${index}: the order is cancelled?`,
    };
  }
  const result = await new NeuroLink().tryDecide({
    provider: "xor",
    state: "Order 45678 has been cancelled and refunded.",
    questions,
  });
  if (result === null) {
    throw new Error(
      "SKIP: xor returned no decision (transient or unavailable)",
    );
  }
  assert(
    Object.keys(result.answers).length === 200,
    "every one of the 200 questions must be answered",
  );
});

restoreEnv();
logSection("18. Perplexity Decisions — a hosted decision provider");
type DecideResult = Awaited<ReturnType<NeuroLink["decide"]>>;

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

await test("18.27a — live: a rejected key reaches the real API and comes back as authentication, sent once", async () => {
  requirePerplexityKey();
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

// Text-only canaries on the service's request-size ceiling, one per Clef model,
// each bracketed by two sizes of "a" x N measured against the live service.
// Cloudflare refuses in two ways: 413/code 5021 when the encoded body in bytes
// / 4 exceeds twice the context window the message prints, and 422/code 3030
// when the real token count exceeds the window (maximum 65,529 for clef and
// 24,576 for clef-flash on 2026-10-23; this filler is 8 characters a token, so
// an accepted request is billed about 65,000 tokens on clef and 24,000 on
// clef-flash).
// clef: 520,000 accepted and 525,000 refused with 5021 on 2026-10-04 and again
// on 2026-10-23. clef-flash had the same window on 2026-10-04 and 520,000 was
// accepted; by 2026-10-23 its window was 24,576: 190,000 was accepted (23,891
// tokens), 195,625 got 422/3030 and 200,000 got 5021. Each accepted size is
// within 3% of the real-token limit and each refused size is just above the
// 5021 edge (clef-flash 196,608 bytes, clef 524,288), where Cloudflare answers
// 413/5021; closer to the edge it answers 422/3030 instead, which is
// deliberately not what these assert. These bodies are plain text: a request
// with an image is not held to that byte edge (case 19.14 sends about 253 KB to
// clef-flash and is answered). A changed result requires remeasurement.
async function expectClefCeiling(
  model: string,
  acceptedChars: number,
  refusedChars: number,
): Promise<void> {
  requireCloudflareClef();
  restoreEnv();
  const questions = {
    q: { type: "noul", instructions: "Is this about checkout?" },
  };
  const inside = await clefRaw(model, {
    model,
    state: "a".repeat(acceptedChars),
    questions,
  });
  assert(
    inside.status === 200,
    `a ${acceptedChars}-character request to ${model} must be accepted (got ${inside.status}): the observed service ceiling changed; re-measure before changing NeuroLink's 256,000-byte cap`,
  );
  const { status, json } = await clefRaw(model, {
    model,
    state: "a".repeat(refusedChars),
    questions,
  });
  const code = (json as { errors?: Array<{ code?: number }> })?.errors?.[0]
    ?.code;
  assert(
    status === 413 && code === 5021,
    `a ${refusedChars}-character request to ${model} must be refused with 413 and code 5021 (got ${status}, ${code}): Cloudflare may have moved the model's context window or its cap; re-measure the request limit`,
  );
}

await test("19.11 — live: clef-flash text-only service ceiling accepts 190,000 and refuses 200,000 with 413/code 5021", async () => {
  await expectClefCeiling("clef-flash", 190_000, 200_000);
});

await test("19.11b — live: clef text-only service ceiling accepts 520,000 and refuses 525,000 with 413/code 5021", async () => {
  await expectClefCeiling("clef", 520_000, 525_000);
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

restoreEnv();

await runSuite();
