#!/usr/bin/env tsx

/**
 * Continuous Test Suite — model-not-found is retryable inside a ModelPool
 *
 * A pool member is an explicit {provider, model} pair, and members exist
 * precisely because they differ. "This provider has no such model" is therefore
 * a fact about ONE member, not about the request — member#2 runs a different
 * model and may well serve it.
 *
 * Before this change the pool treated it as non-retryable and stopped dead. The
 * observed case: a member naming a retired Anthropic model, where the API
 * answered 404 `not_found_error` and the pool gave up instead of failing over
 * to the member that was perfectly healthy.
 *
 * ## Why this is live rather than stubbed
 *
 * It used to drive the pool with `AIProviderFactory.createProvider` stubbed,
 * which meant importing that factory out of `src/lib/`. The stub also had to
 * share a module graph with the SDK under test, so the suite could not take
 * `NeuroLink` from the built package. Both are gone: member#1 names a model
 * Anthropic really does not have, so the 404 is genuine and the failover is
 * observed through `generate()` exactly as a caller would see it.
 *
 * The cost is coverage the stub used to give cheaply. The auth short-circuit —
 * that a 401 on member#1 must NOT fall through to member#2 — cannot be
 * provoked live without deliberately sending bad credentials, so it is no
 * longer asserted anywhere.
 *
 * Needs credentials for BOTH providers; it skips otherwise, because a pool
 * that cannot reach member#2 proves nothing about failing over to it.
 *
 * Run with: npx tsx test/continuous-test-suite-model-not-found-retryable.ts
 */

import "dotenv/config";
import { NeuroLink } from "../dist/index.js";
import type { ModelPoolMember } from "../src/lib/types/index.js";
import { assert, defineSuite, Skip } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Model-Not-Found Retryability");

const BASE_CONFIG = {
  conversationMemory: { enabled: false },
  disableTools: true,
} as const;

/** A model Anthropic does not serve — the API answers 404 not_found_error. */
const M1: ModelPoolMember = {
  provider: "anthropic",
  model: "claude-definitely-does-not-exist-v99",
};
const M2: ModelPoolMember = { provider: "openai", model: "gpt-4o" };

function requireBothProviders(): void {
  const missing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) {
    missing.push("ANTHROPIC_API_KEY");
  }
  if (!process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }
  if (missing.length > 0) {
    throw new Skip(
      `needs both pool members to be reachable — missing ${missing.join(", ")}`,
    );
  }
}

await test("REGRESSION: a member naming a missing model fails over instead of stopping the pool", async () => {
  requireBothProviders();
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: { members: [M1, M2], strategy: "priority", cooldownMs: 0 },
  });

  const result = await nl.generate({
    input: { text: "Reply with the single word: ok" },
    disableTools: true,
    maxTokens: 32,
    timeout: 120_000,
  });

  assert(
    (result.content ?? "").length > 0,
    "the surviving member must serve the request — member#1's 404 must not stop the pool",
  );
  assert(
    result.provider !== "anthropic",
    "the response must have come from member#2, not the member naming a missing model",
  );
});

await runSuite();
