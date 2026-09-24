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
 * Live tests skip without `TYPESAFE_API_KEY`. The degradation and
 * discriminator tests do NOT skip: "behaves correctly with no key" and "a
 * text-less provider is unreachable from generation" are the contracts that
 * matter most, and neither needs a key.
 *
 * ⚠️ Assertion messages here never interpolate a response payload. `test()`
 * downgrades a throw to SKIP when the message looks like a provider error, so
 * quoting a body containing e.g. "502" turns a real failure green.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-decide.ts
 *      pnpm run test:decide
 */

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
import { defineSuite, logSection, runCLI } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

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
// Laya is a third key that configures a decision provider. A developer's .env
// holding it would otherwise hand every "nothing is configured" test a working
// provider, exactly as the gateway key would.
const REAL_LAYA_KEY = process.env.LAYA_API_KEY;
const HAS_LAYA_KEY =
  typeof REAL_LAYA_KEY === "string" && REAL_LAYA_KEY.trim() !== "";
// Laya has no built-in endpoint, so its live tests also need LAYA_BASE_URL.
const REAL_LAYA_BASE_URL = process.env.LAYA_BASE_URL;
const HAS_LAYA_BASE_URL =
  typeof REAL_LAYA_BASE_URL === "string" && REAL_LAYA_BASE_URL.trim() !== "";

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
}

/**
 * Remove every setting that would configure a decision provider, including
 * LAYA_BASE_URL, which Laya needs alongside its key.
 */
function clearDecisionKeys(): void {
  delete process.env.TYPESAFE_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.LAYA_API_KEY;
  delete process.env.LAYA_BASE_URL;
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
      "Error: No decision provider is configured. Set TYPESAFE_API_KEY or AI_GATEWAY_API_KEY for typesafe, or LAYA_API_KEY and LAYA_BASE_URL for laya.",
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
logSection("16. Laya — the second decision provider");
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
await runSuite();
