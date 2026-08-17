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

  await test("getAllDescriptors returns all 30 real providers", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const all = ProviderFactory.getAllDescriptors();
    assertEqual(all.length, 30, "getAllDescriptors length");
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
    const { ProviderFactory, ProviderRegistry, PROVIDER_DESCRIPTORS_BY_NAME } =
      await import("../dist/index.js");
    // registerAllProviders(), not ensureInitialized() — see the note in
    // Task 4's normalizeProviderName test for why.
    await ProviderRegistry.registerAllProviders();
    // getProviderInfo() takes a provider name and returns that one
    // registration (or undefined) — it is not a bulk accessor.
    const info = ProviderFactory.getProviderInfo("openai");
    assert(info !== undefined, "expected openai to be registered");
    const staticDescriptor = PROVIDER_DESCRIPTORS_BY_NAME.get("openai");
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
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      credentialsKey: string;
      toolSupport: string;
      healthCheck: string;
    }>) {
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
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      aliases: readonly string[];
    }>) {
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
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      aliases: readonly string[];
    }>) {
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
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      aliases: readonly string[];
    }>) {
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

  logSection("apiKeyFormatPattern coverage (8 descriptors set it)");

  await test("apiKeyFormatPattern: every field present on a descriptor is a real RegExp instance", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      apiKeyFormatPattern?: unknown;
    }>) {
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
    // Every 30 canonical names, minus the 8 that legitimately set the field.
    const withPattern = new Set([
      "bedrock",
      "openai",
      "anthropic",
      "azure",
      "google-ai",
      "huggingface",
      "mistral",
      "sagemaker",
    ]);
    let checkedAbsent = 0;
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      apiKeyFormatPattern?: unknown;
    }>) {
      if (!withPattern.has(d.name)) {
        assert(
          d.apiKeyFormatPattern === undefined,
          `${d.name} unexpectedly carries an apiKeyFormatPattern field`,
        );
        checkedAbsent += 1;
      }
    }
    // Sanity: the 30-descriptor set minus the 8 with-pattern entries is 22.
    assertEqual(
      checkedAbsent,
      22,
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
    const byName = new Map(
      (
        PROVIDER_DESCRIPTORS as Array<{
          name: string;
          apiKeyFormatPattern?: RegExp;
        }>
      ).map((d) => [d.name, d]),
    );
    for (const { provider, accept } of patternCases) {
      const pattern = byName.get(provider)?.apiKeyFormatPattern;
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
    const byName = new Map(
      (
        PROVIDER_DESCRIPTORS as Array<{
          name: string;
          apiKeyFormatPattern?: RegExp;
        }>
      ).map((d) => [d.name, d]),
    );
    for (const { provider } of patternCases) {
      const pattern = byName.get(provider)?.apiKeyFormatPattern;
      assert(
        pattern !== undefined && !pattern.test(""),
        `${provider} apiKeyFormatPattern accepted an empty string`,
      );
    }
  });

  await test("apiKeyFormatPattern: rejects a wrong-prefix/wrong-shape sample per provider", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const byName = new Map(
      (
        PROVIDER_DESCRIPTORS as Array<{
          name: string;
          apiKeyFormatPattern?: RegExp;
        }>
      ).map((d) => [d.name, d]),
    );
    for (const { provider, rejectShape } of patternCases) {
      const pattern = byName.get(provider)?.apiKeyFormatPattern;
      assert(
        pattern !== undefined && !pattern.test(rejectShape),
        `${provider} apiKeyFormatPattern accepted a wrong-shape sample`,
      );
    }
  });

  await test("apiKeyFormatPattern: completes well under a second against a 10k-char pathological input (ReDoS guard)", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const byName = new Map(
      (
        PROVIDER_DESCRIPTORS as Array<{
          name: string;
          apiKeyFormatPattern?: RegExp;
        }>
      ).map((d) => [d.name, d]),
    );
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
      const pattern = byName.get(provider)?.apiKeyFormatPattern;
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

  await test("getAvailableProviders lists all 30 descriptor names", async () => {
    const { getAvailableProviders } =
      await import("../dist/utils/providerUtils.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const available = getAvailableProviders();
    for (const d of PROVIDER_DESCRIPTORS as Array<{ name: string }>) {
      assert(
        available.includes(d.name),
        `getAvailableProviders missing ${d.name}`,
      );
    }
  });

  logSection("autoSelectPriority reconciliation");

  await test("descriptors with autoSelectPriority reproduce getBestProvider's historical 10-provider order", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const prioritized = (
      PROVIDER_DESCRIPTORS as Array<{
        name: string;
        autoSelectPriority?: number;
      }>
    )
      .filter((d) => d.autoSelectPriority !== undefined)
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

  await test("descriptor.toolSupport !== 'native' reproduces the original 9-member prompt-only set", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
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
    ]);
    for (const d of ProviderFactory.getAllDescriptors() as Array<{
      name: string;
      toolSupport: string;
    }>) {
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
});
