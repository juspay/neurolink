#!/usr/bin/env tsx
/**
 * Provider Onboarding Completeness gate.
 *
 * For every AIProviderName member NOT in LEGACY_PROVIDERS (i.e. every
 * provider added after this gate existed), asserts the five required
 * onboarding artifacts landed together:
 *   1. A ProviderDescriptor entry (PROVIDER_DESCRIPTORS)
 *   2. Either an OpenAICompatCatalogEntry OR a concrete, registered
 *      provider class (catalog-or-class)
 *   3. A mocked-contract test section in
 *      test/continuous-test-suite-providers-mocked.ts — matched with
 *      comments stripped first (see isMockedSectionSatisfied in
 *      provider-onboarding-marker.ts), so a scaffold placeholder that only
 *      *describes* the marker in a comment does not satisfy this check.
 *   4. A manifest file at docs/provider-integration/manifests/<name>.json
 *      (with tier4Justification present when tier === 4)
 *   5. A capability entry in test/helpers/providerMatrix.ts — the file that
 *      test:matrix, test:providers and test/helpers/skipIf.ts all read. Its
 *      own header calls itself "the single source of truth for what each of
 *      NeuroLink's providers supports" and lists "add an entry" as step 1 of
 *      onboarding, but nothing enforced it: cerebras shipped in #1561 and the
 *      capability sweep simply did not cover it.
 *
 * Zero network I/O, zero API keys, source-only — does not require
 * `pnpm run build` first (see docs/provider-integration/tiers/README.md
 * and this repo's tools/README notes on why: PROVIDER_DESCRIPTORS and
 * OPENAI_COMPAT_CATALOG are pure-data modules, safe to import directly
 * from src/ via tsx's on-the-fly TS loader — the same mechanism
 * src/lib/factories/providerRegistry.ts already relies on for every
 * provider's dynamic import).
 *
 * Run with: pnpm run verify:provider-onboarding
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMockedSectionSatisfied } from "./provider-onboarding-marker.js";

const REPO_ROOT = process.cwd();

// Snapshot of AIProviderName members that predate this gate (August
// 2026). The gate does NOT retroactively require manifests/mocked
// sections for these — see ADR-0003 and the manifests/README.md ratchet
// note. Do not add to this list; it's a frozen baseline, not a way to
// exempt a new provider from the gate.
const LEGACY_PROVIDERS: ReadonlySet<string> = new Set([
  "bedrock",
  "openai",
  "openai-compatible",
  "openrouter",
  "vertex",
  "anthropic",
  "azure",
  "google-ai",
  "huggingface",
  "ollama",
  "mistral",
  "litellm",
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
  "replicate",
  "voyage",
  "jina",
  "stability",
  "ideogram",
  "recraft",
]);

type ProviderManifest = {
  provider: string;
  tier: 1 | 2 | 3 | 4;
  addedDate: string;
  mockedContractSection: string;
  tier4Justification?: string;
};

type CheckResult = { provider: string; ok: boolean; problems: string[] };

async function loadEnumMemberMap(): Promise<Readonly<Record<string, string>>> {
  const mod = (await import("../src/lib/constants/enums.js")) as {
    AIProviderName: Record<string, string>;
  };
  return mod.AIProviderName;
}

function loadEnumMembers(
  enumMemberMap: Readonly<Record<string, string>>,
): ReadonlySet<string> {
  return new Set(Object.values(enumMemberMap).filter((v) => v !== "auto"));
}

async function loadDescriptors(): Promise<ReadonlySet<string>> {
  const mod = (await import("../src/lib/factories/providerDescriptors.js")) as {
    PROVIDER_DESCRIPTORS: ReadonlyArray<{ name: string }>;
  };
  return new Set(mod.PROVIDER_DESCRIPTORS.map((d) => d.name));
}

/**
 * Providers that predate this check and have no providerMatrix entry.
 *
 * Exactly one today: cerebras, which shipped in #1561 without an entry. PR
 * #1564 adds it — remove this line when that lands, and the set becomes empty.
 *
 * A name listed here that HAS an entry produces a warning, not an error.
 * Making it fatal would red-line every open pull request the moment someone
 * closed a gap, which is the kind of self-inflicted CI outage this repo has
 * already paid for once. The warning exists so the list cannot quietly rot —
 * it earned its keep immediately: the first version of this set listed five
 * more names, drawn from a scan whose regex did not allow quoted keys, and
 * the note flagged all five as already present on the first run.
 */
const KNOWN_MATRIX_GAPS: ReadonlySet<string> = new Set(["cerebras"]);

/**
 * Read the provider keys out of test/helpers/providerMatrix.ts.
 *
 * Parsed from source rather than imported: the module pulls in test helpers,
 * and this gate is deliberately source-only with zero network I/O so it can
 * run without a build.
 *
 * Scanning is bounded to the `export const PROVIDERS` initializer, not the
 * whole file. An earlier version matched any two-space-indented `key: {`
 * anywhere, which a decoy proved unsafe: appending
 *
 *   export const UNRELATED_LOOKUP: Record<string, { note: string }> = {
 *     cerebras: { note: "..." },
 *   };
 *
 * made the gate report that cerebras had a matrix entry when it did not — a
 * false pass on the exact condition this check exists to catch. Any object
 * literal, or a matching line inside a block comment, could have done the same.
 *
 * Not finding the record is treated as a read error rather than an empty set,
 * because "no providers found" and "the file moved" must not look alike here.
 */
function loadProviderMatrixNames(): {
  names: ReadonlySet<string>;
  readError?: string;
} {
  const path = join(REPO_ROOT, "test/helpers/providerMatrix.ts");
  let src: string;
  try {
    src = readFileSync(path, "utf8");
  } catch (err: unknown) {
    return {
      names: new Set(),
      readError: err instanceof Error ? err.message : String(err),
    };
  }
  const lines = src.split("\n");
  const start = lines.findIndex((line) =>
    /^export const PROVIDERS\b/.test(line),
  );
  if (start === -1) {
    return {
      names: new Set(),
      readError:
        "no `export const PROVIDERS` declaration in test/helpers/providerMatrix.ts",
    };
  }
  const names = new Set<string>();
  for (let i = start + 1; i < lines.length; i += 1) {
    // The record's own closing brace, at column 0. Entries are indented, so
    // this cannot be one of them.
    if (/^\};/.test(lines[i])) {
      return { names };
    }
    const match = /^ {2}"?([a-zA-Z0-9_-]+)"?:\s*\{/.exec(lines[i]);
    if (match) {
      names.add(match[1]);
    }
  }
  return {
    names: new Set(),
    readError:
      "`export const PROVIDERS` in test/helpers/providerMatrix.ts is never closed at column 0",
  };
}

async function loadCatalog(): Promise<ReadonlySet<string>> {
  // The field is `providerName`, not `provider`. Reading `.provider` yielded
  // undefined for every row, so this Set was {undefined} and the catalog half
  // of the catalog-or-class check below never matched anything — the gate has
  // been resting entirely on nativeClasses since it was written.
  //
  // Import the real type instead of re-declaring a structural shape. The old
  // local `{ provider: string }` cast is exactly what hid the mistake: it
  // asserted a field that does not exist, and tools/ is excluded from
  // tsconfig, so nothing ever typechecked the assertion.
  const mod = await import("../src/lib/providers/openaiCompatCatalog.js");
  return new Set(mod.OPENAI_COMPAT_CATALOG.map((c) => String(c.providerName)));
}

function loadNativeProviderNames(
  enumMemberMap: Readonly<Record<string, string>>,
): ReadonlySet<string> {
  // Every AIProviderName that has its own registerProvider() block whose
  // dynamic-import target is a real file (or folder/index.ts) in
  // src/lib/providers/ counts as "catalog-or-class" covered even without
  // a catalog row (Tier 3/4).
  //
  // The registry pairs a *kebab-case* enum value (AIProviderName.<MEMBER>)
  // with a *camelCase* import path (e.g. AIProviderName.OPENAI_COMPATIBLE
  // = "openai-compatible" imports "../providers/openaiCompatible.js";
  // AIProviderName.NVIDIA_NIM = "nvidia-nim" imports
  // "../providers/nvidiaNim/index.js"). Comparing the raw file basename
  // to the provider identity string never matches, so instead: split the
  // registry source into one chunk per registerProvider() call, resolve
  // each chunk's own <MEMBER> to its real enum value via enumMemberMap,
  // and pair it with that same chunk's own import target (not a
  // file-basename lookup against the whole file's enum-value set).
  const registrySource = readFileSync(
    join(REPO_ROOT, "src/lib/factories/providerRegistry.ts"),
    "utf8",
  );
  const providersDir = join(REPO_ROOT, "src/lib/providers");
  const entries = readdirSync(providersDir, { withFileTypes: true });
  const flatFiles = new Set(
    entries
      .filter((e) => e.isFile() && e.name.endsWith(".ts"))
      .map((e) => e.name.replace(/\.ts$/, "")),
  );
  const folders = new Set(
    entries
      .filter(
        (e) =>
          e.isDirectory() && existsSync(join(providersDir, e.name, "index.ts")),
      )
      .map((e) => e.name),
  );

  const memberRe = /AIProviderName\.(\w+)/;
  // Matches both flat `providers/<name>.js` and folder
  // `providers/<name>/index.js` import forms.
  const importRe =
    /await import\("\.\.\/providers\/([\w-]+)(?:\/index)?\.js"\)/;
  const blocks = registrySource.split(
    /(?=ProviderFactory\.registerProvider\()/,
  );

  const covered = new Set<string>();
  for (const block of blocks) {
    const memberMatch = memberRe.exec(block);
    const importMatch = importRe.exec(block);
    if (!memberMatch || !importMatch) {
      continue;
    }
    const base = importMatch[1];
    if (!flatFiles.has(base) && !folders.has(base)) {
      continue;
    }
    const value = enumMemberMap[memberMatch[1]];
    if (value) {
      covered.add(value);
    }
  }
  return covered;
}

type MockedSectionCheck = { found: boolean; readError?: string };

function checkMockedSection(provider: string): MockedSectionCheck {
  let source: string;
  try {
    source = readFileSync(
      join(REPO_ROOT, "test/continuous-test-suite-providers-mocked.ts"),
      "utf8",
    );
  } catch (err) {
    return {
      found: false,
      readError: err instanceof Error ? err.message : String(err),
    };
  }
  return { found: isMockedSectionSatisfied(source, provider) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ManifestCheck = { manifest: ProviderManifest | null; problem?: string };

function loadManifest(provider: string): ManifestCheck {
  const path = join(
    REPO_ROOT,
    "docs/provider-integration/manifests",
    `${provider}.json`,
  );
  if (!existsSync(path)) {
    return { manifest: null };
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    return {
      manifest: null,
      problem: `could not read manifest: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      manifest: null,
      problem: `manifest is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!isRecord(parsed)) {
    return { manifest: null, problem: "manifest is not a JSON object" };
  }
  if (
    typeof parsed.provider !== "string" ||
    typeof parsed.tier !== "number" ||
    typeof parsed.addedDate !== "string" ||
    typeof parsed.mockedContractSection !== "string"
  ) {
    return {
      manifest: null,
      problem:
        "manifest missing required field(s) (provider, tier, addedDate, mockedContractSection)",
    };
  }
  if (parsed.provider !== provider) {
    return {
      manifest: null,
      problem: `manifest "provider" field is "${parsed.provider}", expected "${provider}" (manifest copied from another provider?)`,
    };
  }
  if (!Number.isInteger(parsed.tier) || parsed.tier < 1 || parsed.tier > 4) {
    return {
      manifest: null,
      problem: `manifest "tier" must be an integer 1-4 (got ${JSON.stringify(parsed.tier)})`,
    };
  }

  const manifest: ProviderManifest = {
    provider: parsed.provider,
    tier: parsed.tier as 1 | 2 | 3 | 4,
    addedDate: parsed.addedDate,
    mockedContractSection: parsed.mockedContractSection,
    ...(typeof parsed.tier4Justification === "string"
      ? { tier4Justification: parsed.tier4Justification }
      : {}),
  };
  return { manifest };
}

async function main(): Promise<void> {
  const enumMemberMap = await loadEnumMemberMap();
  const [descriptors, catalog] = await Promise.all([
    loadDescriptors(),
    loadCatalog(),
  ]);
  const enumMembers = loadEnumMembers(enumMemberMap);
  const nativeClasses = loadNativeProviderNames(enumMemberMap);
  const providerMatrix = loadProviderMatrixNames();

  const results: CheckResult[] = [];
  for (const provider of [...enumMembers].sort()) {
    if (LEGACY_PROVIDERS.has(provider)) {
      continue;
    }
    const problems: string[] = [];
    if (!descriptors.has(provider)) {
      problems.push("missing ProviderDescriptor entry (PROVIDER_DESCRIPTORS)");
    }
    if (!catalog.has(provider) && !nativeClasses.has(provider)) {
      problems.push(
        "no OpenAICompatCatalogEntry and no registered provider class (catalog-or-class)",
      );
    }
    const mockedSection = checkMockedSection(provider);
    if (mockedSection.readError) {
      problems.push(
        `could not read test/continuous-test-suite-providers-mocked.ts: ${mockedSection.readError}`,
      );
    } else if (!mockedSection.found) {
      problems.push(
        "no mocked-contract section in continuous-test-suite-providers-mocked.ts",
      );
    }
    if (providerMatrix.readError) {
      problems.push(
        `could not read test/helpers/providerMatrix.ts: ${providerMatrix.readError}`,
      );
    } else if (
      !providerMatrix.names.has(provider) &&
      !KNOWN_MATRIX_GAPS.has(provider)
    ) {
      problems.push(
        "no capability entry in test/helpers/providerMatrix.ts (test:matrix, test:providers and skipIf all read it, so the provider is invisible to the capability sweep)",
      );
    }
    const { manifest, problem: manifestProblem } = loadManifest(provider);
    if (!manifest) {
      problems.push(
        manifestProblem ??
          `missing/invalid manifest at docs/provider-integration/manifests/${provider}.json`,
      );
    } else if (manifest.tier === 4 && !manifest.tier4Justification) {
      problems.push("tier-4 manifest missing tier4Justification");
    }
    results.push({ provider, ok: problems.length === 0, problems });
  }

  // A gap that has been closed should not stay on the list. This is a warning,
  // not a failure: turning it fatal would red-line every open pull request the
  // moment someone did the right thing, and a stale list is a hygiene problem
  // rather than a correctness one.
  const closedGaps = [...KNOWN_MATRIX_GAPS]
    .filter((name) => providerMatrix.names.has(name))
    .sort();
  if (closedGaps.length > 0) {
    console.log(
      "\nNote: these now have providerMatrix entries and can be dropped from " +
        `KNOWN_MATRIX_GAPS in tools/verify-provider-onboarding.ts: ${closedGaps.join(", ")}`,
    );
  }

  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.provider}`);
    for (const p of r.problems) {
      console.log(`    - ${p}`);
    }
  }
  if (results.length === 0) {
    console.log("No new (post-legacy) providers to check.");
  } else {
    console.log(
      `\n${results.length - failures.length}/${results.length} new providers fully onboarded.`,
    );
  }
  if (failures.length > 0) {
    console.error(
      `\nProvider Onboarding Completeness FAILED for: ${failures.map((f) => f.provider).join(", ")}`,
    );
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("verify-provider-onboarding crashed:", err);
  process.exit(1);
});
