#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Provider Descriptors (Plan 04).
 *
 * ALL-DIST module graph (rule 15): every provider-facing import below
 * resolves to `../dist/...` (rework batch I converted the handful that
 * still read `../src/lib/utils/providerUtils.js`,
 * `../src/lib/utils/providerHealth.js`, `../src/cli/factories/
 * commandFactory.js`, and `../src/cli/commands/setup.js` — all four have
 * dist equivalents already exercised elsewhere in this repo's suites, so
 * there was no reachability barrier, just a stale import path).
 *
 * ONE NARROW, DISCLOSED EXCEPTION: the two tests under "environmentManager
 * derives its provider checklist from descriptors" import `EnvironmentManager`
 * from `../tools/automation/environmentManager.js`. That file lives under
 * `tools/`, not `src/`, and is never compiled into `dist/` by any `build*`
 * script (confirmed: `dist/` has no `environmentManager` output) — it's a
 * standalone dev-tooling script behind `env:validate`/`env:setup`, not part
 * of the packaged `@juspay/neurolink` surface at all. There is no dist
 * artifact for it to import instead, so this isn't a determinism workaround
 * in the rule-15 sense (nothing here is nondeterministic) — it's a genuine
 * absence of a shipped equivalent for those 2 tests only. Every other test
 * in this file drives the real dist module graph.
 *
 * Run: npx tsx test/continuous-test-suite-provider-descriptors.ts
 *      pnpm run test:provider-descriptors
 */
import { createServer, type Server } from "node:http";
import {
  defineSuite,
  logSection,
  assert,
  assertEqual,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Provider Descriptors");

await runSuite(async () => {
  logSection("ProviderFactory.getDescriptor / getAllDescriptors");

  await test("getAllDescriptors returns every real provider", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const { CATALOG_PROVIDER_IDS } =
      await import("../dist/providers/catalog/index.generated.js");
    // Total = the JSON-catalog providers + this literal count of
    // hand-registered non-catalog providers (openai, anthropic, google-ai,
    // vertex, bedrock, sagemaker, azure, ollama, openrouter, litellm,
    // openai-compatible, nvidia-nim, lm-studio, llamacpp, cohere, replicate,
    // voyage, jina, stability, ideogram, recraft, typesafe, laya).
    // Mirrors continuous-test-suite-provider-wiring.ts's
    // NON_CATALOG_PROVIDER_COUNT.
    const NON_CATALOG_PROVIDER_COUNT = 23;
    const expectedCount =
      CATALOG_PROVIDER_IDS.length + NON_CATALOG_PROVIDER_COUNT;
    const all = ProviderFactory.getAllDescriptors();
    assertEqual(all.length, expectedCount, "getAllDescriptors length");
  });

  await test("getDescriptor resolves a canonical name", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const d = ProviderFactory.getDescriptor("openai");
    assert(d !== undefined, "openai descriptor missing");
    assertEqual(d?.credentialsKey, "openai", "openai credentialsKey");
  });

  await test("getDescriptor returns undefined for an unknown name", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const d = ProviderFactory.getDescriptor("not-a-real-provider");
    assert(d === undefined, "unknown provider should have no descriptor");
  });

  logSection("normalizeProviderName alias resolution");

  await test("normalizeProviderName preserves pre-rewrite alias behavior", async () => {
    const { ProviderFactory, ProviderRegistry } =
      await import("../dist/index.js");
    // "or" is OpenRouter's alias — normalizeProviderName only works AFTER
    // registerAllProviders() has populated the live Map. Note this is
    // ProviderRegistry.registerAllProviders(), NOT ProviderFactory's own
    // ensureInitialized() — that private method only flips an `initialized`
    // flag and calls a no-op initializeDefaultProviders(); actual
    // registration happens exclusively via ProviderRegistry (kept separate
    // to avoid a circular import from providerFactory.ts into the 24
    // provider modules). This test forces real registration first so both
    // the old and new implementation are compared on equal footing.
    //
    // registerProvider() stores every alias as its own direct key in the
    // live Map (providerRegistry.ts registers OpenRouter with aliases
    // ["openrouter", "or"], and both become map keys pointing at the same
    // registration). normalizeProviderName's first branch matches on direct
    // registration before ever consulting PROVIDER_ALIAS_INDEX, so a
    // directly-registered alias like "or" resolves to itself, not to the
    // canonical "openrouter". That's the actual pre-rewrite behavior, and
    // the O(1) rewrite must reproduce it exactly — the PROVIDER_ALIAS_INDEX
    // branch only fires for names that were never registered as direct
    // keys (e.g. a descriptor alias omitted from a live registerProvider()
    // call, or a provider registered without going through registerProvider
    // at all).
    await ProviderRegistry.registerAllProviders();
    const resolved = ProviderFactory.normalizeProviderName("or");
    assertEqual(resolved, "or", "alias 'or' should resolve to itself");
  });

  await test("normalizeProviderName returns null for a truly unknown name", async () => {
    const { ProviderFactory, ProviderRegistry } =
      await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    const resolved = ProviderFactory.normalizeProviderName(
      "definitely-not-a-provider",
    );
    assert(resolved === null, "unknown provider should normalize to null");
  });

  logSection("Live registration carries its descriptor");

  await test("a registered provider's live descriptor matches PROVIDER_DESCRIPTORS", async () => {
    const {
      ProviderFactory,
      ProviderRegistry,
      PROVIDER_DESCRIPTORS_BY_NAME,
      AIProviderName,
    } = await import("../dist/index.js");
    // registerAllProviders(), not ensureInitialized() — see the note in
    // Task 4's normalizeProviderName test for why.
    await ProviderRegistry.registerAllProviders();
    // getProviderInfo() takes a provider name and returns that one
    // registration (or undefined) — it is not a bulk accessor.
    const info = ProviderFactory.getProviderInfo("openai");
    assert(info !== undefined, "expected openai to be registered");
    const staticDescriptor = PROVIDER_DESCRIPTORS_BY_NAME.get(
      AIProviderName.OPENAI,
    );
    const liveDescriptor = ProviderFactory.getDescriptor("openai");
    assertEqual(
      liveDescriptor?.credentialsKey,
      staticDescriptor?.credentialsKey,
      "live vs static descriptor credentialsKey",
    );
  });

  logSection(
    "Completeness: every AIProviderName (except AUTO) has exactly one descriptor",
  );

  await test("PROVIDER_DESCRIPTORS covers every real provider exactly once", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const { AIProviderName } = await import("../dist/index.js");
    const enumValues = Object.values(AIProviderName).filter(
      (v) => v !== AIProviderName.AUTO,
    );
    const names = PROVIDER_DESCRIPTORS.map((d: { name: string }) => d.name);
    assertEqual(
      names.length,
      enumValues.length,
      "descriptor count vs enum count",
    );
    assertEqual(
      new Set(names).size,
      names.length,
      "duplicate descriptor name detected",
    );
    for (const value of enumValues) {
      assert(names.includes(value), `missing descriptor for ${value}`);
    }
  });

  await test("every descriptor has a non-empty credentialsKey and toolSupport", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const d of PROVIDER_DESCRIPTORS) {
      assert(
        typeof d.credentialsKey === "string" && d.credentialsKey.length > 0,
        `${d.name} missing credentialsKey`,
      );
      assert(
        ["native", "prompt-only", "none", "model-dependent"].includes(
          d.toolSupport,
        ),
        `${d.name} has an invalid toolSupport value`,
      );
      assert(
        ["env-only", "models-probe", "live-generate"].includes(d.healthCheck),
        `${d.name} has an invalid healthCheck value`,
      );
    }
  });

  await test("no two descriptors share an alias or a name-as-alias collision", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const seen = new Map<string, string>();
    for (const d of PROVIDER_DESCRIPTORS) {
      for (const key of [d.name, ...d.aliases]) {
        const lower = key.toLowerCase();
        const owner = seen.get(lower);
        assert(
          owner === undefined || owner === d.name,
          `alias collision between ${owner} and ${d.name}`,
        );
        seen.set(lower, d.name);
      }
    }
  });

  await test("TOGETHER_AI resolves the correct credentialsKey (regression guard for the CREDENTIAL_KEY_MAP class of bug)", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const d = ProviderFactory.getDescriptor("together-ai");
    assertEqual(
      d?.credentialsKey,
      "together",
      "together-ai credentialsKey regression",
    );
  });

  logSection("Alias completeness: live registration vs descriptor");

  await test("every provider's live registered alias set matches its descriptor's alias set", async () => {
    const { ProviderFactory, ProviderRegistry, PROVIDER_DESCRIPTORS } =
      await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    // Comparison approach disclosure: getProviderInfo(name)?.aliases is a
    // live runtime accessor (ProviderRegistration.aliases), used directly
    // rather than falling back to parsing providerRegistry.ts source.
    //
    // registerProvider()'s aliases array sometimes redundantly repeats the
    // provider's own canonical name (registerProvider() already registers
    // `name` as its own primary map key, so this is a harmless duplicate
    // key assignment) — e.g. providerRegistry.ts registers ANTHROPIC with
    // aliases ["claude", "anthropic"]. ProviderDescriptor.aliases
    // intentionally excludes the name per its documented contract ("Does
    // not include `name` itself"). Comparing raw arrays would fail ~24 of
    // 30 providers on this harmless convention alone. Instead compare the
    // EFFECTIVE set of names that resolve to each provider — name plus
    // aliases, lowercased, from both sides — which targets genuine future
    // drift (an alias added to one side and not the other) without
    // tripping on the name-as-alias convention.
    for (const d of PROVIDER_DESCRIPTORS) {
      const info = ProviderFactory.getProviderInfo(d.name);
      assert(info !== undefined, `expected ${d.name} to be registered`);
      const liveSet = new Set(
        [d.name, ...(info?.aliases ?? [])].map((s) => s.toLowerCase()),
      );
      const descriptorSet = new Set(
        [d.name, ...d.aliases].map((s) => s.toLowerCase()),
      );
      assertEqual(
        liveSet.size,
        descriptorSet.size,
        `${d.name} alias set size mismatch between live registration and descriptor`,
      );
      let allDescriptorAliasesLive = true;
      for (const key of descriptorSet) {
        if (!liveSet.has(key)) {
          allDescriptorAliasesLive = false;
        }
      }
      assert(
        allDescriptorAliasesLive,
        `${d.name} live registration alias set does not match descriptor alias set`,
      );
    }
  });

  logSection("CLI provider choices derived from descriptors");

  await test("commonOptions.provider.choices includes every descriptor name and alias plus the CLI-only pseudo-provider", async () => {
    const { commonOptions } =
      await import("../dist/cli/factories/commandFactory.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const choices: string[] = commonOptions.provider.choices;
    assert(choices.includes("auto"), "choices missing 'auto'");
    assert(
      choices.includes("anthropic-subscription"),
      "choices missing 'anthropic-subscription'",
    );
    for (const d of PROVIDER_DESCRIPTORS) {
      assert(
        choices.includes(d.name),
        `choices missing provider name ${d.name}`,
      );
      for (const alias of d.aliases) {
        assert(
          choices.includes(alias),
          `choices missing alias ${alias} for ${d.name}`,
        );
      }
    }
  });

  await test("bash completion string matches provider.choices exactly (regression for missing nvidia/lms)", async () => {
    const { commonOptions, BASH_COMPLETION_PROVIDERS } =
      await import("../dist/cli/factories/commandFactory.js");
    const choiceSet = new Set<string>(commonOptions.provider.choices);
    const completionSet = new Set<string>(BASH_COMPLETION_PROVIDERS.split(" "));
    for (const c of choiceSet) {
      assert(completionSet.has(c), `bash completion missing "${c}"`);
    }
  });

  logSection(
    "apiKeyFormatPattern coverage (8 hand-typed descriptors + catalog entries that declare setup.apiKeyFormat)",
  );

  await test("apiKeyFormatPattern: every field present on a descriptor is a real RegExp instance", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const d of PROVIDER_DESCRIPTORS) {
      if (d.apiKeyFormatPattern !== undefined) {
        assert(
          d.apiKeyFormatPattern instanceof RegExp,
          `${d.name} apiKeyFormatPattern is not a RegExp instance`,
        );
      }
    }
  });

  await test("apiKeyFormatPattern: descriptors without the field simply omit it, never an empty/no-op pattern", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const { CATALOG_PROVIDER_IDS, CATALOG_JSON_ENTRIES } =
      await import("../dist/providers/catalog/index.generated.js");
    // These 6 hand-typed descriptors legitimately set apiKeyFormatPattern
    // (providerDescriptors.ts's HAND_DESCRIPTORS).
    const withPattern = new Set([
      "bedrock",
      "openai",
      "anthropic",
      "azure",
      "google-ai",
      "sagemaker",
    ]);
    // Catalog entries that set a non-null setup.apiKeyFormat contribute a
    // real apiKeyFormatPattern via buildCatalogDescriptor(). Derived from the
    // JSON rather than hand-listed so a new catalog entry that declares a
    // key format joins this set without editing the suite.
    const catalogWithPattern = new Set(
      CATALOG_JSON_ENTRIES.filter((e) => e.setup.apiKeyFormat !== null).map(
        (e) => e.id,
      ),
    );
    let checkedAbsent = 0;
    for (const d of PROVIDER_DESCRIPTORS) {
      if (catalogWithPattern.has(d.name)) {
        assert(
          d.apiKeyFormatPattern instanceof RegExp,
          `${d.name} declares setup.apiKeyFormat but its descriptor lacks a RegExp apiKeyFormatPattern`,
        );
        continue;
      }
      if (!withPattern.has(d.name)) {
        assert(
          d.apiKeyFormatPattern === undefined,
          `${d.name} unexpectedly carries an apiKeyFormatPattern field`,
        );
        checkedAbsent += 1;
      }
    }
    // Mirrors continuous-test-suite-provider-wiring.ts's
    // NON_CATALOG_PROVIDER_COUNT.
    const NON_CATALOG_PROVIDER_COUNT = 23;
    const totalCount = CATALOG_PROVIDER_IDS.length + NON_CATALOG_PROVIDER_COUNT;
    const catalogWithPatternCount = catalogWithPattern.size;
    const expectedAbsentCount =
      totalCount - withPattern.size - catalogWithPatternCount;
    assertEqual(
      checkedAbsent,
      expectedAbsentCount,
      "apiKeyFormatPattern absence count mismatch — descriptor roster may have changed",
    );
  });

  // Realistic sample construction, never a real credential. Base units are
  // built from mixed letters+digits (or uppercase-only for the AWS-shaped
  // patterns, which are case-sensitive) and combined with .repeat()/.slice()
  // so exact lengths are computed by the runtime rather than hand-counted —
  // avoiding an off-by-one that would silently invalidate a positive case.
  // Reject samples are derived from a REAL competing credential shape
  // (a different provider's own prefix/format) wherever a realistic mix-up
  // exists, rather than an arbitrary string that trivially fails.
  const alnum = "A1b2C3d4E5f6"; // 12 chars, no hyphen/underscore
  const mixedWithSeparators = "A1b2C3d4E5f6-Xy9Z_"; // 18 chars, incl. -/_
  const awsUnit = "AKIA1B2C3D4"; // 11 chars, uppercase+digits only

  const awsAccept = awsUnit.repeat(2).slice(0, 20);
  const azureAccept = alnum.repeat(3).slice(0, 32);
  const mistralAccept = "Q7wE9rT2yU4i".repeat(3).slice(0, 32);
  const hfAccept = `hf_${alnum.repeat(4).slice(0, 37)}`;
  const googleAiAccept = `AIza${mixedWithSeparators.repeat(2).slice(0, 35)}`;
  const openaiAccept = `sk-${alnum.repeat(4)}`; // 48-char body, meets {48,}
  // 108-char body (18 * 6), comfortably over the {95,} minimum.
  const anthropicAccept = `sk-ant-${mixedWithSeparators.repeat(6)}`;

  type PatternCase = {
    provider: string;
    accept: string;
    rejectShape: string;
  };
  const patternCases: PatternCase[] = [
    {
      provider: "bedrock",
      accept: awsAccept,
      // Same 20-char shape, lowercased — the regex is uppercase-only, and a
      // lowercased paste is a realistic real-world mistake.
      rejectShape: awsAccept.toLowerCase(),
    },
    {
      provider: "sagemaker",
      // Same [A-Z0-9]{20} shape as bedrock, but this exercises SageMaker's
      // OWN apiKeyFormatPattern field (API_KEY_FORMATS.aws), a distinct
      // RegExp object from bedrock's (API_KEY_FORMATS.bedrock) even though
      // the source pattern text is identical.
      accept: awsAccept,
      rejectShape: awsAccept.toLowerCase(),
    },
    {
      provider: "openai",
      accept: openaiAccept,
      // Real-world mix-up: a "pk-" (publishable-key-style) prefix instead
      // of "sk-", same body shape/length otherwise.
      rejectShape: `pk-${alnum.repeat(4)}`,
    },
    {
      provider: "anthropic",
      accept: anthropicAccept,
      // Real-world mix-up: an OpenAI-shaped "sk-..." key missing the
      // "ant-" segment Anthropic requires.
      rejectShape: openaiAccept,
    },
    {
      provider: "azure",
      accept: azureAccept,
      // Same content, with a hyphen spliced in — Azure's key has no
      // separators, unlike a resource/GUID string it's easily confused
      // with. Also changes the length away from the required 32.
      rejectShape: `${azureAccept.slice(0, 16)}-${azureAccept.slice(16)}`,
    },
    {
      provider: "google-ai",
      accept: googleAiAccept,
      // Real-world mix-up: Google's own OAuth access-token prefix
      // ("ya29.") instead of the API-key prefix ("AIza").
      rejectShape: `ya29.${mixedWithSeparators.repeat(2).slice(0, 35)}`,
    },
    {
      provider: "huggingface",
      accept: hfAccept,
      // Real-world mix-up: a GitHub personal-access-token prefix ("ghp_")
      // instead of HuggingFace's ("hf_").
      rejectShape: `ghp_${alnum.repeat(4).slice(0, 36)}`,
    },
    {
      provider: "mistral",
      accept: mistralAccept,
      rejectShape: `${mistralAccept.slice(0, 16)}-${mistralAccept.slice(16)}`,
    },
  ];

  await test("apiKeyFormatPattern: accepts a realistic well-formed sample per provider", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const { provider, accept } of patternCases) {
      const pattern = PROVIDER_DESCRIPTORS.find(
        (d) => d.name === provider,
      )?.apiKeyFormatPattern;
      assert(
        pattern !== undefined,
        `${provider} descriptor is missing its apiKeyFormatPattern field`,
      );
      assert(
        pattern!.test(accept),
        `${provider} apiKeyFormatPattern rejected a realistic well-formed sample`,
      );
    }
  });

  await test("apiKeyFormatPattern: rejects an empty string per provider", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const { provider } of patternCases) {
      const pattern = PROVIDER_DESCRIPTORS.find(
        (d) => d.name === provider,
      )?.apiKeyFormatPattern;
      assert(
        pattern !== undefined && !pattern.test(""),
        `${provider} apiKeyFormatPattern accepted an empty string`,
      );
    }
  });

  await test("apiKeyFormatPattern: rejects a wrong-prefix/wrong-shape sample per provider", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const { provider, rejectShape } of patternCases) {
      const pattern = PROVIDER_DESCRIPTORS.find(
        (d) => d.name === provider,
      )?.apiKeyFormatPattern;
      assert(
        pattern !== undefined && !pattern.test(rejectShape),
        `${provider} apiKeyFormatPattern accepted a wrong-shape sample`,
      );
    }
  });

  await test("apiKeyFormatPattern: completes well under a second against a 10k-char pathological input (ReDoS guard)", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    // Pathological-ish input: 10k chars that are almost-but-not-quite a
    // match for several of these patterns at once (mixed prefix text
    // followed by a long alnum run), to stress any backtracking, not just
    // an unrelated random string.
    const pathological = `sk-ant-AIzahf_${"A1b2C3d4E5f6".repeat(833)}`; // ~10k chars
    assert(
      pathological.length > 9_900,
      "pathological ReDoS-guard fixture is shorter than intended",
    );
    for (const { provider } of patternCases) {
      const pattern = PROVIDER_DESCRIPTORS.find(
        (d) => d.name === provider,
      )?.apiKeyFormatPattern;
      assert(pattern !== undefined, `${provider} descriptor pattern missing`);
      const start = performance.now();
      pattern!.test(pathological);
      const elapsedMs = performance.now() - start;
      assert(
        elapsedMs < 500,
        `${provider} apiKeyFormatPattern took too long against a pathological input (${elapsedMs.toFixed(1)}ms)`,
      );
    }
  });

  logSection("providerUtils env-var checks cover all 30 providers");

  await test("hasProviderEnvVars recognizes a provider outside the old 10-case switch (regression)", async () => {
    const saved = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "test-key-for-suite-only";
    try {
      const { hasProviderEnvVars } =
        await import("../dist/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("groq") === true,
        "groq should be recognized as configured once its env var is set",
      );
    } finally {
      if (saved === undefined) {
        delete process.env.GROQ_API_KEY;
      } else {
        process.env.GROQ_API_KEY = saved;
      }
    }
  });

  await test("hasProviderEnvVars recognizes vertex via the service-account fallback path (regression)", async () => {
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "test-value-for-suite-only";
      delete process.env.GOOGLE_AUTH_CLIENT_EMAIL;
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;
      const { hasProviderEnvVars } =
        await import("../dist/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("vertex") === true,
        "vertex should be recognized via the service-account fallback path",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("getAvailableProviders lists every descriptor name", async () => {
    const { getAvailableProviders } =
      await import("../dist/utils/providerUtils.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const available = getAvailableProviders();
    for (const d of PROVIDER_DESCRIPTORS) {
      assert(
        available.includes(d.name),
        `getAvailableProviders missing ${d.name}`,
      );
    }
  });

  logSection("autoSelectPriority reconciliation");

  await test("descriptors with autoSelectPriority reproduce getBestProvider's historical 10-provider order", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const prioritized = PROVIDER_DESCRIPTORS.filter(
      (d) => d.autoSelectPriority !== undefined,
    )
      .sort((a, b) => (a.autoSelectPriority ?? 0) - (b.autoSelectPriority ?? 0))
      .map((d) => d.name);
    assert(
      JSON.stringify(prioritized) ===
        JSON.stringify([
          "litellm",
          "ollama",
          "vertex",
          "google-ai",
          "openai",
          "anthropic",
          "bedrock",
          "azure",
          "mistral",
          "huggingface",
        ]),
      "autoSelectPriority order mismatch",
    );
  });

  await test("getBestProvider falls through the derived priority order without throwing", async () => {
    const { getBestProvider } = await import("../dist/utils/providerUtils.js");
    // Not asserting a specific winner (depends on the local environment's
    // configured API keys) — only that the derived array drives the function
    // without a runtime error, proving the refactor didn't break iteration.
    const result = await getBestProvider().catch((e: unknown) => e);
    assert(
      typeof result === "string" || result instanceof Error,
      "getBestProvider should resolve to a provider name or reject with an Error, never hang or return a non-string/non-Error",
    );
  });

  logSection("providerHealth per-provider switches derived from descriptors");

  await test("getApiKeyEnvironmentVariable resolves a provider outside the old 8-case switch", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    assertEqual(
      ProviderHealthChecker.getApiKeyEnvironmentVariable("groq"),
      "GROQ_API_KEY",
      // Deliberately doesn't say "api key" — that phrase trips envGuard's
      // AUTH_FRAMINGS pattern and would downgrade a real failure to SKIP.
      "groq env var resolution mismatch",
    );
  });

  await test("huggingface format check accepts a token shaped like a real one", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    // A real token issued in 2026 is hf_ plus 34 letters; the catalog's
    // earlier hf_ plus 37 pattern flagged every such token as malformed.
    assert(
      ProviderHealthChecker.validateApiKeyFormat(
        "huggingface",
        `hf_${"Ab".repeat(17)}`,
      ),
      "huggingface rejected an hf_ + 34 character token",
    );
    assert(
      !ProviderHealthChecker.validateApiKeyFormat(
        "huggingface",
        "sk-not-a-huggingface-token",
      ),
      "huggingface accepted a token without the hf_ prefix",
    );
  });

  await test("getProviderHealthEndpoint still returns null for env-only providers and non-null for models-probe providers", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    assert(
      ProviderHealthChecker.getProviderHealthEndpoint("anthropic") === null,
      "anthropic should have no probe endpoint",
    );
    assert(
      typeof ProviderHealthChecker.getProviderHealthEndpoint("openai") ===
        "string",
      "openai should have a probe endpoint",
    );
  });

  await test("getRequiredEnvironmentVariables includes extraRequired vars for azure", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const required =
      ProviderHealthChecker.getRequiredEnvironmentVariables("azure");
    assert(
      required.includes("AZURE_OPENAI_API_KEY"),
      "azure missing primary key requirement",
    );
    assert(
      required.includes("AZURE_OPENAI_ENDPOINT"),
      "azure missing endpoint requirement",
    );
  });

  await test("getRequiredEnvironmentVariables still delegates vertex/bedrock/litellm to their specific-config checks via credentialsResolvedExternally (regression)", async () => {
    // Was backed by a hand-maintained ENV_CHECK_DELEGATED_TO_SPECIFIC_CONFIG
    // Set; now derived from descriptor.credentialsResolvedExternally. Same
    // observable behavior — proven identical for all 30 providers + all
    // aliases by a before/after capture across the refactor.
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    for (const providerName of ["vertex", "bedrock", "litellm"] as const) {
      assert(
        ProviderHealthChecker.getRequiredEnvironmentVariables(providerName)
          .length === 0,
        `${providerName} required-vars delegation mismatch`,
      );
    }
  });

  await test("getRequiredEnvironmentVariables resolves aliases before consulting the credentialsResolvedExternally delegation field (regression)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    // "googleVertex" and "aws" are documented aliases for vertex/bedrock.
    // The delegation check must key off the resolved descriptor's
    // credentialsResolvedExternally field, not the raw alias string, or it
    // silently skips delegation for aliased input and reports a false
    // non-empty required-vars list.
    assertEqual(
      ProviderHealthChecker.getRequiredEnvironmentVariables("googleVertex")
        .length,
      ProviderHealthChecker.getRequiredEnvironmentVariables("vertex").length,
      "alias delegation mismatch",
    );
    assertEqual(
      ProviderHealthChecker.getRequiredEnvironmentVariables("aws").length,
      ProviderHealthChecker.getRequiredEnvironmentVariables("bedrock").length,
      "alias delegation mismatch",
    );
  });

  await test("checkApiKeyValidity's vertex branch (via NeuroLink.hasProviderEnvVars, the getProviderStatus path) recognizes the documented first-priority credential fallback alone (regression)", async () => {
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      // Pin the primary identity var plus the documented first-priority
      // fallback only — every other vertex auth var explicitly unset.
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK =
        "test-value-for-suite-only";
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_AUTH_CLIENT_EMAIL;
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;

      const { NeuroLink } = await import("../dist/index.js");
      const nl = new NeuroLink();
      const configured = await nl.hasProviderEnvVars("vertex");
      assert(configured === true, "vertex fallback-var recognition mismatch");
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  logSection("NeuroLink.getProviderStatus covers all real providers");

  await test("getProviderStatus reports on every descriptor-backed provider, not just the original 11", async () => {
    const { NeuroLink } = await import("../dist/index.js");
    const nl = new NeuroLink();
    const statuses = await nl.getProviderStatus({ quiet: true });
    const reportedNames = new Set(
      statuses.map((s: { provider: string }) => s.provider),
    );
    assert(
      reportedNames.has("groq"),
      "getProviderStatus missing 'groq' (outside the old hardcoded 11)",
    );
    assert(
      reportedNames.has("cohere"),
      "getProviderStatus missing 'cohere' (outside the old hardcoded 11)",
    );
  });

  logSection("toolSupport replaces PROMPT_ONLY_TOOL_PROVIDERS");

  await test("descriptor.toolSupport !== 'native' reproduces the original 9-member prompt-only set plus catalog entries that declare tools: false", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const { CATALOG_JSON_ENTRIES } =
      await import("../dist/providers/catalog/index.generated.js");
    const originalPromptOnly = new Set([
      "ollama",
      "huggingface",
      "openrouter",
      "ideogram",
      "recraft",
      "replicate",
      "stability",
      "jina",
      "voyage",
      // typesafe serves only the `decide` inference type, so it has no tools
      // at all — the same reason voyage/jina (embedding-only) are here.
      "typesafe",
      // laya is the second decide-only provider: no tools for the same reason.
      "laya",
    ]);
    // A catalog entry with capabilities.tools: false derives toolSupport
    // "none" (buildCatalogDescriptor), which the runtime treats exactly like
    // the original prompt-only set. Derived from the JSON so the next such
    // vendor joins without editing the suite (mancer is the first).
    for (const entry of CATALOG_JSON_ENTRIES) {
      if (!entry.capabilities.tools) {
        originalPromptOnly.add(entry.id);
      }
    }
    for (const d of ProviderFactory.getAllDescriptors()) {
      const derived = d.toolSupport !== "native";
      assertEqual(
        derived,
        originalPromptOnly.has(d.name),
        `toolSupport-derived prompt-only mismatch for ${d.name}`,
      );
    }
  });

  logSection(
    "environmentManager derives its provider checklist from descriptors",
  );

  // These 2 tests import from ../tools/, not ../dist/ — see the file-header
  // exception note: tools/automation/environmentManager.ts has no dist
  // build output and isn't part of the shipped package surface.
  await test("validateEnvironment's providers object has one key per descriptor, not just 9", async () => {
    const { EnvironmentManager } =
      await import("../tools/automation/environmentManager.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const manager = new EnvironmentManager();
    const validation = await manager.validateEnvironment();
    const keys = Object.keys(validation.providers);
    assertEqual(
      keys.length,
      (PROVIDER_DESCRIPTORS as unknown[]).length,
      "environmentManager provider key count",
    );
  });

  await test("calculateScore denominator matches the actual provider count, not a hardcoded 9", async () => {
    const { EnvironmentManager } =
      await import("../tools/automation/environmentManager.js");
    const manager = new EnvironmentManager();
    const validation = await manager.validateEnvironment();
    const score = manager.calculateScore(validation);
    assert(score >= 0 && score <= 100, "score out of 0-100 range");
  });

  logSection("setup.ts checkExistingConfigurations derived from descriptors");

  await test("checkExistingConfigurations: primary key alone is enough for a provider with no extraRequired (mistral)", async () => {
    // Renamed from "...detects together via descriptor-driven logic
    // (characterization)" — that name was a leftover from an earlier
    // together-ai-flavored version of this test; it pins MISTRAL_API_KEY
    // and asserts "mistral", not "together". Kept mistral (no fallbacks, no
    // extraRequired) as the cleanest primary-key-only case.
    const savedMistral = process.env.MISTRAL_API_KEY;
    process.env.MISTRAL_API_KEY = "test-key-for-suite-only";
    try {
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        configured.includes("mistral"),
        "mistral should be detected when its primary credential env var is set",
      );
    } finally {
      if (savedMistral === undefined) {
        delete process.env.MISTRAL_API_KEY;
      } else {
        process.env.MISTRAL_API_KEY = savedMistral;
      }
    }
  });

  await test("checkExistingConfigurations: a fallback env var alone satisfies the primary-key check (anthropic OAuth token, no ANTHROPIC_API_KEY)", async () => {
    const controlledVars = [
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_OAUTH_TOKEN",
      "CLAUDE_OAUTH_TOKEN",
      "ANTHROPIC_OAUTH_ACCESS_TOKEN",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_OAUTH_TOKEN = "test-oauth-token-for-suite-only";
      delete process.env.CLAUDE_OAUTH_TOKEN;
      delete process.env.ANTHROPIC_OAUTH_ACCESS_TOKEN;
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        configured.includes("anthropic"),
        "anthropic should be detected from its OAuth fallback var alone",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("checkExistingConfigurations: extraRequired vars are ANDed with the primary key, not treated as optional (bedrock)", async () => {
    const controlledVars = [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");

      // Primary key alone, secret unset: extraRequired must block reporting.
      process.env.AWS_ACCESS_KEY_ID = "test-access-key-for-suite-only";
      delete process.env.AWS_SECRET_ACCESS_KEY;
      const withoutSecret = await checkExistingConfigurations();
      assert(
        !withoutSecret.includes("bedrock"),
        "bedrock should not be reported without its extraRequired secret var",
      );

      // Both present: now it should report.
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key-for-suite-only";
      const withSecret = await checkExistingConfigurations();
      assert(
        withSecret.includes("bedrock"),
        "bedrock should be reported once both its primary and extraRequired vars are set",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("checkExistingConfigurations: vertex's nested extraRequiredFallbacks pair requires BOTH halves, not one (email+key, via the real setup.ts function)", async () => {
    // Distinct from the hasProviderEnvVars pair tests further below — this
    // drives the actual setup.ts checkExistingConfigurations() function
    // (its own satisfiesFallbacks call site), not providerUtils.
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");

      // Primary satisfied, extraRequired unset, only ONE half of the pair.
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      process.env.GOOGLE_AUTH_CLIENT_EMAIL = "test-email-for-suite-only";
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;
      const oneHalf = await checkExistingConfigurations();
      assert(
        !oneHalf.includes("vertex"),
        "vertex should not be reported from the email half of the pair alone",
      );

      // Now both halves.
      process.env.GOOGLE_AUTH_PRIVATE_KEY = "test-key-for-suite-only";
      const bothHalves = await checkExistingConfigurations();
      assert(
        bothHalves.includes("vertex"),
        "vertex should be reported once both halves of the email+key pair are set",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("checkExistingConfigurations: a provider with no primary key set is not reported (openrouter)", async () => {
    const saved = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        !configured.includes("openrouter"),
        "openrouter should not be reported with no primary key var set",
      );
    } finally {
      if (saved === undefined) {
        delete process.env.OPENROUTER_API_KEY;
      } else {
        process.env.OPENROUTER_API_KEY = saved;
      }
    }
  });

  await test("checkExistingConfigurations still detects vertex via GOOGLE_APPLICATION_CREDENTIALS", async () => {
    // Pin the primary env var too (not just the credentials fallback) so this
    // test is hermetic — checkExistingConfigurations gates vertex on its
    // descriptor's primary apiKey (GOOGLE_CLOUD_PROJECT_ID) as well as the
    // credentials extraRequired/extraRequiredFallbacks. Without pinning it,
    // this test only passed courtesy of the dev machine's ambient .env.
    const savedProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const savedCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      "/tmp/fake-creds-for-suite-only.json";
    try {
      const { checkExistingConfigurations } =
        await import("../dist/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        configured.includes("vertex"),
        "vertex should be detected via its Google service-account env var",
      );
    } finally {
      if (savedProjectId === undefined) {
        delete process.env.GOOGLE_CLOUD_PROJECT_ID;
      } else {
        process.env.GOOGLE_CLOUD_PROJECT_ID = savedProjectId;
      }
      if (savedCredentials === undefined) {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      } else {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = savedCredentials;
      }
    }
  });

  logSection(
    "extraRequiredFallbacks paired-credential semantics (Vertex email+key)",
  );

  await test("satisfiesFallbacks: undefined fallbacks list is unsatisfied", async () => {
    const { satisfiesFallbacks } =
      await import("../dist/utils/providerConfig.js");
    assert(
      satisfiesFallbacks(undefined, {}) === false,
      "an undefined fallbacks list should never be satisfied",
    );
  });

  await test("satisfiesFallbacks: a flat string entry is satisfied alone", async () => {
    const { satisfiesFallbacks } =
      await import("../dist/utils/providerConfig.js");
    assert(
      satisfiesFallbacks(["SOME_VAR"], { SOME_VAR: "x" }) === true,
      "a flat entry present in env should satisfy on its own",
    );
    assert(
      satisfiesFallbacks(["SOME_VAR"], {}) === false,
      "a flat entry absent from env should not satisfy",
    );
  });

  await test("satisfiesFallbacks: a paired entry requires every name in the pair, not just one", async () => {
    const { satisfiesFallbacks } =
      await import("../dist/utils/providerConfig.js");
    const pairFallback = [["EMAIL_VAR", "KEY_VAR"]] as const;
    assert(
      satisfiesFallbacks(pairFallback, { EMAIL_VAR: "e" }) === false,
      "email half alone should not satisfy a paired entry",
    );
    assert(
      satisfiesFallbacks(pairFallback, { KEY_VAR: "k" }) === false,
      "key half alone should not satisfy a paired entry",
    );
    assert(
      satisfiesFallbacks(pairFallback, { EMAIL_VAR: "e", KEY_VAR: "k" }) ===
        true,
      "both halves present together should satisfy a paired entry",
    );
  });

  await test("satisfiesFallbacks: a flat entry later in the list still satisfies when an earlier paired entry doesn't", async () => {
    const { satisfiesFallbacks } =
      await import("../dist/utils/providerConfig.js");
    const mixed = [["EMAIL_VAR", "KEY_VAR"], "SERVICE_ACCOUNT_VAR"] as const;
    assert(
      satisfiesFallbacks(mixed, { SERVICE_ACCOUNT_VAR: "s" }) === true,
      "a satisfied flat entry should still win even when a preceding paired entry is unsatisfied",
    );
  });

  await test("vertex descriptor: GOOGLE_AUTH_CLIENT_EMAIL alone (no private key) does not satisfy the paired fallback", async () => {
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      process.env.GOOGLE_AUTH_CLIENT_EMAIL = "test-email-for-suite-only";
      delete process.env.GOOGLE_AUTH_PRIVATE_KEY;
      const { hasProviderEnvVars } =
        await import("../dist/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("vertex") === false,
        "vertex should not be considered configured from the client email alone",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("vertex descriptor: GOOGLE_AUTH_PRIVATE_KEY alone (no client email) does not satisfy the paired fallback", async () => {
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      delete process.env.GOOGLE_AUTH_CLIENT_EMAIL;
      process.env.GOOGLE_AUTH_PRIVATE_KEY = "test-key-for-suite-only";
      const { hasProviderEnvVars } =
        await import("../dist/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("vertex") === false,
        "vertex should not be considered configured from the private key alone",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  await test("vertex descriptor: GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY together satisfy the paired fallback", async () => {
    const controlledVars = [
      "GOOGLE_CLOUD_PROJECT_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK",
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      "GOOGLE_AUTH_CLIENT_EMAIL",
      "GOOGLE_AUTH_PRIVATE_KEY",
    ] as const;
    const saved: Record<string, string | undefined> = {};
    for (const v of controlledVars) {
      saved[v] = process.env[v];
    }
    try {
      process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project-for-suite-only";
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      process.env.GOOGLE_AUTH_CLIENT_EMAIL = "test-email-for-suite-only";
      process.env.GOOGLE_AUTH_PRIVATE_KEY = "test-key-for-suite-only";
      const { hasProviderEnvVars } =
        await import("../dist/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("vertex") === true,
        "vertex should be considered configured from the email+key pair together",
      );
    } finally {
      for (const v of controlledVars) {
        if (saved[v] === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = saved[v];
        }
      }
    }
  });

  logSection("resolveCredentialKey retirement (descriptor-backed)");

  await test("resolveCredentialKey resolves an alias's credentialsKey correctly (hf -> huggingFace)", async () => {
    const { ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    const { resolveCredentialKey } =
      await import("../dist/factories/providerFactory.js");
    assertEqual(
      resolveCredentialKey("hf"),
      "huggingFace",
      "hf alias should resolve to huggingFace via descriptor.credentialsKey",
    );
  });

  await test("resolveCredentialKey still resolves together-ai (regression guard for the retired CREDENTIAL_KEY_MAP)", async () => {
    const { resolveCredentialKey } =
      await import("../dist/factories/providerFactory.js");
    assertEqual(
      resolveCredentialKey("together-ai"),
      "together",
      "together-ai credentialsKey via descriptor",
    );
  });

  logSection("default health sweep (issue #1305 — full-coverage membership)");

  await test("the descriptor-driven health sweep covers every non-opted-out descriptor, prioritized ones first", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const all = ProviderFactory.getAllDescriptors();
    const eligible = all.filter(
      (d: { excludeFromHealthSweep?: true }) =>
        d.excludeFromHealthSweep !== true,
    );
    const sweep = eligible
      .slice()
      .sort(
        (
          a: { defaultHealthSweepPriority?: number },
          b: { defaultHealthSweepPriority?: number },
        ) =>
          (a.defaultHealthSweepPriority ?? Number.MAX_SAFE_INTEGER) -
          (b.defaultHealthSweepPriority ?? Number.MAX_SAFE_INTEGER),
      )
      .map((d: { name: string }) => d.name);

    // Membership: nothing opts out today, so the sweep must cover every
    // registered descriptor — no more silent, undocumented exclusion.
    assertEqual(
      sweep.length,
      all.length,
      "sweep membership must equal the full descriptor count",
    );

    // Order is behaviour: auto-select takes the first healthy provider, so
    // the historically prioritized 8 must still lead, in their original
    // sequence, before the rest follow in declaration order.
    assertEqual(
      sweep.slice(0, 8).join(","),
      "vertex,google-ai,anthropic,openai,bedrock,azure,litellm,ollama",
      "prioritized sweep prefix/order",
    );

    // Regression guard for the exact defect issue #1305 reported: these
    // were excluded from the sweep with no documented reason.
    for (const name of ["mistral", "deepseek"]) {
      assert(sweep.includes(name), `${name} must be part of the default sweep`);
    }

    const priorities = all
      .map(
        (d: { defaultHealthSweepPriority?: number }) =>
          d.defaultHealthSweepPriority,
      )
      .filter((p: number | undefined): p is number => p !== undefined);
    assertEqual(
      new Set(priorities).size,
      priorities.length,
      "sweep priorities must be unique",
    );
  });

  await test("the SHIPPED sweep returns every eligible provider, prioritized ones in order first", async () => {
    // Review follow-up: the data pin above proves the descriptors, not the
    // runtime. This drives ProviderHealthChecker.checkAllProvidersHealth
    // itself — health OUTCOMES are environment-dependent and irrelevant
    // here; the returned array's SIZE and SEQUENCE are the behaviour the
    // descriptor priorities own.
    const { ProviderFactory } = await import("../dist/index.js");
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const eligibleCount = ProviderFactory.getAllDescriptors().filter(
      (d: { excludeFromHealthSweep?: true }) =>
        d.excludeFromHealthSweep !== true,
    ).length;
    const statuses = await ProviderHealthChecker.checkAllProvidersHealth({
      includeConnectivityTest: false,
      cacheResults: false,
      timeout: 1000,
    });
    assertEqual(
      statuses.length,
      eligibleCount,
      "runtime sweep size must match the eligible descriptor count",
    );
    assertEqual(
      statuses
        .slice(0, 8)
        .map((h: { provider: string }) => h.provider)
        .join(","),
      "vertex,google-ai,anthropic,openai,bedrock,azure,litellm,ollama",
      "runtime sweep prioritized prefix/order",
    );
  });

  await test("the sweep backfills a freed slot rather than waiting out each batch (review r4053694648)", async () => {
    // Bounded concurrency was implemented as chunk-and-await: each batch
    // waits for ALL of its members before the next batch starts, so the
    // slowest member gates its whole batch and the sweep costs the SUM of
    // the per-batch maxima instead of one slowest check. Under
    // includeConnectivityTest the per-check bound is the full timeout, so a
    // full sweep regressed from ~1x to ~ceil(n/cap)x that. The cap is worth
    // keeping; the batching is not.
    //
    // Both halves are pinned, because either alone is satisfiable by a
    // wrong implementation: removing the cap would pass the backfill
    // assertion, and keeping the batches passes the cap assertion.
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { ProviderFactory } = await import("../dist/index.js");
    const eligible = ProviderFactory.getAllDescriptors()
      .filter(
        (d: { excludeFromHealthSweep?: true }) =>
          d.excludeFromHealthSweep !== true,
      )
      .sort(
        (
          a: { defaultHealthSweepPriority?: number },
          b: { defaultHealthSweepPriority?: number },
        ) =>
          (a.defaultHealthSweepPriority ?? Number.MAX_SAFE_INTEGER) -
          (b.defaultHealthSweepPriority ?? Number.MAX_SAFE_INTEGER),
      )
      .map((d: { name: string }) => d.name);

    // "vertex" sorts first, so the slow check sits in what would be the
    // first batch — the case where backfill either happens or does not.
    const SLOW_PROVIDER = "vertex";
    // Also inside the first cap window, and it REJECTS. Writing results by
    // index is what keeps the rejected-case fallback paired with
    // providers[index]; without a rejection in the mix nothing here would
    // exercise that branch at all.
    const REJECTING_PROVIDER = "bedrock";
    const SLOW_MS = 500;
    const CAP = 8; // MAX_CONCURRENT_HEALTH_CHECKS

    const original = ProviderHealthChecker.checkProviderHealth;
    let inFlight = 0;
    let maxInFlight = 0;
    let startedCount = 0;
    let startedWhenSlowFinished = -1;

    let statuses: Array<{
      provider: string;
      isHealthy: boolean;
      configurationIssues: string[];
    }>;
    try {
      ProviderHealthChecker.checkProviderHealth = async (
        name: Parameters<typeof original>[0],
      ) => {
        inFlight += 1;
        startedCount += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        // The decrement is in `finally` so the rejecting provider below
        // cannot leak a slot and corrupt the concurrency measurement.
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, name === SLOW_PROVIDER ? SLOW_MS : 1),
          );
          if (name === SLOW_PROVIDER) {
            startedWhenSlowFinished = startedCount;
          }
          if (name === REJECTING_PROVIDER) {
            throw new Error("suite-injected rejection");
          }
          return {
            provider: name,
            isHealthy: false,
            isConfigured: false,
            hasApiKey: false,
            lastChecked: new Date(),
            configurationIssues: [],
            recommendations: [],
            responseTime: 0,
          };
        } finally {
          inFlight -= 1;
        }
      };
      statuses = await ProviderHealthChecker.checkAllProvidersHealth({
        includeConnectivityTest: false,
        cacheResults: false,
      });
    } finally {
      ProviderHealthChecker.checkProviderHealth = original;
    }

    assert(maxInFlight <= CAP, "the sweep exceeded its concurrency cap");
    // Chunk-and-await can only ever have started one batch by the time the
    // slow member of that batch finishes. A limiter that refills a freed
    // slot starts far more, so anything above the cap discriminates; the
    // margin below keeps it away from scheduler noise.
    assert(
      startedWhenSlowFinished >= CAP * 2,
      "a slot freed by a fast check did not start the next provider while a slow one was still running",
    );
    assertEqual(
      statuses.map((s: { provider: string }) => s.provider).join(","),
      eligible.join(","),
      "sweep result order must stay in descriptor sweep order",
    );
    assertEqual(
      statuses.length,
      eligible.length,
      "sweep result count must match the eligible descriptor count",
    );
    // The rejected check must land at ITS OWN provider's index rather than
    // shifting later results by one, and must be reported through the
    // rejected-case fallback instead of silently vanishing.
    assertEqual(
      statuses[eligible.indexOf(REJECTING_PROVIDER)]?.provider,
      REJECTING_PROVIDER,
      "a rejected check must occupy its own provider's position",
    );
    const rejectedEntry = statuses.find(
      (s: { provider: string }) => s.provider === REJECTING_PROVIDER,
    );
    assertEqual(
      rejectedEntry?.isHealthy,
      false,
      "a rejected check must not be reported healthy",
    );
    assert(
      (rejectedEntry?.configurationIssues ?? []).some((issue: string) =>
        issue.includes("promise rejected"),
      ),
      "a rejected check must be reported through the rejected-case fallback",
    );
  });

  await test("a currently-excluded provider (mistral) appears in the sweep once configured (issue #1305)", async () => {
    // Precondition proving the sweep actually ran a real check for this
    // provider, not merely listed its name: responseTime is only set once
    // checkProviderHealth() reaches the end of its try block.
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { ProviderFactory } = await import("../dist/index.js");
    const eligibleCount = ProviderFactory.getAllDescriptors().filter(
      (d: { excludeFromHealthSweep?: true }) =>
        d.excludeFromHealthSweep !== true,
    ).length;

    const originalMistralKey = process.env.MISTRAL_API_KEY;
    // 32 alphanumeric chars — satisfies API_KEY_FORMATS.mistral so format
    // validation passes without a real credential or network call
    // (includeConnectivityTest stays false below).
    process.env.MISTRAL_API_KEY = "n".repeat(32);

    let statuses: Array<{
      provider: string;
      isConfigured: boolean;
      hasApiKey: boolean;
      isHealthy: boolean;
      responseTime?: number;
    }>;
    try {
      statuses = await ProviderHealthChecker.checkAllProvidersHealth({
        includeConnectivityTest: false,
        cacheResults: false,
        timeout: 1000,
      });
    } finally {
      if (originalMistralKey === undefined) {
        delete process.env.MISTRAL_API_KEY;
      } else {
        process.env.MISTRAL_API_KEY = originalMistralKey;
      }
    }

    // Precondition: the sweep iterated every eligible descriptor, not a
    // short hard-coded list — the exact shape of the original defect.
    assertEqual(
      statuses.length,
      eligibleCount,
      "sweep result count must match the eligible descriptor count",
    );

    const mistral = statuses.find(
      (s: { provider: string }) => s.provider === "mistral",
    );
    assert(
      mistral !== undefined,
      "mistral must be present in the sweep result",
    );
    assert(
      typeof mistral?.responseTime === "number",
      "mistral's entry must show a real check ran, not just membership",
    );
    assertEqual(
      mistral?.isConfigured,
      true,
      "mistral must be reported configured once its API key env var is set",
    );
    assertEqual(
      mistral?.hasApiKey,
      true,
      "mistral must be reported as having a validly formatted API key",
    );
    assertEqual(
      mistral?.isHealthy,
      true,
      "mistral must be reported healthy once configured",
    );
  });

  await test("repeated configuration-only sweeps never blacklist an unconfigured provider (issue #1305 follow-up)", async () => {
    // #1305 grew the sweep from 8 providers to every eligible descriptor,
    // so on any machine that lacks ~38 vendors' credentials most entries
    // now come back unconfigured on EVERY sweep. That must not count as a
    // provider failure: the circuit breaker exists to stop hammering an
    // endpoint, and a sweep with includeConnectivityTest off issues no
    // request at all. While it did count, the fourth such sweep tripped
    // the breaker and short-circuited before the check ran — returning a
    // structurally different entry (no responseTime, isConfigured false)
    // for a provider whose key had just been supplied, and continuing to
    // return it for the life of the process. That is the exact shape the
    // test above happens to catch, but only at its current call ordering;
    // this pins the behaviour directly.
    //
    // Two ways a test like this can stop discriminating, both closed here
    // rather than documented. Call ordering: clearHealthCache() resets the
    // breaker and the cache for every provider, so this drives the count
    // from zero and does not care how many checks earlier tests spent.
    // Threshold: CONSECUTIVE_FAILURE_THRESHOLD is read from
    // PROVIDER_FAILURE_THRESHOLD at class-init, so a literal loop count
    // sized against the default 3 would silently pass on the unfixed
    // checker under, say, PROVIDER_FAILURE_THRESHOLD=5. The loop below
    // instead exceeds the highest value getValidatedFailureThreshold will
    // accept, so no configured threshold escapes it.
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");

    type SweepEntry = {
      provider: string;
      isConfigured: boolean;
      isHealthy: boolean;
      responseTime?: number;
    };
    const sweepMistral = async (): Promise<SweepEntry | undefined> => {
      const statuses: SweepEntry[] =
        await ProviderHealthChecker.checkAllProvidersHealth({
          includeConnectivityTest: false,
          cacheResults: false,
          timeout: 1000,
        });
      return statuses.find((s) => s.provider === "mistral");
    };

    const originalMistralKey = process.env.MISTRAL_API_KEY;
    // Breaker and cache are process-lifetime static state that earlier
    // tests in this file have already moved — start from a known point.
    ProviderHealthChecker.clearHealthCache();

    let configured: SweepEntry | undefined;
    try {
      delete process.env.MISTRAL_API_KEY;
      // One more than the ceiling getValidatedFailureThreshold enforces
      // (10), so this outruns any threshold the env can select — not just
      // the default 3 that tripped the breaker in CI.
      for (let i = 0; i < 11; i++) {
        const unconfigured = await sweepMistral();
        assert(
          typeof unconfigured?.responseTime === "number",
          `sweep ${i + 1} skipped the check for mistral instead of running it`,
        );
        assertEqual(
          unconfigured?.isConfigured,
          false,
          `sweep ${i + 1} reported mistral configured with its env var removed`,
        );
      }
      process.env.MISTRAL_API_KEY = "n".repeat(32);
      configured = await sweepMistral();
    } finally {
      if (originalMistralKey === undefined) {
        delete process.env.MISTRAL_API_KEY;
      } else {
        process.env.MISTRAL_API_KEY = originalMistralKey;
      }
      ProviderHealthChecker.clearHealthCache();
    }

    assert(
      typeof configured?.responseTime === "number",
      "the sweep after the key was supplied skipped mistral's check",
    );
    assertEqual(
      configured?.isConfigured,
      true,
      "mistral stayed reported as unconfigured after its env var was set",
    );
    assertEqual(
      configured?.isHealthy,
      true,
      "mistral stayed reported as unhealthy after its env var was set",
    );
  });

  await test("auto-select preference data pins the historical default list", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const pref = ProviderFactory.getAllDescriptors()
      .filter(
        (d: { autoSelectPreference?: number }) =>
          d.autoSelectPreference !== undefined,
      )
      .sort(
        (
          a: { autoSelectPreference?: number },
          b: { autoSelectPreference?: number },
        ) => (a.autoSelectPreference ?? 0) - (b.autoSelectPreference ?? 0),
      )
      .map((d: { name: string }) => d.name);
    // getBestHealthyProvider's default parameter derives from this data;
    // local/cheap runtimes deliberately outrank cloud providers there.
    assertEqual(
      pref.join(","),
      "litellm,ollama,openai,anthropic,vertex,google-ai,bedrock,azure",
      "auto-select preference order",
    );
  });

  logSection(
    "PR #1735 follow-up: LiteLLM/Ollama runtime probe is breaker-governed",
  );

  // checkLiteLLMConfig/checkOllamaConfig make a REAL outbound HTTP request
  // (LiteLLM /v1/models, Ollama /api/tags) from step 1 of every health
  // check, even with includeConnectivityTest left at its default `false`.
  // That request is what makes `isConfigured` mean anything for a local
  // provider whose base URL always resolves to a built-in default and whose
  // `hasApiKey` is hard-coded true — see hasProviderEnvVars()'s single
  // caller in neurolink.ts. Gating it on includeConnectivityTest (the
  // obvious fix) breaks provider auto-select on a machine with no local
  // proxy running. Instead the request must be governed by the SAME circuit
  // breaker that already governs the step-3 connectivity probe: skipped
  // while blacklisted, and counted toward the breaker when it runs.
  //
  // Both fake upstreams answer every method with HTTP 500 when set
  // unhealthy. LiteLLM's connectivity-test endpoint (getProviderHealthEndpoint)
  // and its runtime-probe endpoint are the SAME URL (getLiteLLMModelsUrl()),
  // same for Ollama — so one upstream, made to fail via plain HTTP 500,
  // fails both the runtime probe AND the step-3 connectivity probe at once.
  // That is what lets the "one call, both probes" test below exist at all.

  const OLLAMA_TEST_MODEL = "suite-test-model:latest";
  // This repo's own .env sets LITELLM_MODEL (to a real proxy's model id),
  // which would otherwise steer checkLiteLLMConfig into matching against a
  // name our fake upstream never serves. Every LiteLLM test below pins
  // LITELLM_MODEL to this value via withEnv so behavior does not depend on
  // the ambient .env.
  const LITELLM_TEST_MODEL = "suite-test-litellm-model";
  // Default CONSECUTIVE_FAILURE_THRESHOLD — PROVIDER_FAILURE_THRESHOLD is
  // not set in this repo's .env, so ProviderHealthChecker resolves 3. If
  // that ever changes, these tests must fail loudly (not silently pass
  // with a wrong number), so nothing here hard-codes an assumption beyond
  // this single named constant.
  const THRESHOLD = 3;

  type FakeUpstream = {
    url: string;
    hits: () => number;
    setHealthy: (healthy: boolean) => void;
    close: () => Promise<void>;
  };

  /**
   * A local HTTP server standing in for a LiteLLM/Ollama base URL. Counts
   * every request it receives, and switches between a well-formed models
   * response (`setHealthy(true)`) and a plain HTTP 500 (`setHealthy(false)`)
   * on demand.
   */
  async function startFakeUpstream(
    kind: "litellm" | "ollama",
  ): Promise<FakeUpstream> {
    let hitCount = 0;
    let healthy = true;
    const server: Server = createServer((_req, res) => {
      hitCount++;
      if (!healthy) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "suite-injected failure" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      if (kind === "ollama") {
        res.end(JSON.stringify({ models: [{ name: OLLAMA_TEST_MODEL }] }));
      } else {
        res.end(JSON.stringify({ data: [{ id: LITELLM_TEST_MODEL }] }));
      }
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("fake upstream server did not report a port");
    }

    return {
      url: `http://127.0.0.1:${address.port}`,
      hits: () => hitCount,
      setHealthy: (value: boolean) => {
        healthy = value;
      },
      close: () =>
        new Promise<void>((resolve) => server.close(() => resolve())),
    };
  }

  async function withEnv<T>(
    vars: Record<string, string>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous: Record<string, string | undefined> = {};
    for (const key of Object.keys(vars)) {
      previous[key] = process.env[key];
      process.env[key] = vars[key];
    }
    try {
      return await fn();
    } finally {
      for (const key of Object.keys(vars)) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    }
  }

  await test("checkProviderHealth(litellm): failing upstream trips the breaker after threshold, then stops probing (default options)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("litellm");
    upstream.setHealthy(false);
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { LITELLM_BASE_URL: upstream.url, LITELLM_MODEL: LITELLM_TEST_MODEL },
        async () => {
          for (let i = 0; i < THRESHOLD; i++) {
            const before = upstream.hits();
            const status = await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.LITELLM,
              { includeConnectivityTest: false, cacheResults: false },
            );
            assertEqual(
              upstream.hits(),
              before + 1,
              `call ${i + 1} did not hit the fake upstream exactly once`,
            );
            assertEqual(
              status.isConfigured,
              false,
              `call ${i + 1} should report isConfigured false against a failing upstream`,
            );
          }

          // Precondition for the zero-request assertion below: the loop just
          // above proved the harness is live by hitting the server THRESHOLD
          // times against this exact env.
          const beforeBlacklist = upstream.hits();
          const blacklistedStatus =
            await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.LITELLM,
              {
                includeConnectivityTest: false,
                cacheResults: false,
              },
            );
          assertEqual(
            upstream.hits(),
            beforeBlacklist,
            "the call after crossing the threshold must not hit the fake upstream at all",
          );
          assertEqual(
            blacklistedStatus.isConfigured,
            false,
            "a blacklisted provider must still report isConfigured false",
          );
          assert(
            blacklistedStatus.configurationIssues.some((issue: string) =>
              issue.includes("Blacklisted"),
            ),
            "the blacklisted status must carry the blacklist configurationIssue",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(litellm): a passing probe resets the consecutive-failure count", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("litellm");
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { LITELLM_BASE_URL: upstream.url, LITELLM_MODEL: LITELLM_TEST_MODEL },
        async () => {
          // Fail below threshold (threshold is 3; two failures never trips it).
          upstream.setHealthy(false);
          for (let i = 0; i < THRESHOLD - 1; i++) {
            const status = await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.LITELLM,
              { includeConnectivityTest: false, cacheResults: false },
            );
            assertEqual(
              status.isConfigured,
              false,
              `pre-reset failing call ${i + 1} should report isConfigured false`,
            );
          }

          // One passing probe must reset the counter to zero.
          upstream.setHealthy(true);
          const passing = await ProviderHealthChecker.checkProviderHealth(
            AIProviderName.LITELLM,
            { includeConnectivityTest: false, cacheResults: false },
          );
          assertEqual(
            passing.isConfigured,
            true,
            "a healthy upstream must report isConfigured true",
          );

          // Fail again, below threshold — if the reset worked this must still
          // reach the upstream every time (breaker must not be tripped).
          upstream.setHealthy(false);
          for (let i = 0; i < THRESHOLD - 1; i++) {
            const before = upstream.hits();
            const status = await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.LITELLM,
              { includeConnectivityTest: false, cacheResults: false },
            );
            assert(
              upstream.hits() > before,
              `post-reset failing call ${i + 1} must still reach the upstream — the breaker must not be tripped`,
            );
            assertEqual(
              status.isConfigured,
              false,
              `post-reset failing call ${i + 1} should report isConfigured false`,
            );
            assert(
              !status.configurationIssues.some((issue: string) =>
                issue.includes("Blacklisted"),
              ),
              `post-reset failing call ${i + 1} must not be blacklisted`,
            );
          }
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(litellm): healthy upstream reports isConfigured true with default options (auto-select safety)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("litellm");
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { LITELLM_BASE_URL: upstream.url, LITELLM_MODEL: LITELLM_TEST_MODEL },
        async () => {
          const before = upstream.hits();
          const status = await ProviderHealthChecker.checkProviderHealth(
            AIProviderName.LITELLM,
            { includeConnectivityTest: false, cacheResults: false },
          );
          assert(
            upstream.hits() > before,
            "the default-mode call never reached the fake upstream — shallow mode must still probe local providers",
          );
          assertEqual(
            status.isConfigured,
            true,
            "a reachable LiteLLM proxy must be reported configured under default options",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(litellm, includeConnectivityTest:true): a failing upstream counts ONE breaker failure per call, not two", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("litellm");
    upstream.setHealthy(false);
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { LITELLM_BASE_URL: upstream.url, LITELLM_MODEL: LITELLM_TEST_MODEL },
        async () => {
          // Two failing calls with connectivity testing on, so BOTH the
          // runtime probe and the step-3 connectivity probe run and fail on
          // every call. If each counted its own failure, this alone trips a
          // threshold-3 breaker.
          for (let i = 0; i < 2; i++) {
            const before = upstream.hits();
            const status = await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.LITELLM,
              {
                includeConnectivityTest: true,
                cacheResults: false,
                timeout: 2000,
              },
            );
            assert(
              upstream.hits() > before,
              `call ${i + 1} did not reach the fake upstream`,
            );
            assertEqual(
              status.isConfigured,
              false,
              `call ${i + 1} should report isConfigured false`,
            );
          }

          // A third call must still issue a request — proof the breaker has
          // NOT tripped after only two calls, i.e. each of the two prior
          // calls counted as exactly one failure, not two.
          const before = upstream.hits();
          await ProviderHealthChecker.checkProviderHealth(
            AIProviderName.LITELLM,
            {
              includeConnectivityTest: true,
              cacheResults: false,
              timeout: 2000,
            },
          );
          assert(
            upstream.hits() > before,
            "the third call must still reach the fake upstream — the breaker must not have tripped after only two calls",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(ollama): failing upstream trips the breaker after threshold, then stops probing (default options)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("ollama");
    upstream.setHealthy(false);
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { OLLAMA_BASE_URL: upstream.url, OLLAMA_MODEL: OLLAMA_TEST_MODEL },
        async () => {
          for (let i = 0; i < THRESHOLD; i++) {
            const before = upstream.hits();
            const status = await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.OLLAMA,
              { includeConnectivityTest: false, cacheResults: false },
            );
            assertEqual(
              upstream.hits(),
              before + 1,
              `call ${i + 1} did not hit the fake upstream exactly once`,
            );
            assertEqual(
              status.isConfigured,
              false,
              `call ${i + 1} should report isConfigured false against a failing upstream`,
            );
          }

          // Precondition for the zero-request assertion below: the loop
          // just above proved the harness is live against this exact env.
          const beforeBlacklist = upstream.hits();
          const blacklistedStatus =
            await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.OLLAMA,
              {
                includeConnectivityTest: false,
                cacheResults: false,
              },
            );
          assertEqual(
            upstream.hits(),
            beforeBlacklist,
            "the call after crossing the threshold must not hit the fake upstream at all",
          );
          assertEqual(
            blacklistedStatus.isConfigured,
            false,
            "a blacklisted provider must still report isConfigured false",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(ollama): an unrelated caller's short maxCacheAge must not evict another caller's breaker entry early", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("ollama");
    upstream.setHealthy(false);
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { OLLAMA_BASE_URL: upstream.url, OLLAMA_MODEL: OLLAMA_TEST_MODEL },
        async () => {
          // Trip the breaker with the default (5-minute) maxCacheAge, the
          // same way an ordinary caller (e.g. a health sweep) would.
          for (let i = 0; i < THRESHOLD; i++) {
            await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.OLLAMA,
              { includeConnectivityTest: false, cacheResults: false },
            );
          }

          // Let a few real milliseconds pass so an eviction keyed off a
          // tiny maxCacheAge is unambiguously "expired", not a same-tick
          // race.
          await new Promise((resolve) => setTimeout(resolve, 5));

          // An unrelated caller reads the SAME shared, process-wide breaker
          // entry with a much shorter maxCacheAge — mirrors
          // checkFallbackProviderAvailability's hard-coded 15_000ms against
          // the sweep's 300_000ms default. This must not reach the
          // upstream: the breaker's own fixed reset window, not this
          // caller's maxCacheAge, governs when the entry expires.
          const beforeInterloper = upstream.hits();
          const interloperStatus =
            await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.OLLAMA,
              {
                includeConnectivityTest: false,
                cacheResults: false,
                maxCacheAge: 1,
              },
            );
          assertEqual(
            upstream.hits(),
            beforeInterloper,
            "a caller passing a tiny maxCacheAge must not evict another caller's breaker entry and re-probe a blacklisted provider",
          );
          assert(
            interloperStatus.configurationIssues.some((issue: string) =>
              issue.includes("Blacklisted"),
            ),
            "the short-maxCacheAge call must still observe the provider as blacklisted",
          );

          // The original caller, using the default maxCacheAge again, must
          // still see the breaker held too — it must not have been erased
          // by the interloper above.
          const beforeFollowUp = upstream.hits();
          const followUpStatus =
            await ProviderHealthChecker.checkProviderHealth(
              AIProviderName.OLLAMA,
              { includeConnectivityTest: false, cacheResults: false },
            );
          assertEqual(
            upstream.hits(),
            beforeFollowUp,
            "the original caller's next default-options call must still be suppressed by the breaker, not re-probe",
          );
          assert(
            followUpStatus.configurationIssues.some((issue: string) =>
              issue.includes("Blacklisted"),
            ),
            "the original caller must still observe the provider as blacklisted after the interloper call",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(ollama): healthy upstream reports isConfigured true with default options (auto-select safety)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    const upstream = await startFakeUpstream("ollama");
    ProviderHealthChecker.clearHealthCache();
    try {
      await withEnv(
        { OLLAMA_BASE_URL: upstream.url, OLLAMA_MODEL: OLLAMA_TEST_MODEL },
        async () => {
          const before = upstream.hits();
          const status = await ProviderHealthChecker.checkProviderHealth(
            AIProviderName.OLLAMA,
            { includeConnectivityTest: false, cacheResults: false },
          );
          assert(
            upstream.hits() > before,
            "the default-mode call never reached the fake upstream — shallow mode must still probe local providers",
          );
          assertEqual(
            status.isConfigured,
            true,
            "a reachable Ollama runtime must be reported configured under default options",
          );
        },
      );
    } finally {
      await upstream.close();
      ProviderHealthChecker.clearHealthCache();
    }
  });

  await test("checkProviderHealth(anthropic): non-local provider is unaffected by the runtime-probe breaker change", async () => {
    // Anthropic has no runtime probe at all — this pins that the new
    // breaker plumbing does not change behavior for providers that never
    // reach checkLiteLLMConfig/checkOllamaConfig.
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const { AIProviderName } = await import("../dist/index.js");
    ProviderHealthChecker.clearHealthCache();
    const originalKey = process.env.ANTHROPIC_API_KEY;
    try {
      delete process.env.ANTHROPIC_API_KEY;
      const status = await ProviderHealthChecker.checkProviderHealth(
        AIProviderName.ANTHROPIC,
        { includeConnectivityTest: false, cacheResults: false },
      );
      assertEqual(
        status.isConfigured,
        false,
        "anthropic without its API key must report isConfigured false, same as before this change",
      );
      assert(
        typeof status.responseTime === "number",
        "the check must still run to completion (no accidental blacklist/skip for a non-local provider)",
      );
    } finally {
      if (originalKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
      ProviderHealthChecker.clearHealthCache();
    }
  });
});
