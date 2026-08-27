#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous test suite for ClassifierRouter — observability + ranking.
 *
 * Coverage:
 *   A. metaFor() registry-miss/registry-throw logging (no more silent catch-all).
 *   B. rank() no longer interleaves fully-unmeasured candidates via the 0.5
 *      NEUTRAL fill — they sort after every measured candidate instead.
 *
 * Both are exercised through the router's public `route()` entry point (heuristic
 * classifier, no LLM) rather than the private `rank()`/`metaFor()` methods, per
 * CLAUDE.md rule 15 — this suite drives the shipped surface only.
 *
 * Run: pnpm run test:classifier-router (tsx runner, no API keys required)
 */

// ClassifierRouter is barrel-exported from the package — this suite tests the
// shipped surface, so it imports from the built entry rather than from
// `src/lib/`. Types are structural and side-effect-free, so importing them
// from `src/lib/types/` (the established pattern in continuous-test-suite-
// model-pool.ts) does not create a second module graph for anything with
// runtime identity.
import { assertDistFresh } from "./helpers/distFreshness.js";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { ClassifierRouter } from "../dist/index.js";
import type {
  ClassifierLogger,
  ClassifierRouterDecision,
  ClassifierRouterPoolMember,
} from "../src/lib/types/index.js";

await assertDistFresh();

const { test, runSuite } = defineSuite("ClassifierRouter", {
  offline: true,
});

/** Collects logger calls as `"debug:<message>"` / `"warn:<message>"` tags. */
function makeSpyLogger(): { logger: ClassifierLogger; calls: string[] } {
  const calls: string[] = [];
  const logger: ClassifierLogger = {
    debug: (message: string) => calls.push(`debug:${message}`),
    warn: (message: string) => calls.push(`warn:${message}`),
  };
  return { logger, calls };
}

/** Flattens a route() decision into an ordered `provider/model` list. */
function orderedIds(decision: ClassifierRouterDecision | null): string[] {
  if (!decision?.provider) {
    return [];
  }
  const primary = `${decision.provider}/${decision.model ?? ""}`;
  const rest = (decision.modelFallbacks ?? []).map(
    (m: ClassifierRouterPoolMember) => `${m.provider}/${m.model ?? ""}`,
  );
  return [primary, ...rest];
}

// A short, keyword-neutral prompt: analyzePrompt finds no fast/reasoning
// signal, so classifyHeuristic falls back to its length proxy and — under 80
// chars — always lands on "simple", which DIFFICULTY_RANK_MODE maps to
// "cost-asc". This keeps every test in this suite independent of the
// heuristic's keyword scoring.
const SIMPLE_PROMPT = "hi";

await test("metaFor: a registry miss is logged at debug, not swallowed silently", async () => {
  const { logger, calls } = makeSpyLogger();
  const router = new ClassifierRouter(
    {
      enabled: true,
      pool: [{ provider: "openai", model: "totally-unregistered-model-xyz" }],
    },
    { logger },
  );

  await router.route({ prompt: SIMPLE_PROMPT });

  const debugCalls = calls.filter((c) => c.startsWith("debug:"));
  assert(
    debugCalls.length > 0,
    "expected a debug log for the unregistered model — mismatch on call count",
  );
  assert(
    debugCalls.some((c) => c.includes("no registry match")),
    "expected the debug log to describe a registry miss — mismatch on message shape",
  );
  const warnCalls = calls.filter((c) => c.startsWith("warn:"));
  assertEqual(
    warnCalls.length,
    0,
    "a registry miss is routine and must not be logged at warn",
  );
});

await test("metaFor: a registered model produces no miss log", async () => {
  const { logger, calls } = makeSpyLogger();
  const router = new ClassifierRouter(
    {
      enabled: true,
      pool: [{ provider: "openai", model: "gpt-4o" }],
    },
    { logger },
  );

  await router.route({ prompt: SIMPLE_PROMPT });

  assertEqual(
    calls.length,
    0,
    "a known registry model should not produce any miss/throw log",
  );
});

await test("rank(): a fully-unmeasured candidate sorts after every measured candidate (cost-asc)", async () => {
  const router = new ClassifierRouter({
    enabled: true,
    pool: [
      { provider: "openai", model: "gpt-4o", cost: 0.9, quality: 0.9 },
      {
        provider: "unknown",
        model: "unmeasured-model",
        cost: undefined,
        quality: undefined,
      },
      { provider: "openai", model: "gpt-4o-mini", cost: 0.1, quality: 0.6 },
    ],
  });

  const decision = await router.route({ prompt: SIMPLE_PROMPT });
  const order = orderedIds(decision);

  assertEqual(
    order.length,
    3,
    "expected all three pool members to appear in the ranked order",
  );
  assertEqual(
    order[order.length - 1],
    "unknown/unmeasured-model",
    "the fully-unmeasured candidate must rank last, not interleaved via the 0.5 fill",
  );
  assertEqual(
    order[0],
    "openai/gpt-4o-mini",
    "cheapest measured candidate must still rank first among measured candidates",
  );
});

await test("rank(): a partially-measured candidate (cost known, quality unknown) is NOT treated as unmeasured", async () => {
  // Only candidates missing BOTH cost and quality are excluded from the
  // primary ordering — a candidate with one real signal still competes on it.
  const router = new ClassifierRouter({
    enabled: true,
    pool: [
      { provider: "openai", model: "gpt-4o", cost: 0.9, quality: 0.9 },
      {
        provider: "unknown",
        model: "unmeasured-model",
        cost: undefined,
        quality: undefined,
      },
      { provider: "openai", model: "gpt-4o-mini", cost: 0.05 },
    ],
  });

  const decision = await router.route({ prompt: SIMPLE_PROMPT });
  const order = orderedIds(decision);

  assertEqual(
    order[order.length - 1],
    "unknown/unmeasured-model",
    "only the fully-unmeasured candidate should be pushed to the end",
  );
  assertEqual(
    order[0],
    "openai/gpt-4o-mini",
    "the partially-measured candidate's real cost signal should still win cost-asc",
  );
});

await runSuite();
