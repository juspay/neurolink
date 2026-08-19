#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Model Manifests
 *
 * Zero-API structural checks over MANIFEST_REGISTRY (src/lib/models/manifestRegistry.ts)
 * and its resolver, resolveManifestEntry/resolveManifestEntryExact. Covers the
 * resolution cascade (exact id -> alias -> prefix -> family rule -> default)
 * and the output-ceiling invariant (maxOutputTokens must never exceed the
 * relevant contextWindow) across every registered provider manifest.
 *
 * ## Why this reaches into `dist/lib/` directly (CLAUDE.md rule 15)
 *
 * manifestRegistry.ts has no consumer yet, by design: this PR (model-metadata
 * consolidation, Task 5) is purely additive and deliberately does not migrate
 * any existing code onto the manifest. Confirmed empty blast radius —
 * `dist/index.js` contains no reference to manifestRegistry, and no file
 * under `src/lib/` outside `models/manifestRegistry.ts` /
 * `models/manifests/*` calls `resolveManifestEntry`, `resolveManifestEntryExact`,
 * or reads `MANIFEST_REGISTRY`. There is therefore no `generate()`/`stream()`/
 * CLI path that reaches this resolver at all today — the alias-resolution
 * bug this suite was written to catch (a bare model name silently losing its
 * real contextWindow/vision/functionCalling data to the provider default) is
 * unreachable from any public surface until a future PR wires a consumer
 * onto the manifest. Once a consumer migrates, this suite should be converted
 * (or retired in favor of assertions on that consumer's public output) per
 * rule 15's own guidance that internals reachable only from the inside need
 * a public surface, not a unit test.
 *
 * This is not the rule 15 `allow`-list exception (deterministic control a
 * live call can't give) — it is the same "drive a specific compiled dist/lib
 * module that isn't re-exported from dist/index.js" pattern already used by
 * continuous-test-suite.ts (AccountPool, ModelRouter, the cloaking plugins),
 * -credentials.ts (ProviderFactory/ProviderRegistry), -provider-structure.ts
 * (providerRegistry.js) and others, none of which are on the `allow` list.
 * Every import below resolves under `../dist/lib/...` — the compiled
 * artifact, not raw TypeScript source — so it stays a single module graph
 * per rule 15's "one module graph per suite" mandate, it just isn't the
 * top-level public one.
 *
 * Run: npx tsx test/continuous-test-suite-model-manifests.ts
 *      pnpm run test:model-manifests
 */

import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build.
assertDistFresh();

const { test, runSuite } = defineSuite("Model Manifests");

const {
  resolveManifestEntry,
  resolveManifestEntryExact,
  getManifestForProvider,
  getAllManifestProviders,
} = await import("../dist/lib/models/manifestRegistry.js");

await test("Alias resolves to its canonical entry, not the default", async () => {
  // ollama's "llama3.2:latest" entry declares "llama3.2" as a bare-name
  // alias. Before the resolver consulted aliases, this bare name missed
  // both the exact-match and prefix-match checks (the request string is
  // shorter than the tagged key it would need to be a prefix of) and fell
  // through to the synthesized `_default` entry, silently discarding the
  // model-specific contextWindow/vision/functionCalling data.
  const viaAlias = resolveManifestEntry("ollama", "llama3.2");
  const canonical = resolveManifestEntry("ollama", "llama3.2:latest");
  assert(!!viaAlias, "alias lookup returned nothing");
  assert(!!canonical, "canonical lookup returned nothing");
  assert(
    JSON.stringify(viaAlias) === JSON.stringify(canonical),
    "alias entry does not match its canonical entry",
  );
  assert(
    viaAlias.contextWindow === 131072,
    "alias resolution fell through to the provider default instead of the canonical entry",
  );
});

await test("Alias resolution also works via resolveManifestEntryExact", async () => {
  // anthropic's "claude-sonnet-5" entry declares "sonnet-5" as an alias.
  const viaAlias = resolveManifestEntryExact("anthropic", "sonnet-5");
  assert(!!viaAlias, "exact-path alias lookup returned nothing");
  assert(
    viaAlias.contextWindow === 1_000_000,
    "exact-path alias resolution did not reach the canonical entry",
  );
});

await test("Exact and prefix resolution still take precedence over alias/default", async () => {
  const exact = resolveManifestEntryExact("anthropic", "claude-sonnet-5");
  assert(!!exact, "exact id lookup returned nothing");
  assert(exact.contextWindow === 1_000_000, "exact id resolved wrong entry");

  // A gateway-shaped id ("<canonical-key><suffix>") not itself a key or
  // alias should still resolve via longest-prefix match.
  const prefixed = resolveManifestEntryExact(
    "anthropic",
    "claude-sonnet-5-some-gateway-suffix",
  );
  assert(!!prefixed, "prefix lookup returned nothing");
  assert(
    prefixed.contextWindow === 1_000_000,
    "prefix lookup resolved the wrong entry",
  );
});

await test("Unknown model falls back to an honest provider default", async () => {
  const fallback = resolveManifestEntry("bedrock", "totally-unknown-model-id");
  assert(!!fallback, "default fallback returned nothing");
  const manifest = getManifestForProvider("bedrock");
  assert(!!manifest, "bedrock manifest missing from registry");
  assert(
    fallback.maxOutputTokens <= manifest!.defaultContextWindow,
    "synthesized default advertises an output ceiling above the context window",
  );
});

await test("Every manifest's synthesized/declared default keeps maxOutputTokens <= contextWindow", async () => {
  const providers = getAllManifestProviders();
  assert(providers.length > 0, "no manifest providers registered");

  const failures: string[] = [];
  for (const provider of providers) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      failures.push(`${provider}: manifest missing`);
      continue;
    }
    const resolved = resolveManifestEntry(provider, "__unknown_model_probe__");
    if (!resolved) {
      failures.push(`${provider}: default resolution returned nothing`);
      continue;
    }
    if (resolved.maxOutputTokens > resolved.contextWindow) {
      failures.push(
        `${provider}: default maxOutputTokens (${resolved.maxOutputTokens}) exceeds contextWindow (${resolved.contextWindow})`,
      );
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} provider(s) with an inverted default output ceiling: ${failures.join("; ")}`,
  );
});

await test("Every declared model entry keeps maxOutputTokens <= contextWindow", async () => {
  const providers = getAllManifestProviders();
  const failures: string[] = [];
  for (const provider of providers) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    for (const [modelId, entry] of Object.entries(manifest.models)) {
      if (entry.maxOutputTokens > entry.contextWindow) {
        failures.push(`${provider}/${modelId}`);
      }
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} declared entr(ies) with maxOutputTokens > contextWindow: ${failures.join(", ")}`,
  );
});

await test("Every alias points at a real key in its own manifest, never dangling", async () => {
  // Not a correctness requirement of the resolver (an alias only needs to
  // be a string the caller might pass in), but a data-hygiene check: an
  // alias that collides with another model's own canonical id would shadow
  // that model behind the wrong entry.
  const providers = getAllManifestProviders();
  const failures: string[] = [];
  for (const provider of providers) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    const modelIds = new Set(Object.keys(manifest.models));
    for (const [modelId, entry] of Object.entries(manifest.models)) {
      for (const alias of entry.aliases) {
        if (modelIds.has(alias) && alias !== modelId) {
          failures.push(
            `${provider}: alias "${alias}" on ${modelId} shadows another model's canonical id`,
          );
        }
      }
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} alias/canonical-id collision(s) found`,
  );
});

await runSuite();
