# Provider JSON Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Tier-2 provider onboarding from ~16 hand-edited files to one schema-validated JSON file plus machine-generated code — zero hand-written src edits, zero test edits.

**Architecture:** One `src/lib/providers/catalog/<id>.json` per provider is the single source of truth. A codegen script (`tools/codegen-catalog.ts`) validates every JSON against a zod schema and machine-writes all compile-time artifacts (AIProviderName members, `<Name>Models` enums, `NeurolinkCredentials` keys, aggregation index, type unions) into marked regions / generated files. A runtime loader converts JSON entries into the existing `OpenAICompatCatalogEntry` shape, so registration is untouched. Every per-concern data table (descriptors, setup configs, context windows, pricing, vision, model choices, model manifests, validator) derives its catalog-provider entries from the loader; test suites iterate the catalog so the five hand-bumped count pins become derived assertions.

**Tech Stack:** TypeScript strict, zod (already a dependency), vite build (JSON imports already supported: `resolveJsonModule: true`, three `src/` files import JSON today).

**Spec:** `docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md` — read it first; the four approved rulings and the schema there are binding.

## Global Constraints

- Repo rule 5 (backward compat): every currently exported enum member name AND string value survives byte-identical. Task 3's public-surface snapshot is the net; it must be written from the PRE-migration dist and never regenerated afterward.
- Repo rule 7: `type` only, never `interface`. Rule 9: new type names use the `ProviderCatalog*` / `Catalog*` prefix and must be globally unique. Rule 10/12/13: types live in `src/lib/types/`, barrel uses `export *` only, runtime files never re-export types, internal type imports go through the barrel.
- Repo rule 1: registration keeps using the existing catalog loop in `providerRegistry.ts` — this plan changes what feeds `OPENAI_COMPAT_CATALOG`, never the loop.
- Repo rule 15: suites are end-to-end over `dist/`; no unit tests of the loader/codegen internals. Codegen correctness is proven by (a) the freshness check, (b) the snapshot test, (c) existing suites passing unchanged.
- Generated files are committed. `pnpm run codegen:catalog` must be idempotent (second run = byte-identical). Pre-commit and CI run codegen + `git diff --exit-code`.
- Assertion messages never quote payloads (defineSuite SKIP hazard — see CLAUDE.md).
- Final delivery is ONE commit on a `feat/` branch (repo single-commit-per-PR policy): commit per task locally, then `git reset --soft` to a single conventional commit (`refactor(providers): drive the tier-2 catalog from per-provider JSON`) before opening the PR. `docs:api` regeneration is the last pre-commit step.
- Do not touch `src/cli/factories/setupCommandFactory.ts` — its choices are already enum-derived (#1583), so codegen'd enum members flow through automatically.

---

### Task 1: Catalog types + zod schema + editor schema

**Files:**

- Create: `src/lib/types/providerCatalog.ts`
- Create: `src/lib/providers/catalog/schema.ts`
- Create: `src/lib/providers/catalog/provider-catalog.schema.json`
- Modify: `src/lib/types/index.ts` (one `export *` line)

**Interfaces:**

- Produces: `ProviderCatalogJson` (and sub-types) consumed by every later task; `parseProviderCatalogJson(raw: unknown, sourcePath: string): ProviderCatalogJson` throwing on invalid input.

- [ ] **Step 1: Write the types** in `src/lib/types/providerCatalog.ts`:

```typescript
/**
 * Single-JSON provider catalog — the authoring format for Tier-2
 * (zero-quirk OpenAI-compatible) providers. One
 * src/lib/providers/catalog/<id>.json file per provider is the single
 * source of truth; see docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md.
 */

export type CatalogPricingPerMTok = {
  input: number;
  output: number;
  cachedInput?: number;
};

export type CatalogModelStatus = "production" | "preview" | "retired";

export type CatalogModelSpec = {
  contextWindow?: number;
  maxOutputTokens?: number;
  pricingPerMTok?: CatalogPricingPerMTok;
  vision: boolean;
  status: CatalogModelStatus;
  description: string;
  /**
   * Enum member name override. Default is the derived constant-case of the
   * model id; REQUIRED where the derived name differs from a pre-existing
   * exported member (public-surface compatibility).
   */
  enumMember?: string;
};

export type CatalogWire = {
  baseURL?: string;
  baseURLTemplate?: string;
  extraCredentials?: string[];
  missingCredentialMessage?: string;
  envOverrides?: { apiKey?: string; baseURL?: string; model?: string };
};

export type CatalogErrorRuleClass =
  | "authentication"
  | "rate-limit"
  | "invalid-model"
  | "network"
  | "provider";

export type CatalogErrorRuleJson = {
  status?: number;
  pattern?: string;
  class: CatalogErrorRuleClass;
  message: string;
};

export type CatalogQuirks = {
  timeoutErrorClass?: "provider";
  registryDefaultIgnoresModelEnvVar?: boolean;
};

export type CatalogBillingPolicy =
  | "free-tier"
  | "free-with-card"
  | "no-free-tier";

export type CatalogSetup = {
  url: string;
  apiKeyFormat: string | null;
  billingPolicy: CatalogBillingPolicy;
  instructions: string[];
};

export type CatalogProbeEvidence = {
  date: string;
  status?: number;
  code?: string;
  method?: string;
};

export type CatalogEvidence = {
  rosterVerified: CatalogProbeEvidence;
  authProbe?: CatalogProbeEvidence;
  billingProbe?: CatalogProbeEvidence;
  liveMatrix: { date: string; result: string } | null;
  addedInPR: string;
};

export type CatalogCapabilities = {
  text: boolean;
  streaming: boolean;
  tools: boolean;
  toolsWithStreaming: boolean;
  structuredOutput: boolean;
  structuredOutputWithTools: boolean;
  embeddings: boolean;
  thinking: boolean;
};

export type ProviderCatalogJson = {
  /** Editor-only pointer to provider-catalog.schema.json — accepted and ignored. */
  $schema?: string;
  id: string;
  displayName: string;
  /**
   * Exported <Name>Models enum name override. Default: PascalCase(id) +
   * "Models". REQUIRED where the derived name differs from a pre-existing
   * export ("together-ai" derives "TogetherAiModels"; the legacy export is
   * "TogetherAIModels").
   */
  enumTypeName?: string;
  aliases: string[];
  tier: 2;
  wire: CatalogWire;
  models: {
    default: string;
    fallbacks: string[];
    /** Default: fallbacks[1] ?? fallbacks[0]. Set explicitly where the
     *  legacy entry differs (behavior preservation — e.g. Groq). */
    fallbackModelName?: string;
    /** Default: models.default. Set explicitly where the legacy entry's
     *  registry-level default differs (behavior preservation — Mistral's
     *  registryDefaultModel is MISTRAL_LARGE_LATEST while its defaultModel
     *  is not). Must be a models.catalog key (validated). */
    registryDefaultModel?: string;
    defaultContextWindow: number;
    defaultMaxOutputTokens: number;
    catalog: Record<string, CatalogModelSpec>;
  };
  capabilities: CatalogCapabilities;
  errorRules: CatalogErrorRuleJson[];
  quirks?: CatalogQuirks;
  setup: CatalogSetup;
  evidence: CatalogEvidence;
};
```

- [ ] **Step 2: Add the barrel line** to `src/lib/types/index.ts`: `export * from "./providerCatalog.js";` (alphabetical position with the other lines).

- [ ] **Step 3: Write the zod validator** in `src/lib/providers/catalog/schema.ts`. Mirror every field above 1:1 with `z.strictObject` (unknown keys are authoring mistakes and must fail). Cross-field refinements — each is a `.superRefine` with a message naming the offending model/field but never quoting file content:
  - `models.fallbacks` has at least one entry (the loader's `fallbackModelName` default depends on it).
  - `models.default`, every `models.fallbacks[]` entry, and `models.fallbackModelName` (when set), and `models.registryDefaultModel` (when set) must be keys of `models.catalog`.
  - `wire.extraCredentials`, when present, has EXACTLY one entry whose value matches `/^[A-Za-z_$][A-Za-z0-9_$]*$/` (it is embedded verbatim in generated credential typing) (deliberately narrow — mirrors the runtime `computedBaseURL` type; widen both together if a second computed-URL provider ever needs it).
  - `models.catalog[*].enumMember` (when set) matches `/^[A-Za-z_$][A-Za-z0-9_$]*$/`.
  - `enumTypeName` (when set) matches the same identifier pattern.
  - `wire.baseURLTemplate` (when set) must contain the literal placeholder `{<extraCredentials[0]>}` — a template without its credential placeholder emits a broken URL at runtime.
  - `wire`: exactly one of `baseURL` / `baseURLTemplate`; `extraCredentials` and `missingCredentialMessage` only with `baseURLTemplate`.
  - `id` matches `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`.
  - every `errorRules[]` entry has `status` or `pattern` (or both).
  - `pattern` values must compile: `new RegExp(pattern, "i")` inside a try/catch, failing validation on throw.
  - `evidence.rosterVerified.date` and other `date` fields match `/^\d{4}-\d{2}-\d{2}$/`.

  Export exactly one function:

```typescript
export function parseProviderCatalogJson(
  raw: unknown,
  sourcePath: string,
): ProviderCatalogJson {
  const result = providerCatalogJsonSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid provider catalog file ${sourcePath}: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}
```

Import `ProviderCatalogJson` from `../../types/index.js` (rule 13).

- [ ] **Step 4: Write `provider-catalog.schema.json`** — a plain JSON Schema (draft-07) mirroring the same shape for editor validation via each file's `$schema` field. It is documentation-grade (the zod schema is authoritative); keep the two in sync by hand and say so in a `"$comment"` at the top.

- [ ] **Step 5: `pnpm run check` and `pnpm run lint` pass. Commit** (`git add -A && git commit -m "task 1: catalog types + zod schema"`).

---

### Task 2: First two catalog JSON files (sambanova, cerebras)

**Files:**

- Create: `src/lib/providers/catalog/sambanova.json`
- Create: `src/lib/providers/catalog/cerebras.json`

**Interfaces:**

- Produces: the first two data files every later task consumes. Nothing imports them yet — this task is data-entry plus schema validation via a one-off `npx tsx` check.

- [ ] **Step 1: Write `sambanova.json`.** The spec's example shows the SHAPE (it elides six models for brevity); populate ALL SEVEN models in `models.catalog` using Task 6's extraction rules against the shipped sambanova data (`enums.ts` SambanovaModels for ids+member names, `contextWindows.ts`, `pricing.ts`, `providerImageAdapter.ts` vision list, `providerMatrix.ts` capabilities, `openaiCompatCatalog.ts` entry, `docs/provider-integration/manifests/sambanova.json` evidence). Set `"addedInPR": "https://github.com/juspay/neurolink/pull/1586"`. `models.default` and every fallback must exist in the populated catalog or the Step 3 validation fails.

- [ ] **Step 2: Write `cerebras.json`** from the live values shipped in PRs #1561/#1564/#1583 — sources: `openaiCompatCatalog.ts` cerebras entry (baseURL, default `gpt-oss-120b`, fallback `gemma-4-31b`, 401 rule pattern `wrong_api_key|Wrong API Key|invalid_api_key`, message), `contextWindows.ts` (65_536 floor — keep it, with the free/paid rationale moved to the guide), `pricing.ts` (gpt-oss-120b 0.35/0.75, gemma-4-31b 0.99/1.49), `providerConfig.ts` `createCerebrasConfig` (setup url/instructions), `docs/provider-integration/manifests/cerebras.json` (evidence: dates, PR, live-verified status → `"liveMatrix": { "date": "2026-08-27", "result": "4/4" }`), capabilities from `test/helpers/providerMatrix.ts` cerebras row. `billingPolicy: "free-with-card"`.

- [ ] **Step 3: Validate both files**:

```bash
npx tsx -e 'import { readFileSync } from "node:fs"; const { parseProviderCatalogJson } = await import("./src/lib/providers/catalog/schema.ts"); for (const f of ["sambanova","cerebras"]) { parseProviderCatalogJson(JSON.parse(readFileSync(`src/lib/providers/catalog/${f}.json`,"utf8")), f); console.log(f, "valid"); }'
```

Expected: both print `valid`. Break one field on purpose (e.g. rename `default` to `defaultModel`), confirm it throws naming the path, restore.

- [ ] **Step 4: Commit.**

---

### Task 3: Public-surface snapshot test (the compat net — BEFORE anything moves)

**Files:**

- Modify: `test/continuous-test-suite-provider-wiring.ts` (new test block at the end, before `runSuite()`)

**Interfaces:**

- Produces: a frozen literal of every catalog-provider enum's member→value map, captured from the CURRENT dist. Later tasks may not touch this block.

- [ ] **Step 1: Capture the current surface.** Run `pnpm run build`, then:

```bash
node -e 'import("./dist/constants/enums.js").then(m => { for (const n of ["GroqModels","XaiModels","TogetherAIModels","FireworksModels","PerplexityModels","MistralModels","CloudflareModels","CerebrasModels","SambanovaModels"]) console.log(n, JSON.stringify(m[n])); })'
```

- [ ] **Step 2: Write the test** — paste each captured object as a frozen literal:

```typescript
await test("catalog-provider enum surfaces are byte-identical to the pre-JSON-migration snapshot", async () => {
  const enums = await import("../dist/constants/enums.js");
  // Captured from dist on 2026-08-28, BEFORE the JSON-catalog migration.
  // If this test fails, generated enums drifted from the frozen public
  // surface — fix the codegen or the enumMember overrides, never this
  // literal.
  const frozen: Record<string, Record<string, string>> = {
    GroqModels: {
      /* paste captured */
    },
    XaiModels: {
      /* paste captured */
    },
    TogetherAIModels: {
      /* paste captured */
    },
    FireworksModels: {
      /* paste captured */
    },
    PerplexityModels: {
      /* paste captured */
    },
    MistralModels: {
      /* paste captured */
    },
    CloudflareModels: {
      /* paste captured */
    },
    CerebrasModels: {
      /* paste captured */
    },
    SambanovaModels: {
      /* paste captured */
    },
  };
  for (const [enumName, members] of Object.entries(frozen)) {
    const actual = (enums as Record<string, unknown>)[enumName] as Record<
      string,
      string
    >;
    assert(actual !== undefined, `enum missing from dist: ${enumName}`);
    for (const [member, value] of Object.entries(members)) {
      assert(
        actual[member] === value,
        `enum member drifted: ${enumName}.${member}`,
      );
    }
  }
  const providerNames = Object.values(
    (enums as { AIProviderName: Record<string, string> }).AIProviderName,
  );
  for (const id of [
    "groq",
    "xai",
    "together-ai",
    "fireworks",
    "perplexity",
    "mistral",
    "cloudflare",
    "cerebras",
    "sambanova",
  ]) {
    assert(
      providerNames.includes(id),
      `AIProviderName missing catalog id: ${id}`,
    );
  }
});
```

(The paste replaces the `/* paste captured */` comments with the real captured objects — the committed test contains only literals.)

- [ ] **Step 3: Run it** (`pnpm run test:provider-wiring` after `pnpm run build`): passes against the unmodified codebase. Break one literal value, confirm ✗ + exit 1, restore. **Commit.**

---

### Task 4: Codegen script + generated outputs + freshness enforcement

**Files:**

- Create: `tools/codegen-catalog.ts`
- Create (generated): `src/lib/providers/catalog/index.generated.ts`
- Create (generated): `src/lib/types/providerCatalog.generated.ts`
- Modify: `src/lib/constants/enums.ts` (insert marked region — content generated)
- Modify: `src/lib/types/providers.ts` (insert marked region — content generated)
- Modify: `src/lib/types/index.ts` (add `export * from "./providerCatalog.generated.js";`)
- Modify: `package.json` (`"codegen:catalog": "tsx tools/codegen-catalog.ts"`, and append `pnpm run codegen:catalog --check` to the `validate`/pre-commit chain used by `.husky/pre-commit`)
- Modify: `.github/workflows/ci.yml` (in the `test` job, after checkout+install: `pnpm run codegen:catalog && git diff --exit-code -- src/`)

**Interfaces:**

- Consumes: `parseProviderCatalogJson` (Task 1), `catalog/*.json` (Task 2).
- Produces: `CATALOG_JSON_ENTRIES: ProviderCatalogJson[]` and `CATALOG_PROVIDER_IDS: readonly string[]` from `src/lib/providers/catalog/index.generated.ts`; `CatalogProviderName` and `CatalogCredentialKey` union types from the types barrel; `AIProviderName` catalog members + `<Name>Models` enums inside the enums.ts marked region; credentials keys inside the providers.ts marked region.

- [ ] **Step 1: Write `tools/codegen-catalog.ts`.** Complete implementation:

```typescript
#!/usr/bin/env tsx
/**
 * Provider-catalog codegen. Reads src/lib/providers/catalog/*.json,
 * validates each against the zod schema, and machine-writes every
 * compile-time artifact the catalog needs:
 *   1. src/lib/providers/catalog/index.generated.ts  (aggregation index)
 *   2. src/lib/types/providerCatalog.generated.ts    (type unions)
 *   3. marked region in src/lib/constants/enums.ts   (AIProviderName members + <Name>Models enums)
 *   4. marked region in src/lib/types/providers.ts   (NeurolinkCredentials keys)
 *
 * Idempotent: a second run produces byte-identical output. `--check`
 * exits 1 (writing nothing) if any output is stale — used by pre-commit
 * and CI so generated code can never drift from the JSON.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseProviderCatalogJson } from "../src/lib/providers/catalog/schema.js";
import type { ProviderCatalogJson } from "../src/lib/types/index.js";

const CATALOG_DIR = "src/lib/providers/catalog";

const checkMode = process.argv.includes("--check");
let stale = false;

function toConstantCase(id: string): string {
  return id.toUpperCase().replace(/-/g, "_");
}
function toPascalCase(id: string): string {
  return id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
function toCamelCase(id: string): string {
  return id.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}
function toModelConstant(modelId: string): string {
  const n = modelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (n === "") return "MODEL";
  return /^[0-9]/.test(n) ? `M_${n}` : n;
}

function loadEntries(): ProviderCatalogJson[] {
  const files = readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".schema.json"))
    .sort();
  return files.map((f) => {
    const raw: unknown = JSON.parse(readFileSync(join(CATALOG_DIR, f), "utf8"));
    const entry = parseProviderCatalogJson(raw, f);
    if (`${entry.id}.json` !== f) {
      throw new Error(
        `catalog file name must match its id: ${f} vs ${entry.id}`,
      );
    }
    return entry;
  });
}

function emit(path: string, content: string): void {
  const current = ((): string | null => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  })();
  if (current === content) return;
  if (checkMode) {
    console.error(`stale generated output: ${path}`);
    stale = true;
    return;
  }
  writeFileSync(path, content);
  console.log(`wrote ${path}`);
}

function replaceRegionWith(path: string, tag: string, generated: string): void {
  const begin = `// ── BEGIN GENERATED(${tag}): provider catalog (pnpm run codegen:catalog) ──`;
  const end = `// ── END GENERATED(${tag}) ──`;
  const current = readFileSync(path, "utf8");
  const beginIdx = current.indexOf(begin);
  const endIdx = current.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(`marked region "${tag}" not found in ${path}`);
  }
  const next =
    current.slice(0, beginIdx + begin.length) +
    "\n" +
    generated +
    "\n" +
    current.slice(endIdx);
  if (next === current) return;
  if (checkMode) {
    console.error(`stale generated region "${tag}" in ${path}`);
    stale = true;
    return;
  }
  writeFileSync(path, next);
  console.log(`updated region "${tag}" in ${path}`);
}

const entries = loadEntries();

// Collision + identifier checks — fail loudly BEFORE writing any TypeScript.
{
  const seen = new Map<string, string>();
  for (const e of entries) {
    const camel = toCamelCase(e.id);
    const clash = seen.get(camel);
    if (clash) {
      throw new Error(
        `credential-key collision: ids "${clash}" and "${e.id}" both derive "${camel}"`,
      );
    }
    seen.set(camel, e.id);
    const memberSeen = new Set<string>();
    for (const [modelId, spec] of Object.entries(e.models.catalog)) {
      const member = spec.enumMember ?? toModelConstant(modelId);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(member)) {
        throw new Error(
          `invalid enum member "${member}" for ${e.id}/${modelId}`,
        );
      }
      if (memberSeen.has(member)) {
        throw new Error(
          `enum-member collision in ${e.id}: two models derive "${member}" — set enumMember on one`,
        );
      }
      memberSeen.add(member);
    }
  }
  const enumNames = new Set<string>();
  for (const e of entries) {
    const enumName = e.enumTypeName ?? `${toPascalCase(e.id)}Models`;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(enumName)) {
      throw new Error(
        `invalid enum type name "${enumName}" for provider ${e.id}`,
      );
    }
    if (enumNames.has(enumName)) {
      throw new Error(
        `enum type name collision: "${enumName}" derived twice — set enumTypeName on one provider`,
      );
    }
    enumNames.add(enumName);
  }
}

// 1. Aggregation index
const indexLines = [
  "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
  "// Source of truth: the per-provider JSON files in this directory.",
  ...entries.map(
    (e) => `import ${toCamelCase(e.id)}Json from "./${e.id}.json";`,
  ),
  'import type { ProviderCatalogJson } from "../../types/index.js";',
  "",
  "export const CATALOG_JSON_ENTRIES: ProviderCatalogJson[] = [",
  ...entries.map((e) => `  ${toCamelCase(e.id)}Json as ProviderCatalogJson,`),
  "];",
  "",
  "export const CATALOG_PROVIDER_IDS = [",
  ...entries.map((e) => `  "${e.id}",`),
  "] as const;",
  "",
];
emit(join(CATALOG_DIR, "index.generated.ts"), indexLines.join("\n"));

// 2. Type unions
const typeLines = [
  "// GENERATED FILE — do not edit. Regenerate with `pnpm run codegen:catalog`.",
  `export type CatalogProviderName = ${entries.map((e) => `"${e.id}"`).join(" | ")};`,
  `export type CatalogCredentialKey = ${entries.map((e) => `"${toCamelCase(e.id)}"`).join(" | ")};`,
  "",
];
emit("src/lib/types/providerCatalog.generated.ts", typeLines.join("\n"));

// 3. enums.ts gets TWO tagged regions: "provider-members" (inside the
// AIProviderName enum body) and "models-enums" (top level, end of file).
const providerMemberLines = entries
  .map((e) => `  ${toConstantCase(e.id)} = ${JSON.stringify(e.id)},`)
  .join("\n");
const modelsEnumBlocks = entries
  .map((e) => {
    const members = Object.entries(e.models.catalog)
      .map(
        ([modelId, spec]) =>
          `  ${spec.enumMember ?? toModelConstant(modelId)} = ${JSON.stringify(modelId)},`,
      )
      .join("\n");
    const enumName = e.enumTypeName ?? `${toPascalCase(e.id)}Models`;
    return `export enum ${enumName} {\n${members}\n}`;
  })
  .join("\n\n");
replaceRegionWith(
  "src/lib/constants/enums.ts",
  "provider-members",
  providerMemberLines,
);
replaceRegionWith(
  "src/lib/constants/enums.ts",
  "models-enums",
  modelsEnumBlocks,
);

// 4. credentials keys
const credentialLines = entries
  .map((e) => {
    const extras = (e.wire.extraCredentials ?? [])
      .map((c) => ` ${c}?: string;`)
      .join("");
    return `  ${toCamelCase(e.id)}?: { apiKey?: string; baseURL?: string;${extras} };`;
  })
  .join("\n");
replaceRegionWith("src/lib/types/providers.ts", "credentials", credentialLines);

if (checkMode && stale) {
  console.error(
    "Generated catalog output is stale. Run: pnpm run codegen:catalog",
  );
  process.exit(1);
}
console.log(
  `codegen:catalog ${checkMode ? "check passed" : "complete"} — ${entries.length} providers`,
);
```

- [ ] **Step 2: Insert the empty marked regions by hand (one time).** In `src/lib/constants/enums.ts`: the `provider-members` region goes INSIDE `AIProviderName` immediately before `AUTO = "auto",` — then delete the hand-written `CEREBRAS` and `SAMBANOVA` members (they regenerate inside the region; the other 7 legacy members are deleted in Task 6, not now). The `models-enums` region goes at the end of the file — then delete the hand-written `CerebrasModels` and `SambanovaModels` enums. In `src/lib/types/providers.ts`: the `credentials` region replaces the hand-written `cerebras?:` and `sambanova?:` lines.

- [ ] **Step 3: Run `pnpm run codegen:catalog`** — regions fill with cerebras + sambanova content. Run it again — output byte-identical (verify with `git status`). Run `pnpm run codegen:catalog --check` — exits 0. Edit `sambanova.json` (add a model), run `--check` — exits 1 with the stale-path message; revert; regenerate.

- [ ] **Step 4: `pnpm run check && pnpm run build && pnpm run test:provider-wiring`** — the Task-3 snapshot test proves CerebrasModels/SambanovaModels regenerated identically. Wire the pre-commit + CI freshness checks per the Files list. **Commit** (generated files included).

---

### Task 5: Runtime loader (JSON → `OpenAICompatCatalogEntry`)

**Files:**

- Create: `src/lib/providers/catalog/loader.ts`

**Interfaces:**

- Consumes: `CATALOG_JSON_ENTRIES` (Task 4), `DEFAULT_ERROR_RULES` + error classes.
- Produces: `buildCatalogEntries(): OpenAICompatCatalogEntry[]` and `getCatalogJsonEntries(): ProviderCatalogJson[]` — the two functions everything else consumes. Also `catalogEnvVar(id, kind)` helper.

- [ ] **Step 1: Write the loader:**

```typescript
/**
 * Converts the JSON authoring format into the runtime
 * OpenAICompatCatalogEntry shape the registry loop consumes. All
 * knowledge about deriving env vars, template interpolation and error
 * rule matching lives HERE — the JSON stays declarative.
 */
import { CATALOG_JSON_ENTRIES } from "./index.generated.js";
import { DEFAULT_ERROR_RULES } from "../../utils/errorClassifier.js";
import {
  AuthenticationError,
  RateLimitError,
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../../types/index.js";
import type {
  OpenAICompatCatalogEntry,
  ProviderCatalogJson,
  ProviderErrorRule,
  ProviderConfigOptions,
  CatalogErrorRuleClass,
} from "../../types/index.js";
import type { AIProviderName } from "../../constants/enums.js";

const ERROR_CLASS_MAP: Record<
  CatalogErrorRuleClass,
  new (message: string, provider?: string) => Error
> = {
  authentication: AuthenticationError,
  "rate-limit": RateLimitError,
  "invalid-model": InvalidModelError,
  network: NetworkError,
  provider: ProviderError,
};

export function catalogEnvVar(
  entry: ProviderCatalogJson,
  kind: "apiKey" | "baseURL" | "model",
): string {
  const override = entry.wire.envOverrides?.[kind];
  if (override) {
    return override;
  }
  const base = entry.id.toUpperCase().replace(/-/g, "_");
  return kind === "apiKey"
    ? `${base}_API_KEY`
    : kind === "baseURL"
      ? `${base}_BASE_URL`
      : `${base}_MODEL`;
}

function interpolate(
  template: string,
  entry: ProviderCatalogJson,
  modelName?: string,
): string {
  return template
    .replace(/\{apiKeyEnvVar\}/g, catalogEnvVar(entry, "apiKey"))
    .replace(/\{setupUrl\}/g, entry.setup.url)
    .replace(/\{model\}/g, modelName ?? "");
}

export function buildCatalogConfigOptions(
  entry: ProviderCatalogJson,
): ProviderConfigOptions {
  return {
    providerName: entry.displayName,
    envVarName: catalogEnvVar(entry, "apiKey"),
    setupUrl: entry.setup.url,
    description: "API key",
    instructions: entry.setup.instructions.map((line) =>
      interpolate(line, entry),
    ),
  };
}

function buildErrorRules(entry: ProviderCatalogJson): ProviderErrorRule[] {
  const bespoke: ProviderErrorRule[] = entry.errorRules.map((rule) => {
    const regex = rule.pattern ? new RegExp(rule.pattern, "i") : undefined;
    return {
      match: (ctx) =>
        (rule.status !== undefined && ctx.statusCode === rule.status) ||
        (regex !== undefined && regex.test(ctx.message)),
      errorClass: ERROR_CLASS_MAP[rule.class],
      message: rule.message.includes("{model}")
        ? (ctx) => interpolate(rule.message, entry, ctx.modelName)
        : interpolate(rule.message, entry),
    };
  });
  return [...bespoke, ...DEFAULT_ERROR_RULES];
}

export function getCatalogJsonEntries(): ProviderCatalogJson[] {
  return CATALOG_JSON_ENTRIES;
}

export function buildCatalogEntries(): OpenAICompatCatalogEntry[] {
  return CATALOG_JSON_ENTRIES.map((entry) => {
    const base: OpenAICompatCatalogEntry = {
      providerName: entry.id as AIProviderName,
      aliases: [entry.id, ...entry.aliases],
      apiKeyEnvVar: catalogEnvVar(entry, "apiKey"),
      configOptions: buildCatalogConfigOptions(entry),
      modelEnvVar: catalogEnvVar(entry, "model"),
      defaultModel: entry.models.default,
      registryDefaultModel:
        entry.models.registryDefaultModel ?? entry.models.default,
      registryDefaultModelChecksEnvVar:
        entry.quirks?.registryDefaultIgnoresModelEnvVar !== true,
      fallbackModelName:
        entry.models.fallbackModelName ??
        entry.models.fallbacks[1] ??
        entry.models.fallbacks[0],
      fallbackModels: [...entry.models.fallbacks],
      errorRules: buildErrorRules(entry),
    };
    if (entry.wire.baseURLTemplate) {
      // Schema constrains extraCredentials to exactly one entry (Task 1) —
      // [0] is the whole list by construction, mirroring the deliberately
      // accountId-shaped runtime computedBaseURL type.
      const extra = entry.wire.extraCredentials?.[0] ?? "accountId";
      base.computedBaseURL = {
        envVar: `${entry.id.toUpperCase().replace(/-/g, "_")}_${extra.replace(/([A-Z])/g, "_$1").toUpperCase()}`,
        missingValueMessage:
          entry.wire.missingCredentialMessage ??
          `Missing ${extra} for ${entry.displayName}`,
        build: (value: string) =>
          entry.wire.baseURLTemplate!.replace(`{${extra}}`, value),
      };
    } else {
      base.baseURLEnvVar = catalogEnvVar(entry, "baseURL");
      base.defaultBaseURL = entry.wire.baseURL;
    }
    if (entry.quirks?.timeoutErrorClass === "provider") {
      base.timeoutErrorClass = ProviderError;
    }
    return base;
  });
}
```

Adjust the `computedBaseURL.envVar` derivation against Cloudflare's real current value (`CLOUDFLARE_ACCOUNT_ID`) when migrating it in Task 6 — the current entry in `openaiCompatCatalog.ts` is the authority; if the generic derivation doesn't produce it exactly, add `wire.envOverrides`-style explicit field `wire.extraCredentialEnvVar` to the schema instead of guessing.

- [ ] **Step 2: `pnpm run check` passes** (nothing consumes the loader yet). Sanity-run:

```bash
npx tsx -e 'const { buildCatalogEntries } = await import("./src/lib/providers/catalog/loader.ts"); console.log(buildCatalogEntries().map(e => e.providerName));'
```

Expected: `[ "cerebras", "sambanova" ]`. **Commit.**

---

### Task 6: Migrate the 7 legacy catalog providers to JSON

**Files:**

- Create: `src/lib/providers/catalog/{groq,xai,together-ai,fireworks,perplexity,mistral,cloudflare}.json`
- Modify (generated regions only, via codegen): `enums.ts`, `types/providers.ts`
- Modify: `src/lib/constants/enums.ts` — delete the 7 hand-written `AIProviderName` members and the 7 hand-written `<Name>Models` enums (they regenerate inside the marked regions)
- Modify: `src/lib/types/providers.ts` — delete the 7 hand-written credential slices

**Interfaces:**

- Consumes: the existing hand-written data — extraction sources per provider are: its `openaiCompatCatalog.ts` entry (wire, models default/fallbacks, error rules, quirks), its `<Name>Models` enum in `enums.ts` (full model roster + member names), `contextWindows.ts`, `pricing.ts`, `providerConfig.ts` factory (setup), `providerImageAdapter.ts` (vision), `test/helpers/providerMatrix.ts` (capabilities), `docs/provider-integration/manifests/*.json` where one exists (evidence).
- Produces: 9 total JSON files; the generated enums must satisfy the Task-3 snapshot.

- [ ] **Step 1: For each of the 7 providers, transcribe every field.** Rules that make this mechanical, not judgment:
  - Every member of the existing `<Name>Models` enum becomes a `models.catalog` key (the STRING VALUE is the key; the MEMBER NAME goes into `enumMember` whenever the derived constant differs — run both through `toModelConstant` and compare; e.g. Groq `GEMMA_2_9B_IT = "gemma2-9b-it"` derives to `GEMMA2_9B_IT`, so `"enumMember": "GEMMA_2_9B_IT"` is required).
  - `contextWindow`/`pricingPerMTok` copy from `contextWindows.ts`/`pricing.ts` where a per-model entry exists; omit the optional field otherwise (provider `defaultContextWindow` = the `_default`). NEVER invent a number a shipped file doesn't state.
  - `vision: true` exactly for the models listed in `VISION_CAPABILITIES`.
  - `errorRules`: each existing `match` function decomposes into `status` (the `ctx.statusCode === N` clause) + `pattern` (the regex source). Groq's decommissioned rule keeps its dynamic message via the `{model}` template. Groq gets `"quirks": { "timeoutErrorClass": "provider" }`; Mistral gets `"quirks": { "registryDefaultIgnoresModelEnvVar": true }`.
  - Compare each provider's derived enum type name (`PascalCase(id) + "Models"`) against the existing export; where it differs, set `enumTypeName` — among the 9, only together-ai needs it (`"enumTypeName": "TogetherAIModels"`).
  - Compare the legacy entry's `fallbackModelName` against `fallbacks[1] ?? fallbacks[0]`; where it differs, set `models.fallbackModelName` explicitly (behavior preservation).
  - Compare the legacy entry's `registryDefaultModel` against its `defaultModel`; where it differs (Mistral: MISTRAL_LARGE_LATEST), set `models.registryDefaultModel` explicitly.
  - Cloudflare uses `baseURLTemplate` + `extraCredentials: ["accountId"]` + the existing `missingValueMessage`.
  - `status`: `"production"` unless the current description/comment says preview/retired.
  - `evidence`: legacy providers get `{"rosterVerified": {"date": "2026-08-28", "method": "transcribed from pre-migration TS catalog"}, "liveMatrix": null, "addedInPR": "<this plan's PR>"}` — honest provenance, upgradable later.
  - `capabilities` copy from the provider's `providerMatrix.ts` row.
- [ ] **Step 2: `pnpm run codegen:catalog`**, then delete the 7 hand-written members/enums/slices listed under Files.
- [ ] **Step 3: `pnpm run check && pnpm run build && pnpm run test:provider-wiring`** — the Task-3 snapshot test is the merge gate for this task: any member-name or value drift fails there. Fix via `enumMember` overrides only.
- [ ] **Step 4: Commit.**

---

### Task 7: Switch the catalog + derive per-concern src consumers

**Files:**

- Modify: `src/lib/providers/openaiCompatCatalog.ts` — becomes `export const OPENAI_COMPAT_CATALOG: readonly OpenAICompatCatalogEntry[] = buildCatalogEntries();` plus the header comment; delete the 9 hand entries and now-unused imports.
- Modify: `src/lib/utils/providerConfig.ts` — the 9 `create<Name>Config()` bodies become one-line delegations (keep the exported names for compat): `export function createGroqConfig(): ProviderConfigOptions { return catalogConfigOptions("groq"); }` where `catalogConfigOptions(id)` looks up the JSON entry and calls `buildCatalogConfigOptions`.
- Modify: `src/lib/factories/providerDescriptors.ts` — delete the 9 catalog descriptors; `export const PROVIDER_DESCRIPTORS = [...HAND_DESCRIPTORS, ...buildCatalogDescriptors()]` where the builder maps JSON → descriptor (`name: id`, `aliases`, `credentialsKey: camel(id)`, `envVars` from `catalogEnvVar`, `defaultModel: models.default`, `toolSupport` = `capabilities.tools ? "native" : <the ProviderDescriptor toolSupport union's unsupported member — read the union in src/lib/types, do not invent a value>` (all 9 current providers have tools:true, so runtime-identical today), `localRuntime: false`, `healthCheck: "env-only"`, `setupUrl`, `apiKeyFormatPattern` from `setup.apiKeyFormat` when non-null).
- Modify: `src/cli/commands/setup.ts` — delete the 9 entries from `EXTRA_PROVIDER_CONFIGS`; spread `...Object.fromEntries(getCatalogJsonEntries().map((e) => [e.id, buildCatalogConfigOptions(e)]))`.
- Modify: `src/lib/constants/contextWindows.ts` — delete the 9 catalog blocks; spread derived blocks built from `models.catalog[*].contextWindow` + `defaultContextWindow`.
- Modify: `src/lib/utils/pricing.ts` — same pattern for `pricingPerMTok` (+ the alias map entries derive from ids).
- Modify: `src/lib/adapters/providerImageAdapter.ts` — delete catalog vision entries; derive `{[id]: modelsWithVision}` for entries with ≥1 vision model.
- Modify: `src/lib/utils/modelChoices.ts` — delete the 9 catalog blocks from both tables. Table types become `Record<Exclude<AIProviderName, CatalogProviderName>, …>` for the hand part (full compile-time exhaustiveness preserved for non-catalog providers), with catalog entries derived from `models.catalog[*].description` and merged in the accessor functions.
- Modify: `src/lib/models/manifestRegistry.ts` + delete `src/lib/models/manifests/{cerebras,sambanova}.ts` — catalog manifests derive from `models.catalog` (contextWindow/maxOutputTokens/vision) with `functionCalling: entry.capabilities.tools` — never hardcoded.
- Modify: `tools/testing/providerValidator.ts` — roster/keyMappings/builtin-set/connectivity cases derive from `CATALOG_PROVIDER_IDS`.

**Interfaces:**

- Consumes: Task 5 loader, Task 4 `CatalogProviderName`.
- Produces: identical runtime behavior — proven by the existing suites, not new ones.

- [ ] **Step 1** Apply the edits above, smallest file first, running `pnpm run check` after each.
- [ ] **Step 2** `pnpm run build`, then the full existing gate set — all must pass UNCHANGED (that is the point):

```bash
npx tsx test/continuous-test-suite-providers-mocked.ts   # 73/73
npx tsx test/continuous-test-suite-provider-wiring.ts    # incl. snapshot
npx tsx test/continuous-test-suite-provider-descriptors.ts
pnpm run test:provider-structure
pnpm run test:error-classifier-contract
pnpm run verify:provider-onboarding
node dist/cli/index.js generate "hi" --provider cerebras   # live smoke (key in .env)
```

- [ ] **Step 3: Commit.**

---

### Task 8: Data-driven tests (zero test edits per future provider)

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` — `OPENAI_COMPAT_PROVIDERS` derives: for each dist catalog JSON entry build `{provider: id, envVar, urlMatch: new URL(baseURL or template-with-dummy).host + "/…/chat/completions" path, authPrefix: "Bearer ", model: models.default, authErrorMatch, rateLimitErrorMatch}`. `authErrorMatch` = `new RegExp(id + "|401|unauthor|api key", "i")` (the invariant the suite actually asserts); import the entries from `../dist/providers/catalog/index.generated.js` (all-dist, rule 15). Cloudflare keeps its existing bespoke handling if its computed URL doesn't fit the generic builder — preserve current coverage, never reduce it.
- Modify: `test/helpers/providerMatrix.ts` — delete the 9 catalog rows; spread derived rows: capabilities from JSON `capabilities` + `vision` derived + `defaultModel` + `envVars: [apiKeyEnvVar]` — computed-URL providers additionally include their `computedBaseURL.envVar` (Cloudflare: CLOUDFLARE_ACCOUNT_ID) so the matrix skips rather than runs an unconstructible provider. Rows import from dist index (test helper — dist graph).
- Modify: `test/continuous-test-suite-provider-wiring.ts` — `KNOWN_CREDENTIAL_KEYS` keeps hand keys for non-catalog providers typed as `satisfies Record<Exclude<keyof NeurolinkCredentials, CatalogCredentialKey>, undefined>`; the runtime set unions `CATALOG_PROVIDER_IDS` camelized. The wizard-count and provider-count assertions compute expected values from `CATALOG_PROVIDER_IDS.length` + named literals for the non-catalog roster (which changes rarely and intentionally).
- Modify: `test/continuous-test-suite-provider-descriptors.ts` — `getAllDescriptors` expected length = non-catalog literal + `CATALOG_PROVIDER_IDS.length`; `apiKeyFormatPattern`-absent expectation derives from the JSON `setup.apiKeyFormat` null-count.
- Modify: `tools/verify-provider-onboarding.ts` — the gate for a new `AIProviderName` member becomes: a `catalog/<id>.json` exists, parses against the schema, and `evidence.rosterVerified` + `evidence.addedInPR` are present. Delete the docs-manifest requirement; delete `docs/provider-integration/manifests/` (its two files' content now lives in `evidence`).

- [ ] **Step 1** Apply, run every touched suite, expected: same totals as Task 7.
- [ ] **Step 2: Break-one-assertion ritual** — delete `sambanova.json`'s `evidence.rosterVerified`, run `pnpm run verify:provider-onboarding` → non-zero; restore. Set one derived matrix capability wrong via a temporary JSON edit, then `pnpm run codegen:catalog && pnpm run build` (the suites import the CATALOG FROM DIST — running them against a stale build silently tests the old data), and run the MATRIX runner for a provider with keys in .env → the corresponding test must ✗ non-zero (not ⊘); the mocked-suite half of the ritual instead breaks a derived spec field (e.g. the urlMatch host) and confirms ✗. Restore, regenerate, rebuild. Note the independence boundary: derived expectations prove wiring, not data — the DATA's truth is anchored by the evidence fields (live probes), which verify:provider-onboarding requires.
- [ ] **Step 3: Commit.**

---

### Task 9: Tooling + docs alignment

**Files:**

- Modify: `tools/scaffold-provider.ts` — Tier 2 now emits exactly TWO artifacts: `<id>.json` (pre-filled from flags, with TODO evidence fields) and `MANUAL-CHECKLIST.md` reduced to: live probes (roster/auth/billing), fill the JSON, `pnpm run codegen:catalog`, run gates, live matrix. Delete the now-dead tier-2 snippet generators (catalog-entry/descriptor/provider-config/models-enum/mocked-section snippets); Tier 3/4 paths keep theirs.
- Modify: `docs/provider-integration/tiers/tier-2-catalog-entry.md` — rewrite: files-touched table becomes ONE row (`catalog/<id>.json`) + "generated automatically" note; Count-pins section becomes "derived — nothing to bump"; keep the Live-verification section unchanged.
- Modify: `docs/provider-integration/openai-compat-catalog.md` — describe the JSON format, link the spec.
- Modify: `CLAUDE.md` — "Adding a New Provider" how-to gains the Tier-2 fast path (one JSON + codegen), and the Key Files table adds `src/lib/providers/catalog/`.

- [ ] **Step 1** Apply; dummy-run the scaffold for tier 2 and tier 3, verify outputs.
- [ ] **Step 2: Commit.**

---

### Task 10: Final gates + single-commit packaging

- [ ] **Step 1:** Full sweep: `pnpm run check && pnpm run check:tools-tests && pnpm run lint && pnpm run build && pnpm test` plus every suite from Task 7 Step 2, plus `pnpm run codegen:catalog --check`.
- [ ] **Step 2:** Live smokes with the keys in `.env`: cerebras generate + stream via CLI; sambanova expected-402 friendly error via CLI (or live matrix if credits exist by then).
- [ ] **Step 3:** `pnpm run docs:api` + `pnpm run format` (last pre-commit step).
- [ ] **Step 4:** Squash to one commit: `git reset --soft $(git merge-base HEAD origin/release) && git commit -m "refactor(providers): drive the tier-2 catalog from per-provider JSON"` with a body summarizing spec rulings + the 16→1 file collapse. Push, open PR, merge under the full condition with the hard thread gate.
