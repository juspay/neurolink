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
import * as os from "node:os";
import { pathToFileURL } from "node:url";
import { assert, defineSuite, runCommand } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
// Type-only: erased at compile time, so this does not pull the runtime
// suite off the all-dist module graph (rule 15) — the enum's runtime
// binding below still comes from ../dist/constants/enums.js.
import type { AIProviderName as AIProviderNameType } from "../src/lib/constants/enums.js";
// Type-only, same reasoning — used only to type the dynamic import of an
// isolated dist COPY below (not ../dist itself, so no literal specifier is
// possible); the runtime binding still comes from that copy.
import type * as ModelChoicesModuleType from "../src/lib/utils/modelChoices.js";

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
  // The abstract base the decision providers (typesafe, laya, xor,
  // perplexity-decider, cloudflare-clef) extend. Like
  // openaiChatCompletionsBase, it is imported by providers and never itself
  // registered.
  "systemOneDecision",
  // Pure data: the catalog of OpenAI-compatible provider entries. It exports
  // a const array, not a provider class, so it is a non-provider file in the
  // first sense above.
  "openaiCompatCatalog",
  // The generic class the catalog drives. It IS registered and IS dynamically
  // imported (once, inside the OPENAI_COMPAT_CATALOG loop), but never under a
  // provider ID of its own — one module backs all ten catalog entries. The
  // PROVIDER_MODULE_TO_ID manifest maps one module to exactly one
  // AIProviderName, so this module has no single honest entry there; the ten
  // IDs it registers are covered by their own manifest keys instead.
  "configuredOpenAICompat",
  // Shared error-rule builder for Ollama/LM Studio/llama.cpp — a plain
  // function, not a provider class (the neurolink/provider-base-class lint
  // rule requires each of those three to extend OpenAIChatCompletionsProvider
  // directly, so this is a helper import, never a dynamic import target).
  "localRuntimeOpenAICompat",
  // Shared embeddings-response validator for Voyage/Jina — a plain function,
  // not a provider class, for the same reason as localRuntimeOpenAICompat
  // above.
  "embeddingResponseParsing",
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
      (v): v is AIProviderNameType =>
        typeof v === "string" && v !== AIProviderName.AUTO,
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

/**
 * config/models.json is the registry `DynamicModelProvider` serves from GitHub
 * and from the working directory, so it has to name the same model ids the
 * enums do. Opus 4.5 is the case that already went wrong: the enums were
 * corrected from the launch date (…20251124…) to the id AWS, Vertex and
 * Anthropic actually issue (…20251101…), and this file kept the launch date in
 * all three provider sections.
 */
await test("config/models.json Claude ids agree with the model enums", async () => {
  const { BedrockModels, VertexModels, AnthropicModels } =
    await import("../dist/constants/enums.js");

  const configPath = path.join(process.cwd(), "config", "models.json");
  assert(
    fs.existsSync(configPath),
    "config/models.json not found (run from repo root)",
  );
  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    models: Record<string, Record<string, { id: string }>>;
  };

  // Two spellings name the same model under a different string: Vertex pins
  // with "@" where the registry uses a hyphen, and Bedrock's regional
  // inference profile carries a "us." prefix.
  const canonical = (id: string): string =>
    id.replace(/^us\./, "").replace("@", "-");

  const surfaces = [
    { section: "anthropic", models: AnthropicModels },
    { section: "bedrock", models: BedrockModels },
    { section: "vertex", models: VertexModels },
  ] as const;

  const unknown: string[] = [];
  let checked = 0;
  for (const { section, models } of surfaces) {
    const declared = new Set(
      (Object.values(models) as string[]).map(canonical),
    );
    for (const [key, entry] of Object.entries(config.models[section] ?? {})) {
      checked++;
      if (!declared.has(canonical(entry.id))) {
        unknown.push(`${section}.${key}`);
      }
    }
  }

  assert(
    checked > 0,
    "config/models.json had no anthropic/bedrock/vertex entries",
  );
  // Offending keys are printed, never interpolated into the message: they
  // contain provider names, and defineSuite downgrades a failure to SKIP when
  // the message looks like a provider error.
  if (unknown.length > 0) {
    console.error("  config/models.json ids no model enum carries:");
    unknown.forEach((key) => console.error(`    ${key}`));
  }
  assert(
    unknown.length === 0,
    `${unknown.length} config/models.json id(s) match no model enum value (listed above)`,
  );
});

/**
 * `getAllModels(provider)`/`isValidModel(provider, model)`
 * (src/lib/utils/modelChoices.ts) have no consumer that reaches them
 * through NeuroLink's shipped surface today (neither function is exported
 * from dist/index.js, and every real internal caller uses
 * getTopModelChoices instead) — same "no public surface at all" reasoning
 * as the other deep-dist-import cases in this file's grandfathered
 * exception. Reads the fireworks.json catalog fixture directly, exactly
 * like Provider Registration Completeness above reads providerRegistry.ts,
 * to prove the ids this test pins actually match the source of truth
 * before trusting the functions under test to filter them correctly.
 */
await test("getAllModels/isValidModel exclude retired catalog ids from the listing", async () => {
  const RETIRED_MODEL = "accounts/fireworks/models/kimi-k2p6";
  const LIVE_MODEL = "accounts/fireworks/models/kimi-k3";

  const catalogPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "providers",
    "catalog",
    "fireworks.json",
  );
  assert(
    fs.existsSync(catalogPath),
    "src/lib/providers/catalog/fireworks.json not found (run from repo root)",
  );
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
    models: { catalog: Record<string, { status?: string }> };
  };

  // Precondition: the fixture ids this test pins still match what the
  // catalog source of truth actually says, so the assertions below test
  // the filter, not a stale literal that no longer describes the data.
  assert(
    catalog.models.catalog[RETIRED_MODEL]?.status === "retired",
    "fixture drift: fireworks.json catalog no longer marks kimi-k2p6 as retired",
  );
  assert(
    catalog.models.catalog[LIVE_MODEL]?.status === "production",
    "fixture drift: fireworks.json catalog no longer marks kimi-k3 as production",
  );

  const { getAllModels, isValidModel } =
    await import("../dist/utils/modelChoices.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  const models = getAllModels(AIProviderName.FIREWORKS);
  assert(
    models.length > 0,
    "getAllModels(FIREWORKS) returned an empty listing — catalog wiring broken, cannot test the filter",
  );
  assert(
    !models.includes(RETIRED_MODEL),
    "getAllModels(FIREWORKS) must exclude the retired kimi-k2p6 id from its listing",
  );
  assert(
    models.includes(LIVE_MODEL),
    "getAllModels(FIREWORKS) must still include the live kimi-k3 model",
  );

  // isValidModel must still accept a caller who pins the retired id
  // explicitly — only the listing surface drops it; a pin must not start
  // failing validation just because its id left the selectable listing.
  assert(
    isValidModel(AIProviderName.FIREWORKS, RETIRED_MODEL),
    "isValidModel(FIREWORKS, kimi-k2p6) must still accept an explicitly pinned retired id",
  );
  assert(
    isValidModel(AIProviderName.FIREWORKS, LIVE_MODEL),
    "isValidModel(FIREWORKS, kimi-k3) must accept the live default id",
  );

  // The catalog-membership fallback is `model in catalogEntry.models.catalog`,
  // and `in` walks the prototype chain — the catalog object is a plain
  // object (structuredClone of parsed JSON), so it inherits Object.prototype
  // members. A fabricated "model id" that happens to name one of those
  // inherited members must still be rejected.
  assert(
    !isValidModel(AIProviderName.FIREWORKS, "toString"),
    "isValidModel(FIREWORKS, 'toString') must reject an inherited Object.prototype member name, not just absent catalog keys",
  );
});

/**
 * isValidModel's empty-listing branch, isolated from the real catalog.
 *
 * No shipped catalog is all-retired today (the precondition below proves
 * fireworks.json specifically is not), so `getAllModels(provider) === []`
 * for a catalog provider never happens against real data, and the branch
 * that decides what an empty listing means cannot be exercised by calling
 * the shipped functions against the shipped fixture — the assertion above
 * always takes the `models.includes(model)` path, never the empty-array
 * path this test targets.
 *
 * To reach it without editing the real fireworks.json (which the rest of
 * this suite, and test:openai-compat-catalog, depend on staying real),
 * this test copies the BUILT dist/ output — the exact compiled code under
 * test, not a reimplementation — into an isolated scratch directory, edits
 * only the COPY's fireworks.json to mark every catalog entry "retired",
 * and dynamically imports modelChoices.js/enums.js from that copy by file
 * URL. The project's dist/ and the src/ fixture are never written to; the
 * scratch directory is removed in a `finally`. Same technique CodeRabbit's
 * own reproduction used to establish the finding in the first place.
 */
await test("isValidModel rejects a fabricated id when a catalog provider's every entry is retired (isolated dist copy)", async () => {
  const catalogPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "providers",
    "catalog",
    "fireworks.json",
  );
  const realCatalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
    models: { catalog: Record<string, { status?: string }> };
  };

  // Precondition: the real catalog is not already all-retired. If it
  // were, the isolated copy below would not be adding anything the real
  // fixture doesn't already cover, and this test would not be proving
  // what its name says.
  const hasNonRetiredEntry = Object.values(realCatalog.models.catalog).some(
    (spec) => spec.status !== "retired",
  );
  assert(
    hasNonRetiredEntry,
    "precondition: src/lib/providers/catalog/fireworks.json is already all-retired — this test's isolated-copy scenario no longer differs from the real fixture",
  );

  const scratchRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "neurolink-catalog-rot-fixture-"),
  );
  try {
    const distSrc = path.join(process.cwd(), "dist");
    const distCopy = path.join(scratchRoot, "dist");

    // Precondition: there is a real dist/ to copy. assertDistFresh() at
    // module load already proved it exists and is current with src/; this
    // re-check is just for the copy step immediately below.
    assert(
      fs.existsSync(distSrc),
      "dist/ not found — run `pnpm run build` before this suite",
    );

    fs.cpSync(distSrc, distCopy, { recursive: true });
    // dist/ has no package.json of its own (the repo root's "type":
    // "module" covers it via directory walk-up); the copy needs its own
    // marker so Node parses the copied .js files as ESM rather than
    // falling back to CJS once it can no longer see the real root.
    fs.writeFileSync(
      path.join(scratchRoot, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    // The copied files still import real npm packages (e.g. zod); this
    // makes bare-specifier resolution find them without duplicating
    // node_modules.
    fs.symlinkSync(
      path.join(process.cwd(), "node_modules"),
      path.join(scratchRoot, "node_modules"),
      "dir",
    );

    const copiedCatalogPath = path.join(
      distCopy,
      "providers",
      "catalog",
      "fireworks.json",
    );
    const copiedCatalog = JSON.parse(
      fs.readFileSync(copiedCatalogPath, "utf8"),
    ) as { models: { catalog: Record<string, { status: string }> } };
    const catalogKeys = Object.keys(copiedCatalog.models.catalog);
    assert(
      catalogKeys.length > 0,
      "copied fireworks.json has an empty catalog — cannot force an all-retired fixture from nothing",
    );
    for (const key of catalogKeys) {
      copiedCatalog.models.catalog[key].status = "retired";
    }
    fs.writeFileSync(copiedCatalogPath, JSON.stringify(copiedCatalog, null, 2));

    const modelChoices = (await import(
      pathToFileURL(path.join(distCopy, "utils", "modelChoices.js")).href
    )) as typeof ModelChoicesModuleType;
    const enumsModule = (await import(
      pathToFileURL(path.join(distCopy, "constants", "enums.js")).href
    )) as { AIProviderName: Record<string, AIProviderNameType> };
    const { getAllModels, isValidModel } = modelChoices;
    const { AIProviderName: CopyAIProviderName } = enumsModule;

    // Precondition: the copy's listing is really empty now — otherwise
    // the assertions below would pass by accident (the ordinary
    // `models.includes(model)` path), not because the empty-listing
    // branch under test actually ran.
    const modelsInCopy = getAllModels(CopyAIProviderName.FIREWORKS);
    assert(
      modelsInCopy.length === 0,
      "isolated copy: getAllModels(FIREWORKS) is not empty after forcing every catalog entry to retired — the fixture edit did not take, so this does not test the empty-listing branch",
    );

    const FABRICATED_ID = "totally-made-up-model-id-does-not-exist-xyz";
    assert(
      !isValidModel(CopyAIProviderName.FIREWORKS, FABRICATED_ID),
      "isValidModel(FIREWORKS, <fabricated id>) must reject an id that is not in the catalog, even when every catalog entry is retired",
    );

    // A real (now all-retired) catalog id must still validate — the
    // empty-listing branch is a catalog-membership check, not a blanket
    // rejection, so an explicitly pinned retired id keeps working.
    const REAL_ID_IN_CATALOG = catalogKeys[0];
    assert(
      isValidModel(CopyAIProviderName.FIREWORKS, REAL_ID_IN_CATALOG),
      "isValidModel(FIREWORKS, <real catalog id>) must still accept a real catalog id even when every entry (including this one) is retired",
    );
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
});

/**
 * The onboarding gate rejects a hand-written provider's manifest that drops a
 * field the manifests README documents.
 *
 * `tools/verify-provider-onboarding.ts` is repo tooling, not a package
 * surface, so this drives the real tool as a subprocess rather than importing
 * it. Its reads are relative to the working directory, so the child runs in a
 * scratch tree: `src` and `test` are symlinks to the real ones, and only the
 * manifests directory is a copy that can be edited. The checked-in manifests
 * are never touched.
 *
 * Three providers each lose one field. `perplexity-decider` is left intact in
 * the same run as the control: it must still pass, which shows the scratch tree
 * measured something and that the failures come from the removed fields. The
 * tool's output is never quoted into an assertion message.
 */
await test("verify:provider-onboarding rejects a manifest missing addedInPR, filesTouched or manualTestStatus (isolated tree)", async () => {
  const manifestsRel = path.join("docs", "provider-integration", "manifests");
  const dropped: ReadonlyArray<{ provider: string; field: string }> = [
    { provider: "xor", field: "addedInPR" },
    { provider: "laya", field: "filesTouched" },
    { provider: "typesafe", field: "manualTestStatus" },
  ];
  const control = "perplexity-decider";

  const scratchRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "neurolink-onboarding-gate-"),
  );
  try {
    const scratchManifests = path.join(scratchRoot, manifestsRel);
    fs.mkdirSync(scratchManifests, { recursive: true });
    fs.symlinkSync(
      path.join(process.cwd(), "src"),
      path.join(scratchRoot, "src"),
      "dir",
    );
    fs.symlinkSync(
      path.join(process.cwd(), "test"),
      path.join(scratchRoot, "test"),
      "dir",
    );

    for (const provider of [...dropped.map((d) => d.provider), control]) {
      const real = path.join(process.cwd(), manifestsRel, `${provider}.json`);
      assert(
        fs.existsSync(real),
        `precondition: ${provider} must be a hand-written provider with a checked-in manifest`,
      );
      const manifest = JSON.parse(fs.readFileSync(real, "utf8")) as Record<
        string,
        unknown
      >;
      const drop = dropped.find((d) => d.provider === provider);
      if (drop) {
        assert(
          drop.field in manifest,
          `precondition: the checked-in ${provider} manifest must carry ${drop.field}, or removing it proves nothing`,
        );
        delete manifest[drop.field];
      }
      fs.writeFileSync(
        path.join(scratchManifests, `${provider}.json`),
        JSON.stringify(manifest, null, 2),
      );
    }

    const result = await runCommand(
      path.join(process.cwd(), "node_modules", ".bin", "tsx"),
      [path.join(process.cwd(), "tools", "verify-provider-onboarding.ts")],
      { cwd: scratchRoot, timeoutMs: 120_000 },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    assert(
      output.includes(`✓ ${control}`),
      "the intact manifest must still pass in the scratch tree, or the tree measured nothing",
    );
    // The gate prints `✗ <provider>` followed by one `    - <problem>` line per
    // problem. A ✗ alone would also appear for an unrelated failure (a missing
    // test row, a bad catalog entry), so each dropped provider must be
    // rejected for the manifest field specifically.
    const lines = output.split("\n");
    const problemsFor = (provider: string): string[] => {
      const start = lines.findIndex((line) => line.trim() === `✗ ${provider}`);
      if (start === -1) {
        return [];
      }
      const problems: string[] = [];
      for (const line of lines.slice(start + 1)) {
        if (!line.startsWith("    - ")) {
          break;
        }
        problems.push(line.slice("    - ".length));
      }
      return problems;
    };
    for (const { provider, field } of dropped) {
      assert(
        output.includes(`✗ ${provider}`),
        `a ${provider} manifest without ${field} must be rejected by the gate`,
      );
      assert(
        problemsFor(provider).some((problem) =>
          problem.startsWith("manifest missing required field(s)"),
        ),
        `the gate must reject the ${provider} manifest for its missing ${field}, not for some other problem`,
      );
    }
    assert(
      result.exitCode !== 0,
      "the gate must exit non-zero when a manifest is incomplete",
    );
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
});

/**
 * The nightly live sweeps only reach a catalog vendor whose key the workflow
 * passes into that step's env. Three steps carry the provider key list, and
 * the JSON-validity step had kept a 37-key copy while the others grew to the
 * whole catalog; A2Agent shipped in none of them. Each step must pass every
 * catalog vendor's key (the name the runtime reads: `wire.envOverrides.apiKey`
 * or `<CONSTANT_CASE(id)>_API_KEY`), so a new catalog JSON cannot be skipped
 * by the sweeps silently.
 */
await test("live-matrix.yml passes every catalog vendor's API key to each live sweep step", async () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github", "workflows", "live-matrix.yml"),
    "utf8",
  );
  const catalogDir = path.join(process.cwd(), "src/lib/providers/catalog");
  const keys = fs
    .readdirSync(catalogDir)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .map((f) => {
      const entry = JSON.parse(
        fs.readFileSync(path.join(catalogDir, f), "utf8"),
      ) as { id: string; wire: { envOverrides?: { apiKey?: string } } };
      return (
        entry.wire.envOverrides?.apiKey ??
        `${entry.id.toUpperCase().replace(/-/g, "_")}_API_KEY`
      );
    });
  assert(keys.length > 0, "no catalog JSON files found");

  const missing: string[] = [];
  for (const script of ["test:matrix", "test:matrix:cli", "test:json-e2e"]) {
    const runLine = `run: pnpm run ${script}\n`;
    const at = workflow.indexOf(runLine);
    if (at === -1) {
      missing.push(`${script}: step not found`);
      continue;
    }
    const envAt = workflow.indexOf("env:\n", at);
    const block = workflow.slice(envAt, workflow.indexOf("\n\n", envAt));
    for (const key of keys) {
      if (!block.includes(`${key}: \${{ secrets.${key} }}`)) {
        missing.push(`${script}: ${key}`);
      }
    }
  }
  // Printed, never interpolated into the assertion message (see the
  // model-id-table case above for why).
  if (missing.length > 0) {
    console.error("  live-matrix.yml steps missing catalog keys:");
    missing.forEach((m) => console.error(`    ${m}`));
  }
  assert(
    missing.length === 0,
    `${missing.length} catalog key/step pair(s) missing from live-matrix.yml (listed above)`,
  );
});

await runSuite();
