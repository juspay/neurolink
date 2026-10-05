#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Model Manifests
 *
 * Zero-API structural checks over MANIFEST_REGISTRY (src/lib/models/manifestRegistry.ts)
 * and its resolver, resolveManifestEntry/resolveManifestEntryExact. Covers the
 * resolution cascade (exact id -> alias -> prefix -> family rule -> default),
 * the output-ceiling invariant (maxOutputTokens must never exceed the
 * relevant contextWindow) across every registered provider manifest, and —
 * for every manifest model that carries verified pricing — that the
 * manifest's per-model data actually reaches every real consumer:
 * getContextWindowSize, calculateCost, MODEL_REGISTRY,
 * ProviderImageAdapter.supportsVision, and PROVIDER_MAX_TOKENS. That last
 * group is the model-metadata consolidation plan's core promise (a single
 * source of truth every consumer agrees with), and the whole reason the
 * manifest exists rather than five hand-maintained tables.
 *
 * ## Why this reaches into `dist/` directly (CLAUDE.md rule 15)
 *
 * manifestRegistry.ts is no longer "no consumer yet" — contextWindows.ts,
 * pricing.ts, modelRegistry.ts, providerImageAdapter.ts, and core/constants.ts
 * all resolve against it now. But of those five consumer surfaces only
 * `calculateCost`/`hasPricing` are re-exported from `dist/index.js`;
 * `getContextWindowSize`, `MODEL_REGISTRY`, `ProviderImageAdapter`, and
 * `PROVIDER_MAX_TOKENS` are internal to their own modules and never reach
 * the package's public API. There is therefore still no `generate()`/
 * `stream()`/CLI call that exercises any of those four by name — a caller
 * only ever observes their combined, provider-specific effect (the context
 * actually sent, the image accepted or rejected). Asserting on that
 * combined effect per model would mean live provider calls per sampled
 * model, which is exactly the "convenience, not a rule-15 exception" trap
 * this rule warns against, not a way to reach the same guarantee more
 * honestly. Reaching directly into the compiled internal modules is the
 * same "drive a specific compiled dist module that isn't re-exported from
 * dist/index.js" pattern already used by continuous-test-suite.ts
 * (AccountPool, ModelRouter, the cloaking plugins), -credentials.ts
 * (ProviderFactory/ProviderRegistry), -provider-structure.ts
 * (providerRegistry.js) and others, none of which are on the `allow` list.
 * Every import below resolves under `../dist/...` — the compiled
 * artifact, not raw TypeScript source — so it stays a single module graph
 * per rule 15's "one module graph per suite" mandate, it just isn't the
 * top-level public one.
 *
 * Run: npx tsx test/continuous-test-suite-model-manifests.ts
 *      pnpm run test:model-manifests
 */

import { assert, assertNotNull, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { ProviderModelManifestEntry } from "../dist/types/model.js";

// Fail loudly rather than silently testing a stale build.
assertDistFresh();

const { test, runSuite } = defineSuite("Model Manifests", {
  offline: true,
});

const {
  resolveManifestEntry,
  resolveManifestEntryExact,
  getManifestForProvider,
  getAllManifestProviders,
} = await import("../dist/models/manifestRegistry.js");

// The five consumers the model-metadata consolidation plan promises will
// all agree with the manifest. Only calculateCost/hasPricing are on
// dist/index.js's public surface (see the file header) — the rest are
// pulled from their own compiled modules, same as MANIFEST_REGISTRY above.
const { getContextWindowSize } =
  await import("../dist/constants/contextWindows.js");
const { calculateCost } = await import("../dist/index.js");
const {
  MODEL_REGISTRY,
  MODEL_ALIASES,
  modelSupportsForcedToolChoice,
  claudeDisabledThinkingReplacement,
} = await import("../dist/models/modelRegistry.js");
const { ProviderImageAdapter } =
  await import("../dist/adapters/providerImageAdapter.js");
const { PROVIDER_MAX_TOKENS } = await import("../dist/core/constants.js");

type ManifestSample = {
  provider: string;
  id: string;
  entry: ProviderModelManifestEntry;
};

/**
 * Every manifest model that carries verified pricing (`pricingPerMTok`) —
 * the same filter `buildManifestDerivedEntries()` (modelRegistry.ts) uses to
 * decide which manifest entries win a MODEL_REGISTRY row. Un-priced entries
 * are deliberately excluded: MODEL_REGISTRY doesn't carry them at all, so
 * there is nothing there to agree or disagree with, and calculateCost falls
 * through to legacy PRICING for them by design (see pricing.ts's findRates).
 *
 * Resolved via resolveManifestEntryExact rather than the raw
 * `manifest.models[id]` value, because that's what every real consumer
 * (getContextWindowSize, pricing.ts, providerImageAdapter.ts) actually reads
 * — family rules apply on top of the raw entry, so comparing against the
 * unresolved entry could pass or fail on a rule that never touches these
 * canonical ids today but is free to start doing so later.
 */
function collectPricedManifestSample(): ManifestSample[] {
  const sample: ManifestSample[] = [];
  for (const provider of getAllManifestProviders()) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    for (const id of Object.keys(manifest.models)) {
      if (id === "_default") {
        continue;
      }
      const resolved = resolveManifestEntryExact(provider, id);
      if (resolved?.pricingPerMTok) {
        sample.push({ provider, id, entry: resolved });
      }
    }
  }
  return sample;
}

await test("Alias resolves to its canonical entry, not the default", async () => {
  // ollama's "llama3.2:latest" entry declares "llama3.2" as a bare-name
  // alias. Before the resolver consulted aliases, this bare name missed
  // both the exact-match and prefix-match checks (the request string is
  // shorter than the tagged key it would need to be a prefix of) and fell
  // through to the synthesized `_default` entry, silently discarding the
  // model-specific contextWindow/vision/functionCalling data.
  const viaAlias = resolveManifestEntry("ollama", "llama3.2");
  const canonical = resolveManifestEntry("ollama", "llama3.2:latest");
  assertNotNull(viaAlias, "alias lookup returned nothing");
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
  assertNotNull(viaAlias, "exact-path alias lookup returned nothing");
  assert(
    viaAlias.contextWindow === 1_000_000,
    "exact-path alias resolution did not reach the canonical entry",
  );
});

await test("The generic Sonnet aliases point at Claude Sonnet 5.5", async () => {
  const viaManifest = resolveManifestEntryExact("anthropic", "claude-sonnet");
  assertNotNull(viaManifest, "claude-sonnet manifest alias returned nothing");
  assert(
    viaManifest.displayName === "Claude Sonnet 5.5",
    "claude-sonnet manifest alias did not resolve to Sonnet 5.5",
  );
  assert(
    MODEL_ALIASES["claude-sonnet-latest"] === "claude-sonnet-5-5",
    "claude-sonnet-latest registry alias did not resolve to Sonnet 5.5",
  );
  assert(
    MODEL_ALIASES["sonnet-5"] === "claude-sonnet-5",
    "sonnet-5 registry alias no longer resolves to Sonnet 5",
  );
});

await test("Claude 5.5 / 5.1 ids refuse forced tool choice; their predecessors accept it", async () => {
  // Probed live on Vertex 2026-09-29 (Sonnet 5.5, Opus 5.5) and stated in the
  // Fable 5.1 docs. Gateway-shaped ids must match too.
  const refusing = [
    "claude-sonnet-5-5",
    "vertex_ai/claude-sonnet-5-5@20260928",
    "anthropic.claude-sonnet-5-5",
    "sonnet-5.5",
    "claude-sonnet-latest",
    "claude-opus-5-5",
    "claude-fable-5-1",
    "claude-mythos-5-1",
  ];
  const accepting = [
    "claude-sonnet-5",
    "claude-opus-5",
    "claude-fable-5",
    "claude-sonnet-5-20260101",
    "claude-opus-4-5-20251101",
    "claude-sonnet-4-5",
  ];
  refusing.forEach((id, index) =>
    assert(
      !modelSupportsForcedToolChoice(id),
      `refusing id #${index} was treated as accepting a forced choice`,
    ),
  );
  accepting.forEach((id, index) =>
    assert(
      modelSupportsForcedToolChoice(id),
      `accepting id #${index} was treated as refusing a forced choice`,
    ),
  );
});

await test("Disabled thinking maps to what each Claude model accepts", async () => {
  const cases: ReadonlyArray<
    readonly [string, string | undefined, "keep" | "between_tools" | "omit"]
  > = [
    ["claude-sonnet-5-5", undefined, "between_tools"],
    ["claude-sonnet-5-5", "high", "between_tools"],
    ["claude-sonnet-5-5", "xhigh", "omit"],
    ["claude-sonnet-5-5", "max", "omit"],
    ["claude-opus-5-5", "low", "omit"],
    ["claude-fable-5-1", undefined, "omit"],
    ["claude-sonnet-5", undefined, "keep"],
    ["claude-opus-5", "max", "keep"],
  ];
  cases.forEach(([model, effort, expected], index) =>
    assert(
      claudeDisabledThinkingReplacement(model, effort) === expected,
      `case #${index} did not map to ${expected}`,
    ),
  );
});

await test("Exact and prefix resolution still take precedence over alias/default", async () => {
  const exact = resolveManifestEntryExact("anthropic", "claude-sonnet-5");
  assertNotNull(exact, "exact id lookup returned nothing");
  assert(exact.contextWindow === 1_000_000, "exact id resolved wrong entry");

  // A gateway-shaped id ("<canonical-key><suffix>") not itself a key or
  // alias should still resolve via longest-prefix match.
  const prefixed = resolveManifestEntryExact(
    "anthropic",
    "claude-sonnet-5-some-gateway-suffix",
  );
  assertNotNull(prefixed, "prefix lookup returned nothing");
  assert(
    prefixed.contextWindow === 1_000_000,
    "prefix lookup resolved the wrong entry",
  );
});

await test("Unknown model falls back to an honest provider default", async () => {
  const fallback = resolveManifestEntry("bedrock", "totally-unknown-model-id");
  assertNotNull(fallback, "default fallback returned nothing");
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

await test("getContextWindowSize agrees with the manifest for every priced model", async () => {
  const sample = collectPricedManifestSample();
  assert(sample.length > 0, "no priced manifest models found to sample");

  const failures: string[] = [];
  for (const { provider, id, entry } of sample) {
    const windowSize = getContextWindowSize(provider, id);
    if (windowSize !== entry.contextWindow) {
      failures.push(
        `${provider}/${id}: getContextWindowSize returned ${windowSize}, manifest says ${entry.contextWindow}`,
      );
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} model(s) where getContextWindowSize disagrees with the manifest: ${failures.join("; ")}`,
  );
});

await test("public session context stats use the 1M window for Claude 5 and Opus 4.7/4.8 on Anthropic and Vertex", async () => {
  const { NeuroLink } = await import("../dist/index.js");
  const sdk = new NeuroLink({ conversationMemory: { enabled: true } });
  try {
    await sdk.setSessionMessages("claude-window", [
      {
        id: "claude-window-1",
        role: "user",
        content: "Remember this message.",
      },
      { id: "claude-window-2", role: "assistant", content: "Remembered." },
    ]);
    // A 1M window keeps the default output reserve at its 64K cap (35% of the
    // window would be larger), so the usable input budget is the difference.
    // The literal encodes that reserve policy, not just the window size.
    const expectedInputBudget = 1_000_000 - 64_000;
    const wrong: string[] = [];
    // claude-sonnet-5 already had a row: it is the control and must stay right.
    for (const model of [
      "claude-sonnet-5",
      "claude-opus-5",
      "claude-fable-5",
      "claude-opus-4-8",
      "claude-opus-4-7",
    ]) {
      for (const provider of ["anthropic", "vertex"]) {
        const stats = await sdk.getContextStats(
          "claude-window",
          provider,
          model,
        );
        assertNotNull(
          stats,
          "the seeded session returned no context statistics",
        );
        assert(
          stats.messageCount === 2,
          "context statistics did not read the seeded session",
        );
        if (stats.availableInputTokens !== expectedInputBudget) {
          wrong.push(`${provider}/${model}`);
        }
      }
    }
    assert(
      wrong.length === 0,
      `session input budget was not the 1M window's for: ${wrong.join(", ")}`,
    );
  } finally {
    await sdk.shutdown();
  }
});

await test("PROVIDER_MAX_TOKENS agrees with the manifest's maxOutputTokens for every priced model", async () => {
  const sample = collectPricedManifestSample();
  const failures: string[] = [];
  for (const { provider, id, entry } of sample) {
    const providerLimits =
      PROVIDER_MAX_TOKENS[provider as keyof typeof PROVIDER_MAX_TOKENS];
    if (typeof providerLimits !== "object" || providerLimits === null) {
      // Provider has no per-model table in PROVIDER_MAX_TOKENS at all —
      // nothing to compare. None of today's priced providers hit this
      // (anthropic/openai/azure/bedrock/mistral/google-ai all do), but a
      // future manifest could price a model under a provider
      // maxTokensOverridesFrom() doesn't cover yet.
      continue;
    }
    const perModel = (providerLimits as Record<string, number>)[id];
    if (perModel === undefined) {
      failures.push(`${provider}/${id}: no PROVIDER_MAX_TOKENS override`);
      continue;
    }
    if (perModel !== entry.maxOutputTokens) {
      failures.push(
        `${provider}/${id}: PROVIDER_MAX_TOKENS says ${perModel}, manifest says ${entry.maxOutputTokens}`,
      );
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} model(s) where PROVIDER_MAX_TOKENS disagrees with the manifest: ${failures.join("; ")}`,
  );
});

await test("Pricing lookup (calculateCost) agrees with the manifest's pricingPerMTok for every priced model", async () => {
  const sample = collectPricedManifestSample();
  const failures: string[] = [];
  for (const { provider, id, entry } of sample) {
    const pricing = entry.pricingPerMTok;
    if (!pricing) {
      continue; // collectPricedManifestSample already filters to priced entries; narrows the type only.
    }
    // 1,000,000 input (or output) tokens against $/MTok rates reduces to
    // "cost equals the manifest's own rate" — no unit conversion to get wrong.
    const inputCost = calculateCost(provider, id, {
      input: 1_000_000,
      output: 0,
      total: 1_000_000,
    });
    const outputCost = calculateCost(provider, id, {
      input: 0,
      output: 1_000_000,
      total: 1_000_000,
    });
    if (Math.abs(inputCost - pricing.input) > 1e-6) {
      failures.push(
        `${provider}/${id}: calculateCost input rate ${inputCost} disagrees with manifest ${pricing.input}`,
      );
    }
    if (Math.abs(outputCost - pricing.output) > 1e-6) {
      failures.push(
        `${provider}/${id}: calculateCost output rate ${outputCost} disagrees with manifest ${pricing.output}`,
      );
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} model(s) where pricing lookup disagrees with the manifest: ${failures.join("; ")}`,
  );
});

await test("MODEL_REGISTRY agrees with the manifest entry for every priced model", async () => {
  const sample = collectPricedManifestSample();
  const failures: string[] = [];
  for (const { provider, id, entry } of sample) {
    const modelInfo = MODEL_REGISTRY[id];
    if (!modelInfo) {
      failures.push(`${provider}/${id}: missing from MODEL_REGISTRY`);
      continue;
    }
    if (modelInfo.provider !== provider) {
      failures.push(
        `${provider}/${id}: MODEL_REGISTRY entry belongs to provider ${modelInfo.provider} instead`,
      );
    }
    if (modelInfo.limits.maxContextTokens !== entry.contextWindow) {
      failures.push(
        `${provider}/${id}: MODEL_REGISTRY maxContextTokens ${modelInfo.limits.maxContextTokens} disagrees with manifest ${entry.contextWindow}`,
      );
    }
    if (modelInfo.limits.maxOutputTokens !== entry.maxOutputTokens) {
      failures.push(
        `${provider}/${id}: MODEL_REGISTRY maxOutputTokens ${modelInfo.limits.maxOutputTokens} disagrees with manifest ${entry.maxOutputTokens}`,
      );
    }
    if (modelInfo.capabilities.vision !== entry.vision) {
      failures.push(
        `${provider}/${id}: MODEL_REGISTRY vision ${modelInfo.capabilities.vision} disagrees with manifest ${entry.vision}`,
      );
    }
    if (modelInfo.capabilities.functionCalling !== entry.functionCalling) {
      failures.push(
        `${provider}/${id}: MODEL_REGISTRY functionCalling ${modelInfo.capabilities.functionCalling} disagrees with manifest ${entry.functionCalling}`,
      );
    }
    const pricing = entry.pricingPerMTok;
    if (pricing) {
      const registryInputPerMTok = modelInfo.pricing.inputCostPer1K * 1000;
      const registryOutputPerMTok = modelInfo.pricing.outputCostPer1K * 1000;
      if (Math.abs(registryInputPerMTok - pricing.input) > 1e-6) {
        failures.push(
          `${provider}/${id}: MODEL_REGISTRY input pricing ${registryInputPerMTok} disagrees with manifest ${pricing.input}`,
        );
      }
      if (Math.abs(registryOutputPerMTok - pricing.output) > 1e-6) {
        failures.push(
          `${provider}/${id}: MODEL_REGISTRY output pricing ${registryOutputPerMTok} disagrees with manifest ${pricing.output}`,
        );
      }
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} model(s) where MODEL_REGISTRY disagrees with the manifest: ${failures.join("; ")}`,
  );
});

await test("ProviderImageAdapter.supportsVision agrees with the manifest's vision flag for every priced model", async () => {
  const sample = collectPricedManifestSample();
  const failures: string[] = [];
  for (const { provider, id, entry } of sample) {
    // supportsVision always returns true for a manifest-covered model
    // under a proxy provider (litellm/openrouter) — the proxy's upstream,
    // not the manifest, decides real vision support there. None of
    // today's priced manifest entries live under a proxy provider; guard
    // it explicitly so this stays true if that changes.
    if (provider === "litellm" || provider === "openrouter") {
      continue;
    }
    // Same escape hatch for Anthropic routed through a local proxy
    // (ANTHROPIC_BASE_URL) — supportsVision defers to the upstream there
    // too, by design (see providerImageAdapter.ts). A dev .env with this
    // set (common when a local Claude Code proxy is running) would
    // otherwise report a false disagreement that has nothing to do with
    // manifest consistency.
    if (provider === "anthropic" && process.env.ANTHROPIC_BASE_URL) {
      continue;
    }
    const supports = ProviderImageAdapter.supportsVision(provider, id);
    if (supports !== entry.vision) {
      failures.push(
        `${provider}/${id}: supportsVision returned ${supports}, manifest says ${entry.vision}`,
      );
    }
  }
  assert(
    failures.length === 0,
    `${failures.length} model(s) where supportsVision disagrees with the manifest: ${failures.join("; ")}`,
  );
});

await test("manifest lookups never shadow more-specific legacy rows or bless fabricated ids", async () => {
  // Review regressions, both runtime-confirmed before the strict resolver:
  // (1) a manifest "gpt-4" PREFIX hit stole precedence from the legacy
  // table's explicit gpt-4-vision-preview vision row; (2) a fabricated id
  // borrowed a real family's capabilities via the same prefix fallback.
  assert(
    ProviderImageAdapter.supportsVision("openai", "gpt-4-vision-preview") ===
      true,
    "legacy vision row was shadowed by a manifest prefix match",
  );
  assert(
    ProviderImageAdapter.supportsVision("azure", "gpt-5-turbo") === false,
    "a fabricated model id borrowed vision from a manifest family prefix",
  );
});

await test("a manifest-priced entry carries the legacy registry's deprecation flag", async () => {
  // gpt-4 is priced in the openai manifest AND explicitly deprecated in the
  // hand-authored registry; the manifest-derived row must not un-deprecate
  // it (whole-entry replacement used to hardcode deprecated: false).
  const entry = MODEL_REGISTRY["gpt-4"];
  assertNotNull(entry, "gpt-4 missing from MODEL_REGISTRY");
  assert(
    entry?.deprecated === true,
    "manifest-derived gpt-4 row dropped the legacy deprecated flag",
  );
});

await runSuite();
