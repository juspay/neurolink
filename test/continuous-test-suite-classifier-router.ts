#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous test suite for the ClassifierRouter subsystem.
 *
 * Coverage (no API keys required — uses a fake LLM generate fn):
 *   A. Heuristic classification → difficulty buckets
 *   B. Metadata-driven model selection (cost-asc / quality-desc / balanced)
 *   C. tierMap precedence over pool scoring
 *   D. Capability filtering
 *   E. Tool narrowing (directives + classifier-suggested tools)
 *   F. LLM strategy parse + fail-open fallback to heuristic
 *   G. No-op cases (empty pool, no tools → null)
 *
 * Run: pnpm run test:classifier-router
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";

import {
  ClassifierRouter,
  classifyHeuristic,
} from "../src/lib/routing/index.js";
import type {
  ClassifierGenerateFn,
  ClassifierRouterPoolMember,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("ClassifierRouter");

// ── Fixtures ────────────────────────────────────────────────────────────────
// Model ids deliberately NOT in the registry, so enrichment is a no-op and the
// declared cost/quality drive ranking deterministically.
const CHEAP: ClassifierRouterPoolMember = {
  provider: "alpha",
  model: "cheap-1",
  cost: 0.1,
  quality: 1,
};
const MID: ClassifierRouterPoolMember = {
  provider: "beta",
  model: "mid-1",
  cost: 0.5,
  quality: 2,
};
const CAPABLE: ClassifierRouterPoolMember = {
  provider: "gamma",
  model: "capable-1",
  cost: 2,
  quality: 3,
};
// Intentionally unordered to prove ranking, not declared order.
const POOL: ClassifierRouterPoolMember[] = [CAPABLE, MID, CHEAP];

/** A fake LLM classifier that returns canned structured output. */
const fakeGen =
  (out: Record<string, unknown>): ClassifierGenerateFn =>
  async () => ({ structuredData: out });

/** A fake LLM classifier that always fails (exercises fail-open). */
const throwingGen: ClassifierGenerateFn = async () => {
  throw new Error("classifier model unavailable");
};

// ── A. Heuristic classification ───────────────────────────────────────────────

await test("heuristic: greeting classifies as trivial/simple", () => {
  const d = classifyHeuristic({ prompt: "hi" });
  assert(
    d.difficulty === "trivial" || d.difficulty === "simple",
    `expected trivial/simple, got ${d.difficulty}`,
  );
});

await test("heuristic: deep multi-step analysis classifies as hard/expert", () => {
  const d = classifyHeuristic({
    prompt:
      "Analyze and compare the architectural trade-offs between microservices " +
      "and a monolith. Design a phased migration strategy, evaluate the " +
      "performance and scalability impact, and explain why each option " +
      "optimizes cost differently.",
  });
  assert(
    d.difficulty === "hard" || d.difficulty === "expert",
    `expected hard/expert, got ${d.difficulty}`,
  );
});

await test("heuristic: vision/tools request flags required capabilities", () => {
  const d = classifyHeuristic({
    prompt: "describe this",
    requiresVision: true,
    hasTools: true,
  });
  assert(
    !!d.requiredCapabilities?.includes("vision"),
    "expected 'vision' capability",
  );
  assert(
    !!d.requiredCapabilities?.includes("tools"),
    "expected 'tools' capability",
  );
});

// ── B. Metadata-driven model selection (difficulty forced via fake LLM) ───────

await test("select: trivial → cheapest member (cost-asc)", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "trivial" }) },
  );
  const d = await router.route({ prompt: "anything" });
  assert(d !== null, "decision should not be null");
  assertEqual(d?.provider, "alpha", "trivial routes to cheapest provider");
  assertEqual(d?.model, "cheap-1", "trivial routes to cheapest model");
});

await test("select: expert → most capable member (quality-desc)", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "expert" }) },
  );
  const d = await router.route({ prompt: "anything" });
  assertEqual(d?.provider, "gamma", "expert routes to most capable provider");
  assertEqual(d?.model, "capable-1", "expert routes to most capable model");
});

await test("select: moderate → balanced (best quality-minus-cost)", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "moderate" }) },
  );
  const d = await router.route({ prompt: "anything" });
  // mid: 2-0.5=1.5 ; capable: 3-2=1 ; cheap: 1-0.1=0.9  → mid wins
  assertEqual(d?.provider, "beta", "moderate routes to the balanced member");
});

await test("select: modelFallbacks are ranked best-first", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "expert" }) },
  );
  const d = await router.route({ prompt: "anything" });
  assertEqual(
    d?.modelFallbacks?.[0]?.provider,
    "beta",
    "first fallback after capable is mid",
  );
  assertEqual(
    d?.modelFallbacks?.[1]?.provider,
    "alpha",
    "second fallback is cheap",
  );
});

// ── C. tierMap precedence ─────────────────────────────────────────────────────

await test("tierMap overrides pool scoring for its difficulty", async () => {
  const router = new ClassifierRouter(
    {
      enabled: true,
      classifier: "llm",
      pool: POOL,
      tierMap: { expert: [{ provider: "special", model: "sp-1" }] },
    },
    { generate: fakeGen({ difficulty: "expert" }) },
  );
  const d = await router.route({ prompt: "anything" });
  assertEqual(d?.provider, "special", "tierMap entry wins");
  assertEqual(d?.model, "sp-1", "tierMap model wins");
});

// ── D. Capability filtering ───────────────────────────────────────────────────

await test("capability filter drops members that can't satisfy requirement", async () => {
  const noVision: ClassifierRouterPoolMember = {
    provider: "q",
    model: "q-1",
    quality: 3,
    capabilities: ["tools"],
  };
  const vision: ClassifierRouterPoolMember = {
    provider: "v",
    model: "v-1",
    quality: 2,
    capabilities: ["vision", "tools"],
  };
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: [noVision, vision] },
    {
      generate: fakeGen({
        difficulty: "expert",
        requiredCapabilities: ["vision"],
      }),
    },
  );
  const d = await router.route({ prompt: "anything" });
  // Even though noVision has higher quality, it lacks "vision" and is dropped.
  assertEqual(d?.provider, "v", "only the vision-capable member survives");
});

// ── E. Tool narrowing ─────────────────────────────────────────────────────────

await test("toolDirectives apply per difficulty", async () => {
  const router = new ClassifierRouter(
    {
      enabled: true,
      classifier: "llm",
      pool: POOL,
      toolDirectives: {
        simple: { excludeTools: ["heavyTool"], toolFilter: ["a", "b"] },
      },
    },
    { generate: fakeGen({ difficulty: "simple" }) },
  );
  const d = await router.route({ prompt: "anything" });
  assert(
    !!d?.excludeTools?.includes("heavyTool"),
    "directive excludeTools applied",
  );
  assertEqual(d?.toolFilter?.length, 2, "directive toolFilter applied");
});

await test("classifier-suggested tools become the allowlist when no directive", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    {
      generate: fakeGen({
        difficulty: "moderate",
        suggestedTools: ["search_knowledge_base"],
      }),
    },
  );
  const d = await router.route({ prompt: "anything" });
  assertEqual(
    d?.toolFilter?.[0],
    "search_knowledge_base",
    "suggestedTools → toolFilter",
  );
});

// ── F. LLM strategy parse + fail-open ─────────────────────────────────────────

await test("llm strategy uses the model's difficulty verdict", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "trivial", confidence: 0.9 }) },
  );
  const d = await router.route({ prompt: "this prompt text is irrelevant" });
  assertEqual(d?.difficulty, "trivial", "uses the LLM verdict, not heuristic");
});

await test("llm failure falls back to heuristic (still routes)", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: throwingGen },
  );
  const d = await router.route({ prompt: "hi" });
  assert(d !== null, "should still produce a decision via heuristic fallback");
  // "hi" is trivial/simple → cost-asc → cheapest.
  assertEqual(d?.provider, "alpha", "heuristic fallback still selects a model");
});

// ── G. Heuristic default + no-op cases ────────────────────────────────────────

await test("default strategy (heuristic) routes an easy prompt to a cheap model", async () => {
  const router = new ClassifierRouter({ enabled: true, pool: POOL });
  const d = await router.route({ prompt: "hi" });
  assertEqual(d?.provider, "alpha", "easy prompt → cheapest via heuristic");
});

await test("empty pool with no tool directives → null (no-op)", async () => {
  const router = new ClassifierRouter({ enabled: true, pool: [] });
  const d = await router.route({ prompt: "hello there" });
  assertEqual(d, null, "nothing to route and no tools → null");
});

// ── H. Generic custom models (LiteLLM/OpenAI-compatible — NOT in registry) ────

await test("heuristic + custom models via `tiers` (no registry, no cost/quality)", async () => {
  // Pure host-defined mapping; model ids are arbitrary/custom.
  const liteFast: ClassifierRouterPoolMember = {
    provider: "litellm",
    model: "my-fast-endpoint",
    tiers: ["trivial", "simple", "moderate"],
  };
  const liteStrong: ClassifierRouterPoolMember = {
    provider: "litellm",
    model: "my-strong-endpoint",
    tiers: ["hard", "expert"],
  };
  const router = new ClassifierRouter({
    enabled: true,
    classifier: "heuristic",
    pool: [liteStrong, liteFast], // order shouldn't matter
  });
  const easy = await router.route({ prompt: "hi" });
  assertEqual(easy?.model, "my-fast-endpoint", "easy → fast custom model");
  const hard = await router.route({
    prompt:
      "Analyze and compare the architectural trade-offs between microservices " +
      "and a monolith, design a migration strategy, and evaluate the " +
      "scalability and performance implications in depth.",
  });
  assertEqual(hard?.model, "my-strong-endpoint", "hard → strong custom model");
});

await test("llm classifier selects a custom model directly by id (description-driven)", async () => {
  const alpha: ClassifierRouterPoolMember = {
    provider: "litellm",
    model: "alpha-endpoint",
    description: "cheap & fast, for simple Q&A",
  };
  const beta: ClassifierRouterPoolMember = {
    provider: "litellm",
    model: "beta-endpoint",
    description: "powerful reasoning model for complex analysis",
  };
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: [alpha, beta] },
    {
      generate: fakeGen({
        difficulty: "hard",
        selectedModelId: "litellm/beta-endpoint",
      }),
    },
  );
  const d = await router.route({ prompt: "x" });
  assertEqual(d?.model, "beta-endpoint", "uses the LLM's direct model pick");
  assertEqual(
    d?.modelFallbacks?.[0]?.model,
    "alpha-endpoint",
    "the unpicked model becomes the fallback",
  );
});

await test("llm direct pick honors an explicit member `id`", async () => {
  const router = new ClassifierRouter(
    {
      enabled: true,
      classifier: "llm",
      pool: [
        { provider: "litellm", model: "x", id: "smart" },
        { provider: "litellm", model: "y", id: "cheap" },
      ],
    },
    { generate: fakeGen({ difficulty: "moderate", selectedModelId: "smart" }) },
  );
  const d = await router.route({ prompt: "x" });
  assertEqual(d?.model, "x", "resolves the explicit id 'smart'");
});

await test("llm invalid/absent pick falls back to difficulty selection", async () => {
  const router = new ClassifierRouter(
    { enabled: true, classifier: "llm", pool: POOL },
    { generate: fakeGen({ difficulty: "expert", selectedModelId: "nope" }) },
  );
  const d = await router.route({ prompt: "x" });
  assertEqual(
    d?.provider,
    "gamma",
    "bad id → difficulty path (expert → most capable)",
  );
});

await runSuite();
