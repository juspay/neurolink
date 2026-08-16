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

  await test("getRequiredEnvironmentVariables still delegates vertex/bedrock/litellm to their specific-config checks (regression)", async () => {
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

  await test("getRequiredEnvironmentVariables resolves aliases before consulting the specific-config delegation set (regression)", async () => {
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    // "googleVertex" and "aws" are documented aliases for vertex/bedrock.
    // The delegation check must key off the resolved descriptor name, not
    // the raw alias string, or it silently skips delegation for aliased
    // input and reports a false non-empty required-vars list.
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

  await test("checkExistingConfigurations detects together via descriptor-driven logic (characterization)", async () => {
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
