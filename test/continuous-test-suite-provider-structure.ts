#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Provider Structure
 *
 * Zero-API structural checks that verify the provider registry stays
 * internally consistent as new providers are added: every value in the
 * canonical AIProviderName enum resolves via ProviderFactory, and every
 * concrete provider module under src/lib/providers/ has exactly one
 * dynamic import in providerRegistry.ts — no orphaned imports left behind
 * when a provider file is renamed or removed, no provider added to the
 * enum without also being wired into the registry.
 *
 * Split out of continuous-test-suite-providers.ts (which needs live API
 * keys for its other ~30 tests) so these two checks can run on every
 * commit with zero credentials, zero network calls, and a fast (<5s)
 * runtime — see docs/superpowers/plans/2026-08-15-02-ci-safety-net.md
 * Task 1.
 *
 * Run: npx tsx test/continuous-test-suite-provider-structure.ts
 *      pnpm run test:provider-structure
 */

import * as fs from "fs";
import * as path from "path";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build.
assertDistFresh();

const { test, runSuite } = defineSuite("Provider Structure");

/**
 * Modules under src/lib/providers/ that are not ProviderRegistry entries.
 * Two kinds of file end up here:
 *   - Genuinely non-provider files: barrel (`index`), cross-provider type
 *     helpers (`providerTypeUtils`), or a shared base class / client library
 *     that concrete provider files import from but that is never itself
 *     dynamically imported by providerRegistry.ts (e.g. `anthropicImageBlocks`
 *     exports free helper functions with no exported provider class;
 *     `openaiChatCompletionsBase` exports the abstract base class extended by
 *     cloudflare/azureOpenai/deepseek/cohere/fireworks/groq/llamaCpp/mistral/
 *     lmStudio/perplexity/togetherAi/xai; `openaiChatCompletionsClient`
 *     exports only shared request/response helpers used by the base class
 *     and several providers). None of these define a registrable provider,
 *     so requiring a dynamic import for them would be a false positive.
 *   - Stale entries left over from a prior layout, kept here only because a
 *     directory of the same name may exist now instead of a flat .ts file
 *     (`anthropicBaseProvider`, `googleNativeGemini3` — see the comment on
 *     `_doRegister` in providerRegistry.ts). Harmless no-ops: the readdir
 *     filter below only matches flat .ts files, so a directory never reaches
 *     this set in the first place.
 * Keep in sync with any new non-provider file added directly under
 * src/lib/providers/.
 */
const PROVIDER_REGISTRATION_EXCLUSIONS = new Set([
  "index",
  "providerTypeUtils",
  "anthropicBaseProvider",
  "googleNativeGemini3",
  "anthropicImageBlocks",
  "openaiChatCompletionsBase",
  "openaiChatCompletionsClient",
  // Pure data: the catalog of OpenAI-compatible provider entries. It exports
  // a const array, not a provider class, so it is a non-provider file in the
  // first sense above.
  "openaiCompatCatalog",
  // The generic class the catalog drives. It IS registered and IS dynamically
  // imported (once, inside the OPENAI_COMPAT_CATALOG loop), but never under a
  // provider ID of its own — one module backs all seven catalog entries. The
  // PROVIDER_MODULE_TO_ID manifest maps one module to exactly one
  // AIProviderName, so this module has no single honest entry there; the seven
  // IDs it registers are covered by their own manifest keys instead.
  "configuredOpenAICompat",
]);

const DYNAMIC_PROVIDER_IMPORT_RE =
  /import\s*\(\s*["']\.\.\/providers\/([A-Za-z][\w-]*)\.js["']\s*\)/g;

await test("Model Registry Completeness", async () => {
  const distModule = await import("../dist/index.js");

  const expectedProviders = [
    "openai",
    "anthropic",
    "vertex",
    "google-ai",
    "bedrock",
    "azure",
    "ollama",
    "mistral",
    "litellm",
    "huggingface",
    "openrouter",
    "openai-compatible",
    "sagemaker",
    "deepseek",
    "nvidia-nim",
    "lm-studio",
    "llamacpp",
    "xai",
    "groq",
    "cohere",
    "together-ai",
    "fireworks",
    "perplexity",
    "cloudflare",
    "voyage",
    "jina",
    "stability",
    "ideogram",
    "recraft",
    "replicate",
  ];

  const aiProviderName = distModule.AIProviderName as
    | Record<string, unknown>
    | undefined;
  assert(!!aiProviderName, "AIProviderName enum not exported from dist");

  const providerValues = Object.values(
    aiProviderName as Record<string, unknown>,
  ).filter((v) => typeof v === "string") as string[];

  const missingProviders = expectedProviders.filter(
    (p) => !providerValues.includes(p),
  );
  assert(
    missingProviders.length === 0,
    `enum missing ${missingProviders.length} expected provider id(s)`,
  );

  const modelEnums = [
    "OpenAIModels",
    "AnthropicModels",
    "VertexModels",
    "GoogleAIModels",
    "BedrockModels",
    "MistralModels",
    "OllamaModels",
  ];
  const requiredEnums = ["OpenAIModels", "VertexModels", "BedrockModels"];

  const presentEnums = modelEnums.filter(
    (enumName) => !!(distModule as Record<string, unknown>)[enumName],
  );
  const missingRequired = requiredEnums.filter(
    (e) => !presentEnums.includes(e),
  );
  assert(
    missingRequired.length === 0,
    `dist is missing ${missingRequired.length} required model enum(s)`,
  );
});

await test("Provider Registration Completeness", async () => {
  const providersDir = path.join(process.cwd(), "src", "lib", "providers");
  const registryPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "factories",
    "providerRegistry.ts",
  );

  assert(
    fs.existsSync(providersDir) && fs.existsSync(registryPath),
    "providers/ or providerRegistry.ts not found (run from repo root)",
  );

  const registrySource = fs.readFileSync(registryPath, "utf8");
  const concreteProviders = fs
    .readdirSync(providersDir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => name.replace(/\.ts$/, ""))
    .filter((base) => !PROVIDER_REGISTRATION_EXCLUSIONS.has(base))
    .sort();

  const importCounts = new Map<string, number>();
  for (const match of registrySource.matchAll(DYNAMIC_PROVIDER_IMPORT_RE)) {
    const base = match[1];
    importCounts.set(base, (importCounts.get(base) ?? 0) + 1);
  }

  const failures: string[] = [];

  for (const base of concreteProviders) {
    const count = importCounts.get(base) ?? 0;
    if (count === 0) {
      failures.push(`missing dynamic import: ${base}`);
    } else if (count > 1) {
      failures.push(`duplicate dynamic import: ${base} (${count}x)`);
    }

    const source = fs.readFileSync(
      path.join(providersDir, `${base}.ts`),
      "utf8",
    );
    if (!/export\s+class\s+\w+/.test(source)) {
      failures.push(`no exported class in ${base}.ts`);
    }
  }

  for (const [base, count] of [...importCounts.entries()].sort()) {
    if (!fs.existsSync(path.join(providersDir, `${base}.ts`))) {
      failures.push(
        `stale dynamic import: ${base}.js (${count}x, file missing)`,
      );
    }
  }

  assert(
    failures.length === 0,
    `${failures.length} registry/filesystem mismatch(es): ${failures.join("; ")}`,
  );

  const { ProviderRegistry } =
    await import("../dist/factories/providerRegistry.js");
  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  ProviderRegistry.clearRegistrations();
  await ProviderRegistry.registerAllProviders();

  const canonicalIds = Object.values(AIProviderName)
    .filter(
      (v): v is string => typeof v === "string" && v !== AIProviderName.AUTO,
    )
    .sort();

  assert(
    new Set(canonicalIds).size === canonicalIds.length,
    "duplicate AIProviderName values detected",
  );

  const unresolved = canonicalIds.filter(
    (id) => !ProviderFactory.hasProvider(id),
  );
  assert(
    unresolved.length === 0,
    `${unresolved.length} canonical id(s) not resolvable via ProviderFactory`,
  );

  assert(
    !ProviderFactory.hasProvider(AIProviderName.AUTO),
    "AUTO must not be registered as a concrete provider",
  );

  const claimedKeys = new Map<string, string>();
  const keyCollisions: string[] = [];
  for (const id of canonicalIds) {
    const info = ProviderFactory.getProviderInfo(id);
    if (!info) {
      keyCollisions.push(`${id}: missing registration info`);
      continue;
    }
    const keys = [
      id.toLowerCase(),
      ...(info.aliases ?? []).map((a) => a.toLowerCase()),
    ];
    for (const key of keys) {
      const owner = claimedKeys.get(key);
      if (owner && owner !== id) {
        keyCollisions.push(`key "${key}" claimed by ${owner} and ${id}`);
      } else {
        claimedKeys.set(key, id);
      }
    }
    for (const alias of info.aliases ?? []) {
      if (ProviderFactory.getProviderInfo(alias) !== info) {
        keyCollisions.push(
          `alias "${alias}" does not resolve to primary "${id}"`,
        );
      }
    }
  }

  assert(
    keyCollisions.length === 0,
    `${keyCollisions.length} alias/key collision(s) found`,
  );
});

/**
 * A per-model token-limit key that no enum value points at is dead config:
 * either the key is stale, or the enum carries a different id for the same
 * model and the limit is silently never applied.
 *
 * That second case is how Bedrock/Vertex Claude Opus 4.5 shipped with an
 * unusable model id — the tables were keyed on the real id (…20251101…)
 * while the enums emitted the launch date (…20251124…), so the enum value
 * reached AWS as an invalid identifier and its token limit was never read.
 * Nothing failed loudly, because an unmatched key just falls through to the
 * provider default.
 */
/**
 * Keys deliberately kept for model ids the enums no longer advertise but
 * callers may still pass by hand. Unlike the failure this test guards
 * against, none of these is a *disagreement* — no enum value names the same
 * model under a different id.
 */
const KNOWN_UNREFERENCED_TOKEN_KEYS: Record<string, readonly string[]> = {
  BEDROCK: [
    // Regional inference-profile spelling ("us." prefix) of a bare id the
    // enum already carries.
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    // On-demand id the enum does not carry at all, kept for callers who pass
    // it directly. Not a regional variant.
    "anthropic.claude-3-opus-20240229-v1:0",
  ],
  // Gemini 1.5 names the Vertex enum no longer advertises, still accepted
  // when passed by hand.
  VERTEX: ["gemini-1.5-pro", "gemini-1.5-flash"],
};

await test("Model id tables agree with the model enums", async () => {
  const { BedrockModels, VertexModels, AnthropicModels } =
    await import("../dist/constants/enums.js");
  const { PROVIDER_TOKEN_LIMITS } = await import("../dist/constants/tokens.js");

  const surfaces = [
    { table: "BEDROCK", models: BedrockModels },
    { table: "VERTEX", models: VertexModels },
    { table: "ANTHROPIC", models: AnthropicModels },
  ] as const;

  const orphans: string[] = [];
  for (const { table, models } of surfaces) {
    const limits = (
      PROVIDER_TOKEN_LIMITS as unknown as Record<string, Record<string, number>>
    )[table];
    if (!limits) {
      orphans.push(`${table}: no PROVIDER_TOKEN_LIMITS entry`);
      continue;
    }
    const declared = new Set(Object.values(models) as string[]);
    const allowed = new Set(KNOWN_UNREFERENCED_TOKEN_KEYS[table] ?? []);
    for (const key of Object.keys(limits)) {
      if (key === "default" || allowed.has(key) || declared.has(key)) {
        continue;
      }
      orphans.push(`${table}.${key}`);
    }
  }

  // The offending keys are printed, never interpolated into the assertion
  // message: they contain provider names, and defineSuite downgrades a
  // failure to SKIP when the message looks like a provider error.
  if (orphans.length > 0) {
    console.error("  unreachable token-limit keys:");
    orphans.forEach((o) => console.error(`    ${o}`));
  }
  assert(
    orphans.length === 0,
    `${orphans.length} token-limit key(s) unreachable from any model enum (listed above)`,
  );
});

await runSuite();
