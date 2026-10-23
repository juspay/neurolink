#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous test suite for the ModelPool subsystem — the live case.
 *
 * Section F of the pool suite: a pool whose first member names a model that
 * does not exist falls back to a real provider. It needs an Anthropic key and
 * SKIPs without one, or when the provider answers with a credential, quota or
 * availability error. It lives apart from sections A–E
 * (continuous-test-suite-model-pool.ts) because those stub
 * `AIProviderFactory.createProvider`, make no network call, and are declared
 * `offline`, where a provider-shaped error is a failure rather than a skip.
 *
 * Run: pnpm run test:model-pool-live
 *      pnpm run test:model-pool      (sections A–E, then this one)
 */

import { defineSuite, Skip, assert } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { isExpectedProviderError } from "./helpers/envGuard.js";

const { test, runSuite } = defineSuite("ModelPool (live)");

// ─────────────────────────────────────────────────────────────────────────────
// Section F — Live-gated integration: real pool fallback via NeuroLink
// ─────────────────────────────────────────────────────────────────────────────

await test("[LIVE] pool falls back from bogus model to real provider", async () => {
  // Guard: skip if no anthropic key available
  skipUnlessProviderAvailable("anthropic");

  // Dynamically import NeuroLink only if we have keys (avoids initialization
  // side-effects when keys are absent)
  const { NeuroLink } = await import("../dist/index.js");

  const nl = new NeuroLink({
    conversationMemory: { enabled: false },
    modelPool: {
      members: [
        // Member 1: deliberately bogus model that will fail
        {
          provider: "anthropic",
          model: "claude-definitely-does-not-exist-v99",
        },
        // Member 2: omit the model so the provider's current default is used.
        // Pinning a specific id is brittle — older ids (claude-haiku-3-5,
        // claude-3-5-haiku-*) are now end-of-life and 404 on the live API.
        { provider: "anthropic" },
      ],
      strategy: "priority",
      cooldownMs: 0,
    },
  });

  try {
    const result = await nl.generate({
      input: { text: "Say 'pool-fallback-ok' and nothing else." },
      disableTools: true,
    });

    assert(
      typeof result.content === "string" && result.content.length > 0,
      `Expected non-empty content from pool fallback, got: ${JSON.stringify(result.content)}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(
        `provider error (expected in CI without keys): ${msg.slice(0, 100)}`,
      );
    }
    throw err;
  }
});

await runSuite();
