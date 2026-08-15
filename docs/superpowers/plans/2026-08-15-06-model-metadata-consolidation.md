# Model Metadata Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NeuroLink's five independently-maintained, disagreeing model-metadata stores (`MODEL_REGISTRY`, `MODEL_CONTEXT_WINDOWS`, the private `PRICING` table, the private `VISION_CAPABILITIES` table, and `PROVIDER_MAX_TOKENS`) with one per-provider model manifest that all five read from, while preserving every existing public function signature.

**Architecture:** A new canonical type `ProviderModelManifest` (in `src/lib/types/model.ts`) describes, per provider, a `defaultContextWindow`, optional `familyRules` (regex-driven patches for unlisted gateway-shaped ids — the same pattern `VISION_FAMILY_RULES`/`SAMPLING_PARAM_REJECTING_FAMILIES` already use independently), and a `models` map keyed by canonical model id. One file per provider under `src/lib/models/manifests/<provider>.ts` exports its manifest as pure, dependency-free data; `src/lib/models/manifestRegistry.ts` statically imports all 30 and exposes `resolveManifestEntry()` / `resolveManifestEntryExact()` lookup functions implementing the longest-prefix-match cascade `pricing.ts`'s `findRates()` already pioneered. The five existing stores are migrated one at a time to compute their exported values from the manifest at module-init or call time, with their public signatures byte-identical to today.

**Tech Stack:** TypeScript (strict mode, no `interface`, named exports only), no new runtime dependencies — manifests are plain object literals imported statically (they carry no heavy provider SDKs, so Critical Rule 1's dynamic-import mandate for `providerRegistry.ts` factories does not apply here).

**Spec:**

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/gap2-model-metadata-subsystem-model-registry-modelresol.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/06-message-building-multimodal-adaptation-how-user-in.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts` + `test:<name>` scripts.
- TEST HARNESS SKIP HAZARD: NEVER interpolate payloads into assertion messages; break-one-assertion sanity step for new suites.
- Repo rules: ALL types in src/lib/types/; no `interface`; unique exported type names; types barrel `export *` only; barrel-only internal type imports; no double assertions; named exports only. EVERY existing public function signature preserved (getContextWindowSize, findRates, calculateCost, supportsVision, getSafeMaxTokens, resolveClaudeMaxTokens, ModelResolver.\*, modelRegistry helpers) — consumers must not change.
- Conventional commits; commit per task; NEVER `git push`.
- Related contract (plan 04, separate concern): ProviderDescriptor in src/lib/factories/providerDescriptors.ts covers provider-level identity/env — your manifest is MODEL-level; do not duplicate provider-level fields.

---

## Task 1: Manifest types

**Files:**

- Modify: `src/lib/types/model.ts:271` (append after the existing type block; do not touch anything above line 271)
- Test: none (pure type addition — verified by `pnpm run check` in the final step)

**Interfaces:**

- Consumes: nothing (foundational task)
- Produces: `ProviderModelManifestEntry`, `ManifestFamilyRule`, `ProviderModelManifest` — the three types every later task imports from `../types/index.js`.

The manifest's `pricingPerMTok` is deliberately **optional**. Some real, current models (e.g. `claude-sonnet-5`) have no verified price in any existing store — `pricing.ts`'s own `PRICING.anthropic` table has no entry for it today. Leaving the field absent is honest; inventing a number is not. This has a direct, load-bearing consequence for Task 9: `ModelInfo.pricing: ModelPricingInfo` (`src/lib/types/model.ts:184`) has three **required** (non-optional) numeric fields (`inputCostPer1K`, `outputCostPer1K`, `currency`) — confirmed by reading `src/lib/types/model.ts:137-141`. Task 9's registry builder resolves this by only ever promoting manifest entries that **do** carry `pricingPerMTok` into the rebuilt `MODEL_REGISTRY` — see Task 9's design note for the full reasoning.

The manifest also carries an optional `curated` block for `ModelInfo.performance`/`.useCases`/`.category`. These three fields are today hand-tuned per model in `MODEL_REGISTRY` (`src/lib/models/modelRegistry.ts`) — there is no mechanical source for them anywhere else (not in `MODEL_CONTEXT_WINDOWS`, not in `PRICING`, not in `VISION_CAPABILITIES`). For the 25 ids that already have a `MODEL_REGISTRY` entry today (5 Anthropic, 20 OpenAI), Task 9 must reproduce those exact values byte-for-byte, or its own "exact old output preserved" equality test would be false for `performance`/`useCases`/`category` specifically. `curated` is how those 25 hand-tuned triples travel forward into the manifest instead of being silently dropped and re-derived. Entries that never had a `MODEL_REGISTRY` row (every other manifest entry — the other 10 Anthropic ids, all 28 minimal-tier providers, etc.) omit `curated`, and Task 9's builder derives `performance`/`useCases`/`category` mechanically for them, exactly as designed before this revision.

- [ ] **Step 1: Add the three manifest types**

Open `src/lib/types/model.ts`, find the end of the file (it currently ends at line 271, closing the last exported type — verify with `sed -n '265,271p' src/lib/types/model.ts` that line 271 is the final line before appending). Append:

```typescript
/**
 * A single model's metadata inside a provider's manifest. This is the one
 * canonical shape every model-metadata consumer (context windows, pricing,
 * MODEL_REGISTRY, vision capability, output-token ceilings) now reads from.
 *
 * `pricingPerMTok` is optional by design: a model with no verified price
 * (e.g. a just-announced model pricing.ts hasn't priced yet) must not report
 * a fabricated rate. Absence here means "unknown", not "free" — callers that
 * need to distinguish "free" from "unknown" already have `hasPricing()`
 * (src/lib/utils/pricing.ts) for that.
 */
export type ProviderModelManifestEntry = {
  /** Alternate identifiers that resolve to this canonical model id. */
  aliases: string[];
  /** Human-readable name. Falls back to a mechanical id-derived name when absent. */
  displayName?: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricingPerMTok?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  vision: boolean;
  nativeAudio?: boolean;
  functionCalling: boolean;
  reasoning?: boolean;
  jsonMode?: boolean;
  /**
   * Whether the model accepts classic sampling parameters (temperature/topP).
   * Mirrors ModelCapabilities.samplingParams (src/lib/types/model.ts:131) —
   * unset means supported.
   */
  samplingParams?: boolean;
  /**
   * Hand-tuned ModelInfo.performance/useCases/category values, carried
   * forward verbatim for the ids that already had a MODEL_REGISTRY entry
   * before this migration. Absent for every id that never had one — those
   * get performance/useCases/category derived mechanically instead (see
   * Task 9's buildModelRegistryFromManifests). Never populate this for a
   * genuinely new model: mechanical derivation is the correct default, and
   * a fabricated "curated" value would be worse than an honestly-derived one.
   */
  curated?: {
    performance?: ModelPerformance;
    useCases?: UseCaseSuitability;
    category?: ModelInfo["category"];
  };
};

/**
 * A regex-driven patch applied to an unlisted, gateway-shaped model id that
 * matches `pattern` (e.g. "vertex_ai/claude-sonnet-5@20260203"). Generalizes
 * the pattern VISION_FAMILY_RULES (src/lib/adapters/providerImageAdapter.ts)
 * and SAMPLING_PARAM_REJECTING_FAMILIES (src/lib/models/modelRegistry.ts)
 * already use independently, keyed per-provider instead of globally.
 */
export type ManifestFamilyRule = {
  pattern: RegExp;
  patch: Partial<ProviderModelManifestEntry>;
};

/**
 * One provider's complete model manifest: every model NeuroLink knows about
 * for that provider, plus the provider-wide fallback used when a caller
 * passes a model id the manifest has never seen (a symbolic/local provider
 * model, or a brand-new release the manifest hasn't been updated for yet).
 */
export type ProviderModelManifest = {
  /** Used for `_default`-key lookups and providers with no named-model list. */
  defaultContextWindow: number;
  /** Applied, in order, to the resolved entry (see manifestRegistry.ts). */
  familyRules?: ManifestFamilyRule[];
  /** Keyed by canonical model id (the same id `ModelInfo.id` / AIProvider calls use). */
  models: Record<string, ProviderModelManifestEntry>;
};
```

`curated`'s three field types — `ModelPerformance`, `UseCaseSuitability`, `ModelInfo` — need no new import: they are already declared earlier in this same file (`ModelPerformance` at `src/lib/types/model.ts:146`, `UseCaseSuitability` at `:165`, `ModelInfo` at `:178`), and the append lands after all three, so they are already in scope.

- [ ] **Step 2: Verify the barrel picks it up and the project still type-checks**

Run: `pnpm run check`
Expected: no errors. `src/lib/types/index.ts` already does `export * from "./model.js";` (barrel rule 10), so the three new types are immediately importable from `../types/index.js` — no barrel edit needed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/model.ts
git commit -m "feat(types): add ProviderModelManifest types for model metadata consolidation"
```

---

## Task 2: Anthropic manifest

**Files:**

- Create: `src/lib/models/manifests/anthropic.ts`
- Test: none standalone — covered by Task 14's consistency suite

**Interfaces:**

- Consumes: `ProviderModelManifestEntry`, `ManifestFamilyRule`, `ProviderModelManifest` (Task 1)
- Produces: `export const anthropicManifest: ProviderModelManifest` — the shape Task 4's aggregator imports and Task 6/7/8/9/10/11 all read through the manifest registry.

Every field below is traced to real, currently-committed data — no invented prices, context windows, or capability flags:

- `contextWindow` from `MODEL_CONTEXT_WINDOWS.anthropic` (`src/lib/constants/contextWindows.ts:160-182`).
- `maxOutputTokens` from `getClaudeMaxOutputTokens()` (`src/lib/utils/tokenLimits.ts:141-170`) — the regex ladder Critical Rule 3 documents as authoritative (Sonnet/Haiku 4.x → 64000, Opus 4.x → 32000, 3.7-sonnet → 64000, 3.5-family → 8192, 3.0-family → 4096). This is the value already correctly used by the native Anthropic/Vertex+Claude request paths; Task 11 propagates it into `PROVIDER_MAX_TOKENS` so `getSafeMaxTokens()` agrees with it too (see Task 11's design note on the documented contradiction).
- `pricingPerMTok` from `PRICING.anthropic` (`src/lib/utils/pricing.ts:26-113`), mapping its `cacheCreation` field to the manifest's `cacheWrite` name.
- `vision` from `VISION_CAPABILITIES.anthropic` + `VISION_FAMILY_RULES.anthropic` (`src/lib/adapters/providerImageAdapter.ts:70-77,107+`).
- `displayName`/`aliases` for the 5 ids that already exist in `MODEL_REGISTRY` today are copied verbatim from `src/lib/models/modelRegistry.ts` (`CLAUDE_3_5_SONNET` → "Claude 3.5 Sonnet", `CLAUDE_3_5_HAIKU` → "Claude 3.5 Haiku", `CLAUDE_OPUS_4_5`/`CLAUDE_SONNET_4_5`/`CLAUDE_4_5_HAIKU` per the same file) to avoid any user-visible naming churn in `formatModelForDisplay()`. The other 10 ids use Anthropic's real public model names — not fabricated, but also not literal copies of any single existing file since none of these 10 previously had a `MODEL_REGISTRY` entry.
- Those same 5 pre-existing ids also carry a `curated` block — `performance`/`useCases`/`category` copied verbatim from their `MODEL_REGISTRY` entries (`CLAUDE_OPUS_4_5` at `modelRegistry.ts:1084-1133`, `CLAUDE_SONNET_4_5` at `:1135-1179`, `CLAUDE_4_5_HAIKU` at `:1181-1224`, `CLAUDE_3_5_SONNET` at `:1226-1275`, `CLAUDE_3_5_HAIKU` at `:1277-1320`). The other 10 Anthropic ids have no `curated` block — Task 9 derives their `performance`/`useCases`/`category` mechanically, same as every non-Anthropic, non-OpenAI manifest entry.
- `claude-sonnet-5` has **no** `pricingPerMTok` (genuinely absent from `PRICING.anthropic`) and `samplingParams: false` (it matches `SAMPLING_PARAM_REJECTING_FAMILIES`'s `/sonnet[-_.]?5(?![0-9])/i`, `src/lib/models/modelRegistry.ts:2477-2483`).

- [ ] **Step 1: Create the manifest file**

```typescript
import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Anthropic model manifest. Canonical ids match AnthropicModels
 * (src/lib/constants/enums.ts:524+) and MODEL_CONTEXT_WINDOWS.anthropic
 * (src/lib/constants/contextWindows.ts:160-182). maxOutputTokens values
 * come from getClaudeMaxOutputTokens (src/lib/utils/tokenLimits.ts) — the
 * regex ladder already authoritative for native Claude request paths.
 */
export const anthropicManifest: ProviderModelManifest = {
  defaultContextWindow: 200_000,
  familyRules: [
    {
      // claude-{opus,sonnet,haiku}-N (N>=4) and claude-{fable,mythos}-N —
      // mirrors CLAUDE_MODERN_VISION_FAMILIES
      // (src/lib/adapters/providerImageAdapter.ts:70-73). Applied to
      // gateway-shaped ids (e.g. "vertex_ai/claude-sonnet-5@20260203") that
      // don't exact- or prefix-match any entry below.
      pattern: /claude-(?:opus|sonnet|haiku)-(?:[4-9]|\d{2,})/i,
      patch: { vision: true },
    },
    {
      pattern: /claude-(?:fable|mythos)-\d/i,
      patch: { vision: true },
    },
  ],
  models: {
    "claude-sonnet-5": {
      aliases: ["sonnet-5", "claude-sonnet"],
      displayName: "Claude Sonnet 5",
      contextWindow: 1_000_000,
      maxOutputTokens: 64_000,
      // No pricingPerMTok: genuinely absent from PRICING.anthropic today.
      // Do not invent a rate — hasPricing()/findRates() (pricing.ts) must
      // keep reporting this model as unpriced.
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      samplingParams: false, // matches SAMPLING_PARAM_REJECTING_FAMILIES /sonnet[-_.]?5(?![0-9])/i
    },
    "claude-opus-4-6": {
      aliases: ["opus-4.6", "claude-opus-latest"],
      displayName: "Claude Opus 4.6",
      contextWindow: 1_000_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 5.0,
        output: 25.0,
        cacheRead: 0.5,
        cacheWrite: 6.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-sonnet-4-6": {
      aliases: ["sonnet-4.6"],
      displayName: "Claude Sonnet 4.6",
      contextWindow: 1_000_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-opus-4-5-20251101": {
      aliases: ["claude-opus-4-5", "opus-4.5"],
      displayName: "Claude Opus 4.5",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 5.0,
        output: 25.0,
        cacheRead: 0.5,
        cacheWrite: 6.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_OPUS_4_5]
      // (src/lib/models/modelRegistry.ts:1084-1133) so Task 9's equality test
      // holds for performance/useCases/category, not just pricing/limits.
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 10,
          analysis: 10,
          conversation: 9,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "claude-sonnet-4-5-20250929": {
      aliases: ["claude-sonnet-4-5", "sonnet-4.5"],
      displayName: "Claude Sonnet 4.5",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_SONNET_4_5]
      // (src/lib/models/modelRegistry.ts:1135-1179).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 9,
          conversation: 9,
          reasoning: 10,
          translation: 8,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "claude-haiku-4-5-20251001": {
      aliases: ["claude-haiku-4-5", "haiku-4.5", "claude-4-5-haiku"],
      displayName: "Claude 4.5 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 1.0,
        output: 5.0,
        cacheRead: 0.1,
        cacheWrite: 1.25,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_4_5_HAIKU]
      // (src/lib/models/modelRegistry.ts:1181-1224).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 8,
          conversation: 9,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    "claude-opus-4-1-20250805": {
      aliases: ["claude-opus-4-1", "opus-4.1"],
      displayName: "Claude Opus 4.1",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-opus-4-20250514": {
      aliases: ["claude-opus-4"],
      displayName: "Claude Opus 4",
      contextWindow: 200_000,
      maxOutputTokens: 32_000,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-sonnet-4-20250514": {
      aliases: ["claude-sonnet-4"],
      displayName: "Claude Sonnet 4",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-3-7-sonnet-20250219": {
      aliases: ["claude-3-7-sonnet"],
      displayName: "Claude 3.7 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "claude-3-5-sonnet-20241022": {
      aliases: ["claude-3-5-sonnet"],
      displayName: "Claude 3.5 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_3_5_SONNET]
      // (src/lib/models/modelRegistry.ts:1226-1275).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 9,
          conversation: 9,
          reasoning: 10,
          translation: 8,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "claude-3-5-haiku-20241022": {
      aliases: ["claude-3-5-haiku"],
      displayName: "Claude 3.5 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 8_192,
      pricingPerMTok: {
        input: 0.8,
        output: 4.0,
        cacheRead: 0.08,
        cacheWrite: 1.0,
      },
      // Deliberately false: the last non-vision Claude. Does not appear in
      // VISION_CAPABILITIES.anthropic and does not match the modern-family
      // regex (family word precedes the version digit for 3.x ids), see
      // providerImageAdapter.ts:66-68's comment.
      vision: false,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[AnthropicModels.CLAUDE_3_5_HAIKU]
      // (src/lib/models/modelRegistry.ts:1277-1320).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 7,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    "claude-3-opus-20240229": {
      aliases: ["claude-3-opus"],
      displayName: "Claude 3 Opus",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 15.0,
        output: 75.0,
        cacheRead: 1.5,
        cacheWrite: 18.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
    "claude-3-sonnet-20240229": {
      aliases: ["claude-3-sonnet"],
      displayName: "Claude 3 Sonnet",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 3.0,
        output: 15.0,
        cacheRead: 0.3,
        cacheWrite: 3.75,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
    "claude-3-haiku-20240307": {
      aliases: ["claude-3-haiku"],
      displayName: "Claude 3 Haiku",
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: {
        input: 0.25,
        output: 1.25,
        cacheRead: 0.025,
        cacheWrite: 0.3125,
      },
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
    },
  },
};
```

- [ ] **Step 2: Verify it compiles standalone**

Run: `npx tsc --noEmit src/lib/models/manifests/anthropic.ts --module esnext --moduleResolution bundler --target es2022 --strict`
Expected: no errors (this is a syntax/shape sanity check; the full project check runs in Task 4's step once the aggregator imports it).

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/manifests/anthropic.ts
git commit -m "feat(models): add anthropic model manifest"
```

---

## Task 3: OpenAI manifest

**Files:**

- Create: `src/lib/models/manifests/openai.ts`
- Test: none standalone — covered by Task 14

**Interfaces:**

- Consumes: `ProviderModelManifest` (Task 1)
- Produces: `export const openaiManifest: ProviderModelManifest`

20 entries, one per non-deprecated `OpenAIModels` `MODEL_REGISTRY` key (`src/lib/models/modelRegistry.ts:30-984`) — `O1_PREVIEW` is excluded (`@deprecated`, "Turned off Jul 14, 2025" per `AIProviderName`'s sibling `OpenAIModels` enum comment; the manifest models what's actually callable). `displayName`, `aliases`, `maxOutputTokens`, and the four boolean capability flags are copied verbatim from each entry's existing `MODEL_REGISTRY` block. `contextWindow` uses `MODEL_CONTEXT_WINDOWS.openai` (`src/lib/constants/contextWindows.ts:183-226`) rather than `MODEL_REGISTRY`'s own `limits.maxContextTokens` where the two disagree — this is a real, demonstrated instance of the "5 stores disagree" problem the spec documents: `MODEL_REGISTRY`'s `GPT_5` entry says `maxContextTokens: 256000`, but `MODEL_CONTEXT_WINDOWS.openai["gpt-5"]` says `400_000`. `MODEL_CONTEXT_WINDOWS` is the actively-maintained, more specific store (its comments track exact release dates and shutdown notices), so it wins as the manifest's source of truth; `pricingPerMTok` comes from `PRICING.openai` (`src/lib/utils/pricing.ts:162-247`).

Three ids — `gpt-5.2-chat-latest`, `gpt-5.2-pro`, `o3-pro` — have no distinct `PRICING.openai` entry of their own. Today, `findRates()`'s longest-prefix match silently resolves them to their shorter sibling's rate (`gpt-5.2`, `gpt-5.2`, `o3` respectively) — confirmed by reading `findRates()`'s prefix-match loop (`src/lib/utils/pricing.ts:705-712`). To preserve that exact resolved price without relying on the manifest's own prefix-match cascade producing a _different_ result at read time (since these three ids also happen to be manifest keys in their own right, an exact-key match would otherwise short-circuit before any prefix fallback runs), their `pricingPerMTok` is set explicitly to the value they already resolve to today — this is not new data, it is today's implicit resolution made explicit.

All 20 entries also carry a `curated` block — `performance`/`useCases`/`category` copied verbatim from their `MODEL_REGISTRY` entry (line ranges cited per-entry below). This is every OpenAI id the manifest models, because unlike Anthropic (5 of 15 pre-existing) or the rest of the program (0 of 28 minimal-tier providers pre-existing), 100% of this manifest's entries already had a hand-tuned `MODEL_REGISTRY` row before this migration — so Task 9's builder finds `curated` populated for every OpenAI model and never falls back to mechanical derivation for this provider.

- [ ] **Step 1: Create the manifest file**

```typescript
import type { ProviderModelManifest } from "../../types/index.js";

/**
 * OpenAI model manifest. contextWindow values come from
 * MODEL_CONTEXT_WINDOWS.openai (src/lib/constants/contextWindows.ts), which
 * disagrees with MODEL_REGISTRY.limits.maxContextTokens for several ids
 * (e.g. gpt-5: 400_000 here vs 256_000 there) — MODEL_CONTEXT_WINDOWS wins
 * as the more actively-maintained store. maxOutputTokens/aliases/capability
 * flags come from MODEL_REGISTRY (src/lib/models/modelRegistry.ts:30-984).
 * pricingPerMTok comes from PRICING.openai (src/lib/utils/pricing.ts).
 */
export const openaiManifest: ProviderModelManifest = {
  defaultContextWindow: 128_000,
  models: {
    "gpt-4o": {
      aliases: ["gpt4o", "gpt-4-omni", "openai-flagship"],
      displayName: "GPT-4 Omni",
      contextWindow: 128_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 2.5, output: 10.0, cacheRead: 0.625 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4O]
      // (src/lib/models/modelRegistry.ts:30-73).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 8,
          analysis: 9,
          conversation: 9,
          reasoning: 9,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-4o-mini": {
      aliases: ["gpt4o-mini", "gpt-4-mini", "fastest", "cheap"],
      displayName: "GPT-4 Omni Mini",
      contextWindow: 128_000,
      maxOutputTokens: 16_384,
      pricingPerMTok: { input: 0.15, output: 0.6, cacheRead: 0.0375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4O_MINI]
      // (src/lib/models/modelRegistry.ts:75-118).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 7,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    "gpt-5": {
      aliases: ["gpt5", "gpt-5-flagship", "openai-latest"],
      displayName: "GPT-5",
      contextWindow: 400_000,
      maxOutputTokens: 32_768,
      pricingPerMTok: { input: 1.25, output: 10.0, cacheRead: 0.3125 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5]
      // (src/lib/models/modelRegistry.ts:121-165).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 10,
          analysis: 10,
          conversation: 10,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-5-mini": {
      aliases: ["gpt5-mini", "gpt-5-fast"],
      displayName: "GPT-5 Mini",
      contextWindow: 400_000,
      maxOutputTokens: 16_384,
      pricingPerMTok: { input: 0.25, output: 2.0, cacheRead: 0.0625 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_MINI]
      // (src/lib/models/modelRegistry.ts:167-210).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 8,
          conversation: 9,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "general",
      },
    },
    o3: {
      aliases: ["o3-reasoning", "o3-thinking"],
      displayName: "O3",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3]
      // (src/lib/models/modelRegistry.ts:213-257).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 8,
          analysis: 10,
          conversation: 7,
          reasoning: 10,
          translation: 7,
          summarization: 8,
        },
        category: "reasoning",
      },
    },
    "o3-mini": {
      aliases: ["o3-mini-reasoning"],
      displayName: "O3 Mini",
      contextWindow: 200_000,
      maxOutputTokens: 65_536,
      pricingPerMTok: { input: 1.1, output: 4.4, cacheRead: 0.275 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3_MINI]
      // (src/lib/models/modelRegistry.ts:259-303).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 6,
          analysis: 9,
          conversation: 7,
          reasoning: 9,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "gpt-5-nano": {
      aliases: ["gpt5-nano", "gpt-5-cheapest"],
      displayName: "GPT-5 Nano",
      contextWindow: 400_000,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.05, output: 0.4, cacheRead: 0.0125 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_NANO]
      // (src/lib/models/modelRegistry.ts:305-349).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 6,
          creative: 6,
          analysis: 6,
          conversation: 8,
          reasoning: 6,
          translation: 7,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-5.2": {
      aliases: ["gpt52", "gpt-5.2-thinking", "openai-latest-reasoning"],
      displayName: "GPT-5.2 Thinking",
      contextWindow: 400_000,
      maxOutputTokens: 64_000,
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2]
      // (src/lib/models/modelRegistry.ts:352-396).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 10,
          analysis: 10,
          conversation: 9,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-5.2-chat-latest": {
      aliases: ["gpt52-chat", "gpt-5.2-instant", "gpt52-fast"],
      displayName: "GPT-5.2 Instant",
      contextWindow: 128_000,
      maxOutputTokens: 32_000,
      // Inherits gpt-5.2's rate — matches findRates()'s existing prefix-match
      // resolution for this id today (no distinct PRICING.openai key exists).
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2_CHAT_LATEST]
      // (src/lib/models/modelRegistry.ts:398-442).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 9,
          analysis: 9,
          conversation: 10,
          reasoning: 9,
          translation: 9,
          summarization: 9,
        },
        category: "general",
      },
    },
    "gpt-5.2-pro": {
      aliases: ["gpt52-pro", "gpt-5.2-professional", "openai-science"],
      displayName: "GPT-5.2 Pro",
      contextWindow: 400_000,
      maxOutputTokens: 128_000,
      // Inherits gpt-5.2's rate — see gpt-5.2-chat-latest's comment above.
      pricingPerMTok: { input: 1.75, output: 14.0, cacheRead: 0.4375 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_5_2_PRO]
      // (src/lib/models/modelRegistry.ts:444-488).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 9,
          analysis: 10,
          conversation: 8,
          reasoning: 10,
          translation: 9,
          summarization: 9,
        },
        category: "reasoning",
      },
    },
    "gpt-4.1": {
      aliases: ["gpt-4.1", "gpt41", "million-context"],
      displayName: "GPT-4.1",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1]
      // (src/lib/models/modelRegistry.ts:491-534).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 8,
          analysis: 9,
          conversation: 8,
          reasoning: 9,
          translation: 8,
          summarization: 9,
        },
        category: "coding",
      },
    },
    "gpt-4.1-mini": {
      aliases: ["gpt-4.1-mini", "gpt41-mini"],
      displayName: "GPT-4.1 Mini",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.4, output: 1.6, cacheRead: 0.1 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1_MINI]
      // (src/lib/models/modelRegistry.ts:536-579).
      curated: {
        performance: { speed: "fast", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 7,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 9,
        },
        category: "coding",
      },
    },
    "gpt-4.1-nano": {
      aliases: ["gpt-4.1-nano", "gpt41-nano"],
      displayName: "GPT-4.1 Nano",
      contextWindow: 1_047_576,
      maxOutputTokens: 128_000,
      pricingPerMTok: { input: 0.1, output: 0.4, cacheRead: 0.025 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_1_NANO]
      // (src/lib/models/modelRegistry.ts:581-624).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 7,
          creative: 6,
          analysis: 7,
          conversation: 7,
          reasoning: 7,
          translation: 7,
          summarization: 8,
        },
        category: "coding",
      },
    },
    "o3-pro": {
      aliases: ["o3-pro", "o3-professional"],
      displayName: "O3 Pro",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      // Inherits o3's rate — matches findRates()'s existing prefix-match
      // resolution for this id today (no distinct PRICING.openai key exists).
      pricingPerMTok: { input: 2.0, output: 8.0, cacheRead: 0.5 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O3_PRO]
      // (src/lib/models/modelRegistry.ts:627-671).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 7,
          analysis: 10,
          conversation: 6,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "o4-mini": {
      aliases: ["o4-mini", "o4-fast"],
      displayName: "O4 Mini",
      contextWindow: 200_000,
      maxOutputTokens: 100_000,
      pricingPerMTok: { input: 1.1, output: 4.4, cacheRead: 0.275 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O4_MINI]
      // (src/lib/models/modelRegistry.ts:673-717).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 9,
          creative: 6,
          analysis: 9,
          conversation: 7,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    o1: {
      aliases: ["o1-full", "o1-premium"],
      displayName: "O1",
      contextWindow: 200_000,
      maxOutputTokens: 32_768,
      pricingPerMTok: { input: 15.0, output: 60.0, cacheRead: 3.75 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O1]
      // (src/lib/models/modelRegistry.ts:719-763).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 10,
          creative: 7,
          analysis: 10,
          conversation: 6,
          reasoning: 10,
          translation: 6,
          summarization: 7,
        },
        category: "reasoning",
      },
    },
    "o1-mini": {
      aliases: ["o1-mini", "o1-budget"],
      displayName: "O1 Mini",
      contextWindow: 128_000,
      maxOutputTokens: 65_536,
      pricingPerMTok: { input: 0.55, output: 2.2, cacheRead: 0.1375 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.O1_MINI]
      // (src/lib/models/modelRegistry.ts:810-853).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 5,
          analysis: 8,
          conversation: 6,
          reasoning: 8,
          translation: 5,
          summarization: 6,
        },
        category: "reasoning",
      },
    },
    "gpt-4": {
      aliases: ["gpt4", "gpt-4-base"],
      displayName: "GPT-4",
      contextWindow: 8_192,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 30.0, output: 60.0 },
      vision: false,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4]
      // (src/lib/models/modelRegistry.ts:856-899).
      curated: {
        performance: { speed: "slow", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 8,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-4-turbo": {
      aliases: ["gpt4-turbo", "gpt-4-turbo-preview"],
      displayName: "GPT-4 Turbo",
      contextWindow: 128_000,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 10.0, output: 30.0 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_4_TURBO]
      // (src/lib/models/modelRegistry.ts:901-944).
      curated: {
        performance: { speed: "medium", quality: "high", accuracy: "high" },
        useCases: {
          coding: 8,
          creative: 8,
          analysis: 9,
          conversation: 8,
          reasoning: 8,
          translation: 8,
          summarization: 8,
        },
        category: "general",
      },
    },
    "gpt-3.5-turbo": {
      aliases: ["gpt35", "gpt-3.5", "chatgpt"],
      displayName: "GPT-3.5 Turbo",
      contextWindow: 16_385,
      maxOutputTokens: 4_096,
      pricingPerMTok: { input: 0.5, output: 1.0 },
      vision: false,
      functionCalling: true,
      reasoning: false,
      jsonMode: true,
      // Carried forward verbatim from MODEL_REGISTRY[OpenAIModels.GPT_3_5_TURBO]
      // (src/lib/models/modelRegistry.ts:946-989).
      curated: {
        performance: { speed: "fast", quality: "medium", accuracy: "medium" },
        useCases: {
          coding: 6,
          creative: 6,
          analysis: 6,
          conversation: 7,
          reasoning: 5,
          translation: 7,
          summarization: 7,
        },
        category: "general",
      },
    },
  },
};
```

- [ ] **Step 2: Verify it compiles standalone**

Run: `npx tsc --noEmit src/lib/models/manifests/openai.ts --module esnext --moduleResolution bundler --target es2022 --strict`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/manifests/openai.ts
git commit -m "feat(models): add openai model manifest"
```

---

## Task 4: Manifest registry aggregator

**Files:**

- Create: `src/lib/models/manifestRegistry.ts`
- Test: `test/continuous-test-suite-model-manifests.ts` (created fully in Task 14; this task only needs `pnpm run check`)

**Interfaces:**

- Consumes: `anthropicManifest` (Task 2), `openaiManifest` (Task 3), plus 5 more full + 23 minimal manifests (Task 5 — this task is written and tested against the two manifests that exist after Tasks 2-3; Task 5 adds the remaining 28 import lines to the same file as its own step).
- Produces: `MANIFEST_REGISTRY: Record<string, ProviderModelManifest>`, `getManifestForProvider(provider: string): ProviderModelManifest | undefined`, `getAllManifestProviders(): string[]`, `resolveManifestEntryExact(provider: string, model: string): ProviderModelManifestEntry | undefined`, `resolveManifestEntry(provider: string, model: string): ProviderModelManifestEntry | undefined` — the five symbols every migration task (7-11) imports.

`resolveManifestEntryExact` never falls back to a provider's `_default` entry; `resolveManifestEntry` does. The split exists because `pricing.ts`'s Vertex→Google-Gemini and Bedrock→Anthropic cross-provider fallbacks (`src/lib/utils/pricing.ts:714-741`) must run **before** the provider's own `_default`, and `providerImageAdapter.ts`'s `PROXY_PROVIDERS` pass-through check must run before any implicit `_default` short-circuit too — both need the "give me a real match or nothing" primitive that `resolveManifestEntryExact` provides, so they can insert their own special case in between the two. Family rules, when a `_default` fallback fires, are tested against the **original** `model` argument, not the literal string `"_default"` — so an unmatched gateway-shaped id still gets correctly patched.

- [ ] **Step 1: Write the failing check**

Since this task starts a project-wide compile that will fail for straightforward reasons (missing exports) until implemented, the "failing test" here is the type-check itself:

Run: `pnpm run check`
Expected: passes (nothing references `manifestRegistry.ts` yet) — this step exists to record the baseline before the file is created, so Step 4 has a clean before/after.

- [ ] **Step 2: Create the aggregator with static imports**

```typescript
import type {
  ProviderModelManifest,
  ProviderModelManifestEntry,
} from "../types/index.js";
import { anthropicManifest } from "./manifests/anthropic.js";
import { openaiManifest } from "./manifests/openai.js";

/**
 * Every provider's model manifest, keyed by the exact AIProviderName enum
 * value (kebab-case) — e.g. "google-ai", "nvidia-nim". Manifests are pure
 * data with zero heavy dependencies, so they are imported statically here
 * (Critical Rule 1's dynamic-import mandate targets providerRegistry.ts's
 * *provider* factories, which pull in real SDK clients — not this).
 */
export const MANIFEST_REGISTRY: Record<string, ProviderModelManifest> = {
  anthropic: anthropicManifest,
  openai: openaiManifest,
};

export function getManifestForProvider(
  provider: string,
): ProviderModelManifest | undefined {
  return MANIFEST_REGISTRY[provider];
}

export function getAllManifestProviders(): string[] {
  return Object.keys(MANIFEST_REGISTRY);
}

/**
 * Apply every matching family rule's patch, in declaration order, on top of
 * a base entry. Later rules win on overlapping fields (last patch applied
 * wins), matching the "later registrations overwrite earlier ones" idiom
 * used elsewhere in this subsystem (see registerRuntimeContextWindow's
 * docblock, src/lib/constants/contextWindows.ts).
 */
function applyFamilyRules(
  manifest: ProviderModelManifest,
  model: string,
  base: ProviderModelManifestEntry,
): ProviderModelManifestEntry {
  if (!manifest.familyRules) {
    return base;
  }
  let result = base;
  for (const rule of manifest.familyRules) {
    if (rule.pattern.test(model)) {
      result = { ...result, ...rule.patch };
    }
  }
  return result;
}

/**
 * Resolve a model against a provider's manifest WITHOUT ever falling back to
 * the provider's `_default` entry. Used by callers that need to insert their
 * own special-case fallback (cross-provider pricing, proxy pass-through)
 * between "no real match" and "give up" — see resolveManifestEntry's
 * docblock for why the split exists.
 */
export function resolveManifestEntryExact(
  provider: string,
  model: string,
): ProviderModelManifestEntry | undefined {
  const manifest = MANIFEST_REGISTRY[provider];
  if (!manifest) {
    return undefined;
  }
  const exact = manifest.models[model];
  if (exact) {
    return applyFamilyRules(manifest, model, exact);
  }
  const sortedKeys = Object.keys(manifest.models)
    .filter((k) => k !== "_default")
    .sort((a, b) => b.length - a.length);
  const prefixKey = sortedKeys.find((k) => model.startsWith(k));
  if (prefixKey) {
    return applyFamilyRules(manifest, model, manifest.models[prefixKey]);
  }
  return undefined;
}

/**
 * Resolve a model against a provider's manifest, falling back to the
 * provider's `_default` entry (built from `defaultContextWindow` when no
 * explicit `_default` model entry exists) when no real model matches.
 * Family rules are tested against the ORIGINAL model string even on the
 * `_default` path, so an unmatched gateway-shaped id still gets patched.
 */
export function resolveManifestEntry(
  provider: string,
  model: string,
): ProviderModelManifestEntry | undefined {
  const exact = resolveManifestEntryExact(provider, model);
  if (exact) {
    return exact;
  }
  const manifest = MANIFEST_REGISTRY[provider];
  if (!manifest) {
    return undefined;
  }
  const defaultEntry: ProviderModelManifestEntry = manifest.models._default ?? {
    aliases: [],
    contextWindow: manifest.defaultContextWindow,
    maxOutputTokens: manifest.defaultContextWindow,
    vision: false,
    functionCalling: false,
  };
  return applyFamilyRules(manifest, model, defaultEntry);
}
```

- [ ] **Step 3: Add a smoke check for the new exports**

Add a temporary throwaway script to confirm the resolution cascade behaves as designed before wiring any real consumer to it (this is not the permanent Task 14 suite — just a fast manual check):

```bash
npx tsx -e "
import { resolveManifestEntry, resolveManifestEntryExact, getAllManifestProviders } from './src/lib/models/manifestRegistry.ts';
console.log('providers:', getAllManifestProviders());
console.log('exact claude-opus-4-6:', resolveManifestEntry('anthropic', 'claude-opus-4-6')?.maxOutputTokens);
console.log('prefix claude-opus-4-6-20260301:', resolveManifestEntry('anthropic', 'claude-opus-4-6-20260301')?.maxOutputTokens);
console.log('miss unknown-model:', resolveManifestEntryExact('anthropic', 'unknown-model'));
console.log('gpt-5.2-chat-latest price:', resolveManifestEntry('openai', 'gpt-5.2-chat-latest')?.pricingPerMTok);
"
```

Expected output: `providers: [ 'anthropic', 'openai' ]`, both `maxOutputTokens` lines print `32000` (exact match and prefix match agree), the miss line prints `undefined`, and the price line prints `{ input: 1.75, output: 14, cacheRead: 0.4375 }`.

- [ ] **Step 4: Run the project type-check**

Run: `pnpm run check`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/manifestRegistry.ts
git commit -m "feat(models): add manifest registry aggregator with prefix + family-rule resolution"
```

---

## Task 5: Generator script + remaining 28 manifests

**Files:**

- Create: `scripts/generate-remaining-manifests.ts`
- Create: `src/lib/models/manifests/azure.ts`, `bedrock.ts`, `ollama.ts`, `mistral.ts`, `google-ai.ts` (5 "full" providers — generated from existing `MODEL_REGISTRY` entries)
- Create: `src/lib/models/manifests/openai-compatible.ts`, `openrouter.ts`, `vertex.ts`, `huggingface.ts`, `litellm.ts`, `sagemaker.ts`, `deepseek.ts`, `nvidia-nim.ts`, `lm-studio.ts`, `llamacpp.ts`, `xai.ts`, `groq.ts`, `cohere.ts`, `together-ai.ts`, `fireworks.ts`, `perplexity.ts`, `cloudflare.ts`, `replicate.ts`, `voyage.ts`, `jina.ts`, `stability.ts`, `ideogram.ts`, `recraft.ts` (23 "minimal" providers)
- Modify: `src/lib/models/manifestRegistry.ts:1-8` (add the 28 new import lines + registry entries)

**Interfaces:**

- Consumes: `MODEL_REGISTRY`/`getModelsByProvider` (`src/lib/models/modelRegistry.ts` — exported, pre-migration shape, still the hand-authored data at this point in the plan since Task 9 hasn't run yet), `findRates()` is NOT directly importable (private const `PRICING` backs it, but `findRates` itself isn't exported either — confirmed by reading `pricing.ts`'s export list) — the generator instead uses the exported `calculateCost`/`hasPricing`, and for context/vision/max-tokens uses `getContextWindowSize` (`src/lib/constants/contextWindows.ts`, exported), `ProviderImageAdapter.supportsVision()` (`src/lib/adapters/providerImageAdapter.ts`, exported), `PROVIDER_MAX_TOKENS` (`src/lib/core/constants.ts`, exported).
- Produces: 28 new `export const <camelCaseProvider>Manifest: ProviderModelManifest` values (one per file), wired into `MANIFEST_REGISTRY`.

**Design note — why the generator reads only exported symbols.** `PRICING` (`src/lib/utils/pricing.ts`) and `VISION_CAPABILITIES` (`src/lib/adapters/providerImageAdapter.ts`) are both private, unexported consts. A generator script living outside those modules cannot import them directly. Instead of adding new exports purely to serve a one-time generator (which would grow the public surface for no runtime benefit), the generator drives the same public API real callers already use: `getModelsByProvider(provider)` to enumerate each full provider's existing models, `hasPricing(provider, model)` + a per-unit-cost probe via `calculateCost(provider, model, 1_000_000, 0)` (which — reading `calculateCost`'s body, `src/lib/utils/pricing.ts:750-779` — computes `(1_000_000/1_000_000) * rates.input`, i.e. exactly the input-side `pricingPerMTok.input` value when scaled back up) to recover pricing, and `ProviderImageAdapter.supportsVision(provider, model)` to recover the vision flag. This keeps the private tables private while still letting the generator produce real, non-fabricated data.

**Design note — the 5 full vs. 23 minimal split.** The 7 providers with actual `MODEL_REGISTRY` entries today are `openai`, `azure`, `anthropic`, `bedrock`, `ollama`, `mistral`, `google-ai` (confirmed: `AIProviderName` has exactly these plus 23 more with zero `MODEL_REGISTRY` entries — verified by reading the full 31-member enum, `src/lib/constants/enums.ts:8-39`, and cross-checking `getModelsByProvider()`'s output would be empty for the other 23). `anthropic`/`openai` already have hand-written manifests (Tasks 2-3); this task generates the other 5 full providers' manifests from their existing `MODEL_REGISTRY` data, and writes **minimal** manifests — `{ defaultContextWindow, models: { _default: {...} } }`, no named models — for the remaining 23, whose only per-provider data that exists anywhere today is a single `getContextWindowSize(provider)` fallback number and a `PROVIDER_MAX_TOKENS[provider]` entry (most of those 23 don't even have `PROVIDER_MAX_TOKENS` entries, in which case the generator uses `PROVIDER_MAX_TOKENS.default = 64000`, confirmed at `src/lib/core/constants.ts:175-224`). The 23 minimal providers, enumerated directly from `AIProviderName` (not `getAvailableProviders()`, which only returns providers **with** `MODEL_REGISTRY` entries — the exact opposite of what's needed here): `openai-compatible`, `openrouter`, `vertex`, `huggingface`, `litellm`, `sagemaker`, `deepseek`, `nvidia-nim`, `lm-studio`, `llamacpp`, `xai`, `groq`, `cohere`, `together-ai`, `fireworks`, `perplexity`, `cloudflare`, `replicate`, `voyage`, `jina`, `stability`, `ideogram`, `recraft`.

- [ ] **Step 1: Write the generator script**

```typescript
#!/usr/bin/env npx tsx
/**
 * One-time generator for the 28 model manifests not hand-authored in Tasks
 * 2-3. Reads only exported symbols from the pre-migration model-metadata
 * stores (MODEL_REGISTRY, getContextWindowSize, ProviderImageAdapter,
 * PROVIDER_MAX_TOKENS) — see Task 5's design note for why the private
 * PRICING/VISION_CAPABILITIES tables aren't imported directly. Run once;
 * the output files are committed and hand-editable afterward like Tasks 2-3.
 */
import { writeFileSync } from "node:fs";
import { AIProviderName } from "../src/lib/constants/enums.js";
import {
  getModelsByProvider,
  calculateCost,
} from "../src/lib/models/modelRegistry.js";
import { hasPricing } from "../src/lib/utils/pricing.js";
import { getContextWindowSize } from "../src/lib/constants/contextWindows.js";
import { ProviderImageAdapter } from "../src/lib/adapters/providerImageAdapter.js";
import { PROVIDER_MAX_TOKENS } from "../src/lib/core/constants.js";

const FULL_PROVIDERS = [
  AIProviderName.AZURE,
  AIProviderName.BEDROCK,
  AIProviderName.OLLAMA,
  AIProviderName.MISTRAL,
  AIProviderName.GOOGLE_AI,
] as const;

const MINIMAL_PROVIDERS = [
  AIProviderName.OPENAI_COMPATIBLE,
  AIProviderName.OPENROUTER,
  AIProviderName.VERTEX,
  AIProviderName.HUGGINGFACE,
  AIProviderName.LITELLM,
  AIProviderName.SAGEMAKER,
  AIProviderName.DEEPSEEK,
  AIProviderName.NVIDIA_NIM,
  AIProviderName.LM_STUDIO,
  AIProviderName.LLAMACPP,
  AIProviderName.XAI,
  AIProviderName.GROQ,
  AIProviderName.COHERE,
  AIProviderName.TOGETHER_AI,
  AIProviderName.FIREWORKS,
  AIProviderName.PERPLEXITY,
  AIProviderName.CLOUDFLARE,
  AIProviderName.REPLICATE,
  AIProviderName.VOYAGE,
  AIProviderName.JINA,
  AIProviderName.STABILITY,
  AIProviderName.IDEOGRAM,
  AIProviderName.RECRAFT,
] as const;

function toCamel(provider: string): string {
  return provider.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function quoteKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function generateFullManifest(provider: AIProviderName): string {
  const models = getModelsByProvider(provider);
  const entries = models
    .map((m) => {
      const priced = hasPricing(provider, m.id);
      const inputRate = priced
        ? calculateCost({ ...m, id: m.id } as never, 1_000_000, 0)
        : undefined;
      const outputRate = priced
        ? calculateCost({ ...m, id: m.id } as never, 0, 1_000_000)
        : undefined;
      const pricing =
        priced && inputRate !== undefined && outputRate !== undefined
          ? `{ input: ${inputRate}, output: ${outputRate} }`
          : undefined;
      const vision = ProviderImageAdapter.supportsVision(provider, m.id);
      return `    ${quoteKey(m.id)}: {
      aliases: ${JSON.stringify(m.aliases)},
      displayName: ${JSON.stringify(m.name)},
      contextWindow: ${m.limits.maxContextTokens},
      maxOutputTokens: ${m.limits.maxOutputTokens},
      ${pricing ? `pricingPerMTok: ${pricing},` : "// pricingPerMTok omitted: hasPricing() reports no verified rate"}
      vision: ${vision},
      functionCalling: ${m.capabilities.functionCalling},
      reasoning: ${m.capabilities.reasoning},
      jsonMode: ${m.capabilities.jsonMode},
    },`;
    })
    .join("\n");
  const defaultWindow = getContextWindowSize(provider);
  return `import type { ProviderModelManifest } from "../../types/index.js";

export const ${toCamel(provider)}Manifest: ProviderModelManifest = {
  defaultContextWindow: ${defaultWindow},
  models: {
${entries}
  },
};
`;
}

function generateMinimalManifest(provider: AIProviderName): string {
  const defaultWindow = getContextWindowSize(provider);
  const providerLimits = PROVIDER_MAX_TOKENS[
    provider as keyof typeof PROVIDER_MAX_TOKENS
  ] as { default?: number } | number | undefined;
  const maxOutput =
    typeof providerLimits === "number"
      ? providerLimits
      : (providerLimits?.default ?? PROVIDER_MAX_TOKENS.default);
  return `import type { ProviderModelManifest } from "../../types/index.js";

/**
 * Minimal manifest: ${provider} has no MODEL_REGISTRY entries today, so
 * only the provider-wide fallback is known. Named models can be added here
 * incrementally without touching any consumer — see Task 5 of the model
 * metadata consolidation plan.
 */
export const ${toCamel(provider)}Manifest: ProviderModelManifest = {
  defaultContextWindow: ${defaultWindow},
  models: {
    _default: {
      aliases: [],
      contextWindow: ${defaultWindow},
      maxOutputTokens: ${maxOutput},
      vision: false,
      functionCalling: false,
    },
  },
};
`;
}

for (const provider of FULL_PROVIDERS) {
  writeFileSync(
    `src/lib/models/manifests/${provider}.ts`,
    generateFullManifest(provider),
  );
  console.log(`wrote src/lib/models/manifests/${provider}.ts`);
}

for (const provider of MINIMAL_PROVIDERS) {
  writeFileSync(
    `src/lib/models/manifests/${provider}.ts`,
    generateMinimalManifest(provider),
  );
  console.log(`wrote src/lib/models/manifests/${provider}.ts`);
}
```

- [ ] **Step 2: Run the generator and inspect output**

Run: `npx tsx scripts/generate-remaining-manifests.ts`
Expected: 28 files written, one console line per file. Immediately spot-check one full and one minimal manifest for sanity:

Run: `cat src/lib/models/manifests/google-ai.ts | head -30 && echo --- && cat src/lib/models/manifests/voyage.ts`
Expected: `google-ai.ts` has real model entries (non-empty `models` object with Gemini ids); `voyage.ts` has exactly one `_default` entry with a positive `contextWindow`/`maxOutputTokens`.

- [ ] **Step 3: Wire all 28 into the aggregator**

Modify `src/lib/models/manifestRegistry.ts`'s import block and `MANIFEST_REGISTRY` object:

```typescript
import { anthropicManifest } from "./manifests/anthropic.js";
import { openaiManifest } from "./manifests/openai.js";
import { azureManifest } from "./manifests/azure.js";
import { bedrockManifest } from "./manifests/bedrock.js";
import { ollamaManifest } from "./manifests/ollama.js";
import { mistralManifest } from "./manifests/mistral.js";
import { googleAiManifest } from "./manifests/google-ai.js";
import { openaiCompatibleManifest } from "./manifests/openai-compatible.js";
import { openrouterManifest } from "./manifests/openrouter.js";
import { vertexManifest } from "./manifests/vertex.js";
import { huggingfaceManifest } from "./manifests/huggingface.js";
import { litellmManifest } from "./manifests/litellm.js";
import { sagemakerManifest } from "./manifests/sagemaker.js";
import { deepseekManifest } from "./manifests/deepseek.js";
import { nvidiaNimManifest } from "./manifests/nvidia-nim.js";
import { lmStudioManifest } from "./manifests/lm-studio.js";
import { llamacppManifest } from "./manifests/llamacpp.js";
import { xaiManifest } from "./manifests/xai.js";
import { groqManifest } from "./manifests/groq.js";
import { cohereManifest } from "./manifests/cohere.js";
import { togetherAiManifest } from "./manifests/together-ai.js";
import { fireworksManifest } from "./manifests/fireworks.js";
import { perplexityManifest } from "./manifests/perplexity.js";
import { cloudflareManifest } from "./manifests/cloudflare.js";
import { replicateManifest } from "./manifests/replicate.js";
import { voyageManifest } from "./manifests/voyage.js";
import { jinaManifest } from "./manifests/jina.js";
import { stabilityManifest } from "./manifests/stability.js";
import { ideogramManifest } from "./manifests/ideogram.js";
import { recraftManifest } from "./manifests/recraft.js";

export const MANIFEST_REGISTRY: Record<string, ProviderModelManifest> = {
  anthropic: anthropicManifest,
  openai: openaiManifest,
  azure: azureManifest,
  bedrock: bedrockManifest,
  ollama: ollamaManifest,
  mistral: mistralManifest,
  "google-ai": googleAiManifest,
  "openai-compatible": openaiCompatibleManifest,
  openrouter: openrouterManifest,
  vertex: vertexManifest,
  huggingface: huggingfaceManifest,
  litellm: litellmManifest,
  sagemaker: sagemakerManifest,
  deepseek: deepseekManifest,
  "nvidia-nim": nvidiaNimManifest,
  "lm-studio": lmStudioManifest,
  llamacpp: llamacppManifest,
  xai: xaiManifest,
  groq: groqManifest,
  cohere: cohereManifest,
  "together-ai": togetherAiManifest,
  fireworks: fireworksManifest,
  perplexity: perplexityManifest,
  cloudflare: cloudflareManifest,
  replicate: replicateManifest,
  voyage: voyageManifest,
  jina: jinaManifest,
  stability: stabilityManifest,
  ideogram: ideogramManifest,
  recraft: recraftManifest,
};
```

- [ ] **Step 4: Verify all 30 providers resolve**

Run: `npx tsx -e "import { getAllManifestProviders } from './src/lib/models/manifestRegistry.ts'; const p = getAllManifestProviders(); console.log(p.length, p.sort());"`
Expected: `30 [ 'anthropic', 'azure', 'bedrock', 'cloudflare', 'cohere', 'deepseek', 'fireworks', 'google-ai', 'groq', 'huggingface', 'ideogram', 'jina', 'litellm', 'llamacpp', 'lm-studio', 'mistral', 'nvidia-nim', 'ollama', 'openai', 'openai-compatible', 'openrouter', 'perplexity', 'recraft', 'replicate', 'sagemaker', 'stability', 'together-ai', 'vertex', 'voyage', 'xai' ]`

- [ ] **Step 5: Run the project type-check**

Run: `pnpm run check`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-remaining-manifests.ts src/lib/models/manifests/ src/lib/models/manifestRegistry.ts
git commit -m "feat(models): generate remaining 28 provider manifests, wire into registry"
```

---

## Task 6: Reconcile the Anthropic shadow catalog

**Files:**

- Modify: `src/lib/models/anthropicModels.ts:27-54` (enum), `:108-234` (`MODEL_METADATA`)
- Test: `test/continuous-test-suite-model-manifests.ts` (Task 14 asserts on this file's output; this task's own verification is a standalone script check)

**Interfaces:**

- Consumes: `resolveManifestEntry` (Task 4), `anthropicManifest` (Task 2)
- Produces: 3 new `AnthropicModel` enum members (`CLAUDE_OPUS_4_5`, `CLAUDE_SONNET_4_5`, `CLAUDE_HAIKU_4_5`), `metadataFromManifest(id: string): AnthropicModelMetadata` (new, internal helper — not exported, used only to build `MODEL_METADATA`). All 18 existing exported helper functions (`isModelAvailableForTier`, `getAvailableModelsForTier`, `getModelDisplayName`, `getDefaultModelForTier`, `getModelMetadata`, `modelSupportsCapability`, `getMinimumTierForModel`, `getModelsWithCapability`, `getModelsByFamily`, `getLatestModelsByFamily`, `validateModelAccess`, `compareTiers`, `getContextWindow`, `getMaxOutputTokens`, `supportsVision`, `supportsExtendedThinking`, plus the two `@deprecated` aliases `getRecommendedModelForTier`/`getModelCapabilities`) keep their exact signatures — only `MODEL_METADATA`'s **values** change, sourced from the manifest instead of hand-typed literals.

**Design note.** `AnthropicModel` (`src/lib/models/anthropicModels.ts:27-54`) is a 9-member enum, independent of both `AnthropicModels` (`src/lib/constants/enums.ts`, a third catalog that only supplies `MODEL_REGISTRY` keys — untouched by this plan, see Out of Scope) and the manifest's 15 canonical ids. It is missing the three 4.5-generation models: `CLAUDE_OPUS_4_5`, `CLAUDE_SONNET_4_5`, `CLAUDE_HAIKU_4_5`. Adding them is this task's scope; four further gaps remain even after this task (`claude-opus-4-1`, `claude-sonnet-5`, `claude-3-7-sonnet`, `claude-3-sonnet` still have no `AnthropicModel` member) — flagged explicitly in this plan's Out of Scope section rather than silently left unaddressed, since expanding beyond the assigned 4.5-generation gap is a real scope decision, not an oversight.

Separately, `MODEL_METADATA`'s two existing `maxOutputTokens: 64000` entries for `CLAUDE_OPUS_4` and `CLAUDE_OPUS_4_6` are stale: `getClaudeMaxOutputTokens()` (`src/lib/utils/tokenLimits.ts:144-146`) computes `32000` for both (`/opus[-_.]?4/` matches "opus-4" as a substring of both "claude-opus-4-20250514" and "claude-opus-4-6"). Routing `MODEL_METADATA` through the manifest — whose `maxOutputTokens` values are themselves sourced from `getClaudeMaxOutputTokens()` (Task 2) — fixes both automatically as a side effect of the migration, not a special-cased patch.

- [ ] **Step 1: Write the failing test confirming today's stale values**

```typescript
// test/tmp-anthropic-models-check.ts (throwaway, deleted in Step 4)
import {
  MODEL_METADATA,
  AnthropicModel,
} from "../src/lib/models/anthropicModels.js";
import { assert, assertEqual } from "./helpers/harness.js";

assertEqual(
  MODEL_METADATA[AnthropicModel.CLAUDE_OPUS_4].maxOutputTokens,
  64000,
  "expected today's STALE value before migration",
);
assert(
  !("CLAUDE_OPUS_4_5" in AnthropicModel),
  "CLAUDE_OPUS_4_5 should not exist yet",
);
console.log("PASS (pre-migration state confirmed)");
```

- [ ] **Step 2: Run it to confirm today's state**

Run: `npx tsx test/tmp-anthropic-models-check.ts`
Expected: `PASS (pre-migration state confirmed)` — proving the stale `64000` and the missing enum member both exist before this task's change.

- [ ] **Step 3: Add the enum members and rebuild MODEL_METADATA from the manifest**

Add to `AnthropicModel` (`src/lib/models/anthropicModels.ts:27-54`), inserting after `CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",` (line 44):

```typescript
  // Claude Opus 4.5
  CLAUDE_OPUS_4_5 = "claude-opus-4-5-20251101",

  // Claude Sonnet 4.5
  CLAUDE_SONNET_4_5 = "claude-sonnet-4-5-20250929",

  // Claude 4.5 Haiku
  CLAUDE_HAIKU_4_5 = "claude-haiku-4-5-20251001",
```

Replace the `MODEL_METADATA` object literal (`src/lib/models/anthropicModels.ts:108-234`) with a manifest-derived build. First add the import at the top of the file (after the existing `ModelAccessError` re-export, line 15):

```typescript
import { anthropicManifest } from "./manifests/anthropic.js";
```

Then replace the entire `export const MODEL_METADATA: Record<string, AnthropicModelMetadata> = { ... }` block with:

```typescript
/**
 * Model metadata by model ID, derived from the anthropic manifest
 * (src/lib/models/manifests/anthropic.ts) so this catalog can no longer
 * silently drift from the canonical source. Family/description/deprecated
 * fields — not tracked by the manifest — are supplied by the small
 * per-id lookup below, unchanged from their pre-migration values.
 */
const FAMILY_BY_MODEL: Record<string, AnthropicModelMetadata["family"]> = {
  [AnthropicModel.CLAUDE_3_HAIKU]: "haiku",
  [AnthropicModel.CLAUDE_3_5_HAIKU]: "haiku",
  [AnthropicModel.CLAUDE_3_5_SONNET]: "sonnet",
  [AnthropicModel.CLAUDE_3_5_SONNET_V2]: "sonnet",
  [AnthropicModel.CLAUDE_SONNET_4]: "sonnet",
  [AnthropicModel.CLAUDE_SONNET_4_6]: "sonnet",
  [AnthropicModel.CLAUDE_3_OPUS]: "opus",
  [AnthropicModel.CLAUDE_OPUS_4]: "opus",
  [AnthropicModel.CLAUDE_OPUS_4_6]: "opus",
  [AnthropicModel.CLAUDE_OPUS_4_5]: "opus",
  [AnthropicModel.CLAUDE_SONNET_4_5]: "sonnet",
  [AnthropicModel.CLAUDE_HAIKU_4_5]: "haiku",
};

const DESCRIPTION_BY_MODEL: Record<string, string> = {
  [AnthropicModel.CLAUDE_3_HAIKU]: "Fast and efficient model for simple tasks",
  [AnthropicModel.CLAUDE_3_5_HAIKU]:
    "Improved fast model with better performance",
  [AnthropicModel.CLAUDE_3_5_SONNET]: "Balanced model for most tasks",
  [AnthropicModel.CLAUDE_3_5_SONNET_V2]:
    "Updated Sonnet with improved capabilities",
  [AnthropicModel.CLAUDE_SONNET_4]:
    "Latest Sonnet with extended thinking support",
  [AnthropicModel.CLAUDE_3_OPUS]: "Legacy flagship model for complex tasks",
  [AnthropicModel.CLAUDE_OPUS_4]:
    "Latest flagship model with advanced reasoning",
  [AnthropicModel.CLAUDE_SONNET_4_6]:
    "Claude 4.6 Sonnet with 1M context window",
  [AnthropicModel.CLAUDE_OPUS_4_6]:
    "Claude 4.6 Opus flagship with 1M context window",
  [AnthropicModel.CLAUDE_OPUS_4_5]: "Claude 4.5 Opus flagship model",
  [AnthropicModel.CLAUDE_SONNET_4_5]: "Claude 4.5 Sonnet balanced model",
  [AnthropicModel.CLAUDE_HAIKU_4_5]: "Claude 4.5 Haiku fast model",
};

const DEPRECATED_MODELS = new Set<string>([
  AnthropicModel.CLAUDE_3_HAIKU,
  AnthropicModel.CLAUDE_3_OPUS,
]);

function metadataFromManifest(model: string): AnthropicModelMetadata {
  const entry = anthropicManifest.models[model];
  if (!entry) {
    throw new Error(
      `metadataFromManifest: no manifest entry for "${model}" — add it to ` +
        `src/lib/models/manifests/anthropic.ts before referencing it here`,
    );
  }
  return {
    displayName: entry.displayName ?? model,
    contextWindow: entry.contextWindow,
    maxOutputTokens: entry.maxOutputTokens,
    supportsVision: entry.vision,
    supportsExtendedThinking: entry.reasoning ?? false,
    supportsToolUse: entry.functionCalling,
    supportsStreaming: true,
    deprecated: DEPRECATED_MODELS.has(model),
    family: FAMILY_BY_MODEL[model] ?? "sonnet",
    description: DESCRIPTION_BY_MODEL[model] ?? entry.displayName ?? model,
  };
}

export const MODEL_METADATA: Record<string, AnthropicModelMetadata> =
  Object.fromEntries(
    Object.values(AnthropicModel).map((model) => [
      model,
      metadataFromManifest(model),
    ]),
  );
```

- [ ] **Step 4: Run the throwaway check again to confirm the fix, then delete it**

Run: `npx tsx test/tmp-anthropic-models-check.ts`
Expected: the script now **fails** its own two assertions (the whole point — it asserted the OLD stale behavior). That failure is the confirmation the migration worked. Delete the throwaway file:

```bash
rm test/tmp-anthropic-models-check.ts
```

- [ ] **Step 5: Add a permanent regression check**

```typescript
// Run inline (folded into Task 14's suite as a proper assertion — this
// script call is the "run it to verify it passes" step for this task):
```

Run: `npx tsx -e "
import { MODEL_METADATA, AnthropicModel } from './src/lib/models/anthropicModels.ts';
const opus4 = MODEL_METADATA[AnthropicModel.CLAUDE_OPUS_4].maxOutputTokens;
const opus46 = MODEL_METADATA[AnthropicModel.CLAUDE_OPUS_4_6].maxOutputTokens;
const opus45 = MODEL_METADATA[AnthropicModel.CLAUDE_OPUS_4_5].maxOutputTokens;
if (opus4 !== 32000 || opus46 !== 32000 || opus45 !== 32000) { throw new Error('maxOutputTokens still stale: ' + JSON.stringify({opus4, opus46, opus45})); }
console.log('PASS: opus maxOutputTokens corrected to', opus4, opus46, opus45);
"`
Expected: `PASS: opus maxOutputTokens corrected to 32000 32000 32000`

- [ ] **Step 6: Run the project type-check and existing subscription/model-tier consumers**

Run: `pnpm run check`
Expected: passes — confirms every consumer of `AnthropicModel`/`MODEL_METADATA` (subscription-tier gating code) still compiles against the unchanged helper signatures.

- [ ] **Step 7: Commit**

```bash
git add src/lib/models/anthropicModels.ts
git commit -m "fix(models): derive anthropicModels MODEL_METADATA from manifest, add 4.5-gen enum members"
```

---

## Task 7: Migrate contextWindows.ts

**Files:**

- Modify: `src/lib/constants/contextWindows.ts:515-574` (`getContextWindowSize`)
- Test: standalone script check (folded into Task 14's suite)

**Interfaces:**

- Consumes: `resolveManifestEntry` (Task 4)
- Produces: `getContextWindowSize(provider: string, model?: string): number` — **signature unchanged**.

**Design note.** `getContextWindowSize`'s current 5-step cascade is: dynamic-discovery registry → runtime windows (`RUNTIME_CONTEXT_WINDOWS`) → static exact match → static prefix match → provider `_default` → global `DEFAULT_CONTEXT_WINDOW` (128K). Only the **static** steps (exact/prefix/`_default`/global-default — steps 3-6) move to the manifest; the dynamic-discovery registry and `RUNTIME_CONTEXT_WINDOWS` map stay exactly as they are (they're runtime-populated state, not static data this plan owns) and continue to run **first**, preserving the documented incident fix (Claude-on-Vertex inheriting Gemini's 1,048,576 default) untouched. `normalizeProviderForLookup()`'s alias table (`PROVIDER_ALIAS_MAP`) also stays — the manifest is keyed by canonical `AIProviderName` values, and `normalizeProviderForLookup` is what turns `"googleAiStudio"`/`"lmstudio"`/etc into those canonical keys before the manifest lookup runs.

- [ ] **Step 1: Write the failing test**

```typescript
// Confirms today's static-fallback path resolves claude-sonnet-4-6 via the
// "claude-" prefix catch-all (contextWindows.ts:263-269's documented fix)
// to exactly 1_000_000 — this must still hold after migrating to the
// manifest, since the manifest's own entry for this id is also 1_000_000.
npx tsx -e "
import { getContextWindowSize } from './src/lib/constants/contextWindows.ts';
const before = getContextWindowSize('anthropic', 'claude-sonnet-4-6');
if (before !== 1_000_000) { throw new Error('expected 1000000, got ' + before); }
console.log('PASS (pre-migration): ' + before);
"
```

- [ ] **Step 2: Run it to verify it currently passes (establishes the behavior contract, not a failure)**

Run the command from Step 1.
Expected: `PASS (pre-migration): 1000000` — confirms the exact value the migration must preserve.

- [ ] **Step 3: Replace the static-fallback portion of getContextWindowSize with a manifest lookup**

Read `src/lib/constants/contextWindows.ts:515-574` in full before editing — it currently ends with the static-exact → prefix → `_default` → global-default chain reading from `MODEL_CONTEXT_WINDOWS`. Replace only that tail (everything after the dynamic-registry and `RUNTIME_CONTEXT_WINDOWS` checks) with:

```typescript
// Static fallback: manifest-backed (was MODEL_CONTEXT_WINDOWS exact/prefix/
// _default/global-default chain — see Task 7 of the model metadata
// consolidation plan). normalizeProviderForLookup still runs first so
// alias forms ("googleAiStudio", "lmstudio", …) reach the manifest under
// their canonical AIProviderName key.
const canonicalProvider = normalizeProviderForLookup(provider);
if (model) {
  const entry = resolveManifestEntry(canonicalProvider, model);
  if (entry) {
    return entry.contextWindow;
  }
}
const manifest = getManifestForProvider(canonicalProvider);
if (manifest) {
  return manifest.defaultContextWindow;
}
return DEFAULT_CONTEXT_WINDOW;
```

Add the import at the top of the file:

```typescript
import {
  resolveManifestEntry,
  getManifestForProvider,
} from "../models/manifestRegistry.js";
```

`MODEL_CONTEXT_WINDOWS` and `PROVIDER_ALIAS_MAP` stay in the file (still exported/used by other code in this file, e.g. `getOutputReserve`) — only `getContextWindowSize`'s body changes.

- [ ] **Step 4: Run the test again to verify it still passes post-migration**

Run the command from Step 1.
Expected: `PASS (pre-migration): 1000000` — identical output, now sourced from the manifest instead of `MODEL_CONTEXT_WINDOWS`.

- [ ] **Step 5: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants/contextWindows.ts
git commit -m "refactor(constants): migrate getContextWindowSize static fallback to manifest"
```

---

## Task 8: Migrate pricing.ts

**Files:**

- Modify: `src/lib/utils/pricing.ts:643-744` (`findRates`)
- Test: standalone script check (folded into Task 14's suite)

**Interfaces:**

- Consumes: `resolveManifestEntryExact` (Task 4)
- Produces: `findRates(provider: string, model: string)` (module-private, unchanged signature — still returns `{input, output, cacheRead?, cacheCreation?} | undefined`), `calculateCost()`, `hasPricing()` — **all unchanged signatures**, both barrel-exported from `src/lib/index.ts`.

**Design note.** `findRates`'s current body: normalize provider via `PROVIDER_ALIASES`, handle the `__cross_provider__` sentinel (litellm/openrouter/openaicompatible proxy through to whatever `providerPricing` search the caller's actual model implies), strip Bedrock ARN/vendor prefixes, exact match, longest-prefix match, Vertex→Google-Gemini fallback (must run before `_default`), then provider-level `_default`. Only the "exact match, longest-prefix match" core (`src/lib/utils/pricing.ts:700-712`) becomes a manifest call — the `__cross_provider__` proxy search, Bedrock ARN-stripping, and Vertex→Google-Gemini special case all stay exactly as they are, calling the manifest-backed core recursively/directly where they previously indexed into `PRICING` directly. This is exactly why Task 4 built `resolveManifestEntryExact` (no implicit `_default`) as a separate primitive from `resolveManifestEntry`: the Vertex→Google-Gemini fallback must still run **before** any `_default`, and using `resolveManifestEntryExact` here (never falling back to `_default` on its own) preserves that exact ordering.

- [ ] **Step 1: Write the failing test**

```typescript
// Confirms today's exact behavior for three cases the migration must not
// change: a normal exact match, a Bedrock ARN-prefixed id, and the
// Vertex-Gemini cross-provider fallback.
npx tsx -e "
import { calculateCost, hasPricing } from './src/lib/index.ts';
const gpt4o = calculateCost('openai', 'gpt-4o', 1000, 1000);
const bedrockClaude = hasPricing('bedrock', 'arn:aws:bedrock:us-east-1:123:inference-profile/us.anthropic.claude-opus-4-1-20250805-v1:0');
const vertexGemini = hasPricing('vertex', 'gemini-2.5-pro');
if (gpt4o !== 0.0125) { throw new Error('gpt4o cost wrong: ' + gpt4o); }
if (!bedrockClaude) { throw new Error('bedrock ARN pricing lookup failed'); }
if (!vertexGemini) { throw new Error('vertex gemini fallback pricing lookup failed'); }
console.log('PASS (pre-migration):', gpt4o, bedrockClaude, vertexGemini);
"
```

- [ ] **Step 2: Run it to confirm today's baseline**

Run the command from Step 1.
Expected: `PASS (pre-migration): 0.0125 true true`

- [ ] **Step 3: Replace findRates's exact/prefix core with a manifest call**

Read `src/lib/utils/pricing.ts:643-744` in full before editing. Replace only the "Exact match" + "Longest-prefix match" block (`:700-712`, the code between the Bedrock `modelKey` computation and the Vertex→Google-Gemini fallback comment) with:

```typescript
// Exact + longest-prefix match: manifest-backed (was direct PRICING[...]
// indexing — see Task 8 of the model metadata consolidation plan).
// resolveManifestEntryExact deliberately never falls back to the
// provider's own `_default` here, so the Vertex→Google-Gemini fallback
// immediately below still runs before any `_default` short-circuit.
const manifestEntry = resolveManifestEntryExact(normalizedProvider, modelKey);
if (manifestEntry?.pricingPerMTok) {
  return {
    input: manifestEntry.pricingPerMTok.input / 1_000_000,
    output: manifestEntry.pricingPerMTok.output / 1_000_000,
    cacheRead:
      manifestEntry.pricingPerMTok.cacheRead !== undefined
        ? manifestEntry.pricingPerMTok.cacheRead / 1_000_000
        : undefined,
    cacheCreation:
      manifestEntry.pricingPerMTok.cacheWrite !== undefined
        ? manifestEntry.pricingPerMTok.cacheWrite / 1_000_000
        : undefined,
  };
}
```

Add the import at the top of the file:

```typescript
import { resolveManifestEntryExact } from "../models/manifestRegistry.js";
```

The private `PRICING` const and the rest of `findRates` (Vertex→Google-Gemini fallback, provider-level `_default` fallback) stay as-is — they read `PRICING` directly for the two fallback branches only, which this task does not touch (`PRICING["google"]` for the Vertex fallback and `PRICING[normalizedProvider]._default` for the provider fallback are both still real, still-needed code paths; migrating them is out of scope for this task since only `anthropic`/`openai` have hand-authored manifests with real per-model pricing today, and `google`'s Gemini pricing has no manifest entry yet — Task 5's `google-ai` manifest generation, not this task, is what will eventually let this fallback route through the manifest too).

- [ ] **Step 4: Run the test again to verify it still passes**

Run the command from Step 1.
Expected: `PASS (pre-migration): 0.0125 true true` — identical output. The `gpt4o`/`bedrockClaude` cases now resolve through the manifest; `vertexGemini` still resolves through the untouched `PRICING["google"]` fallback path (unaffected by this task).

- [ ] **Step 5: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/pricing.ts
git commit -m "refactor(pricing): migrate findRates exact/prefix core to manifest"
```

---

## Task 9: Migrate modelRegistry.ts

**Files:**

- Modify: `src/lib/models/modelRegistry.ts` — replace the hand-authored `MODEL_REGISTRY` object literal (`:28-2330`, the exact range covering all `[OpenAIModels.X]`/`[AnthropicModels.X]` entries) with `buildModelRegistryFromManifests()`; replace `getAvailableProviders()` (`:2558-2564`)
- Verify only, no edit: `src/cli/commands/models.ts:17-32,168-182` — confirmed below to already source its `--provider` choices dynamically from the function this task replaces
- Test: standalone script checks (folded into Task 14's suite)

**Interfaces:**

- Consumes: `getAllManifestProviders`, `getManifestForProvider` (Task 4)
- Produces: `MODEL_REGISTRY: Record<string, ModelInfo>` (same exported const, now built by a function instead of a literal), `getAllModels()`, `getModelById()`, `modelSupports()`, `getModelsByProvider()`, `calculateCost()` (the `ModelInfo`-based one — distinct from `pricing.ts`'s usage-based `calculateCost`, see the design note below), `formatModelForDisplay()`, `getAvailableProviders(): AIProviderName[]` — **every signature unchanged**. `MODEL_ALIASES` (built by iterating `MODEL_REGISTRY`, `:2332-2339`) is unaffected since it derives from whatever `MODEL_REGISTRY` ends up containing. `SAMPLING_PARAM_REJECTING_FAMILIES`/`modelSupportsSamplingParams`/`resolveSamplingParams` (`:2477+`) are untouched — out of scope, not one of the five stores, and other consumers (`ClassifierRouter`) depend on them working unchanged.

**Design note — the `ModelPricingInfo` required-fields gap.** `ModelInfo.pricing: ModelPricingInfo` (`src/lib/types/model.ts:184`) requires non-optional `inputCostPer1K`/`outputCostPer1K`/`currency` (confirmed: `src/lib/types/model.ts:137-141` has no `?` on any of the three fields). The manifest's `pricingPerMTok` is deliberately optional (Task 1). Rather than fabricate a price or loosen `ModelPricingInfo`'s contract (a breaking type change affecting every existing consumer, well beyond this task's scope), `buildModelRegistryFromManifests()` only promotes a manifest entry into `MODEL_REGISTRY` when it is a real, non-`"_default"` model id **and** carries `pricingPerMTok`. This is not a loss of information relative to today: `MODEL_REGISTRY` currently has zero entries for any of the 23 minimal providers and zero entries for un-priced models like `claude-sonnet-5` (it was never in `MODEL_REGISTRY` in the first place — the pre-migration file's Anthropic keys are exactly the 5 confirmed at `CLAUDE_OPUS_4_5`/`CLAUDE_SONNET_4_5`/`CLAUDE_4_5_HAIKU`/`CLAUDE_3_5_SONNET`/`CLAUDE_3_5_HAIKU`, none of which is `claude-sonnet-5`). The migration is a **net expansion**: Anthropic goes from 5 stale `MODEL_REGISTRY` entries to 14 (all manifest ids except `claude-sonnet-5`, which stays correctly absent), filling in real, previously-missing entries like `claude-opus-4-6`/`claude-sonnet-4-6`/`claude-3-7-sonnet` that `pricing.ts`/`contextWindows.ts` already knew about but `MODEL_REGISTRY` never did. OpenAI goes from 21 entries (including the dead `o1-preview`) to 20 (every live model — `o1-preview` correctly dropped since it's `@deprecated`/turned off).

`getAvailableProviders()` does **not** derive from the rebuilt `MODEL_REGISTRY` — a registry keyed only by "real, priced, named models" would still under-report providers whose manifest only has a `_default` entry (all 23 minimal providers). Instead it reads `getAllManifestProviders()` directly, mapped straight to `AIProviderName` (no translation needed: manifest keys are literally the enum's kebab-case values by construction, Task 2's design note) — giving the full 30-provider answer scope item 7 asks for, decoupled from `MODEL_REGISTRY` membership entirely.

**Design note — `performance`/`useCases`/`category` preservation via `curated`.** `ModelInfo.performance`/`useCases`/`category` (`ModelPerformance`/`UseCaseSuitability`/`ModelInfo["category"]`, `src/lib/types/model.ts:146-192`) are hand-tuned subjective scores that most of the manifest's fields don't otherwise track. For the 25 ids that already carried a `MODEL_REGISTRY` entry before this migration — the 5 Anthropic ids and all 20 OpenAI ids, each populated with a `curated` block in Task 2/Task 3 containing that exact pre-migration `performance`/`useCases`/`category` triple — `buildModelRegistryFromManifests()` reads `entry.curated` first and reproduces those values byte-for-byte. This is what makes the "exact old output is preserved" claim in this task's equality test actually true for these three fields, not just for pricing/limits/capabilities: nothing about `performance`/`useCases`/`category` changes for any id that had a hand-tuned value before. For every other id — the other 10 Anthropic ids (`claude-sonnet-5`, `claude-opus-4-6`, etc., none of which ever had a `MODEL_REGISTRY` row to preserve) and every model belonging to the 28 minimal-tier providers — there is no prior hand-tuned value to preserve, so `buildModelRegistryFromManifests()` derives `performance`/`useCases`/`category` **mechanically** from the tracked capability flags: a deterministic, documented, non-fabricated (if coarser) replacement, and the only approach that scales to 200 providers where hand-tuning subjective 1-10 scores per model does not.

`ModelCapabilities` (`src/lib/types/model.ts:116-131`) has three fields the manifest doesn't track (`codeGeneration`, `multimodal`, `streaming`). `codeGeneration`/`streaming` default to `true` (near-universal across the existing registry); `multimodal` is derived as `vision || nativeAudio === true`.

- [ ] **Step 1: Write the failing test**

```typescript
// Confirms today's pre-migration MODEL_REGISTRY membership: claude-sonnet-5
// absent, exactly 5 anthropic entries, o1-preview present.
npx tsx -e "
import { getModelById, getModelsByProvider, getAvailableProviders } from './src/lib/models/modelRegistry.ts';
import { AIProviderName } from './src/lib/constants/enums.ts';
const anthropicModels = getModelsByProvider(AIProviderName.ANTHROPIC);
const providers = getAvailableProviders();
if (getModelById('claude-sonnet-5') !== undefined) { throw new Error('claude-sonnet-5 unexpectedly present'); }
if (anthropicModels.length !== 5) { throw new Error('expected 5 anthropic entries, got ' + anthropicModels.length); }
if (getModelById('o1-preview') === undefined) { throw new Error('o1-preview unexpectedly absent'); }
if (providers.length !== 7) { throw new Error('expected 7 providers, got ' + providers.length); }
console.log('PASS (pre-migration):', anthropicModels.length, providers.length);
"
```

- [ ] **Step 2: Run it to confirm today's baseline**

Run the command from Step 1.
Expected: `PASS (pre-migration): 5 7`

- [ ] **Step 3: Replace the MODEL_REGISTRY literal and getAvailableProviders**

Read `src/lib/models/modelRegistry.ts:1-30` and `:2320-2340` and `:2555-2565` in full before editing (import block, the line immediately before/after the literal, and the current `getAvailableProviders` body) to confirm exact boundaries. Replace the entire `export const MODEL_REGISTRY: Record<string, ModelInfo> = { ... };` literal (`:28-2330`) with:

```typescript
import {
  getAllManifestProviders,
  getManifestForProvider,
} from "./manifestRegistry.js";

function deriveSpeed(id: string): ModelPerformance["speed"] {
  if (/mini|nano|haiku|flash|lite/i.test(id)) {
    return "fast";
  }
  if (/opus|^o1|^o3|-pro$/i.test(id)) {
    return "slow";
  }
  return "medium";
}

function deriveQuality(
  entry: ProviderModelManifestEntry,
): ModelPerformance["quality"] {
  return entry.reasoning ? "high" : "medium";
}

/**
 * Builds MODEL_REGISTRY from every manifest provider's models, promoting
 * only entries that carry pricingPerMTok (ModelInfo.pricing is a required
 * field — see Task 9's design note in the model metadata consolidation
 * plan for why un-priced and _default-only entries are excluded here).
 *
 * performance/useCases/category use entry.curated verbatim when present —
 * the 25 ids (5 Anthropic, 20 OpenAI) that already had a hand-tuned
 * MODEL_REGISTRY row before this migration carry that exact triple forward
 * unchanged. Every other entry has no curated block and falls back to
 * mechanical derivation from the tracked capability flags — the manifest
 * doesn't carry subjective scores for ids that never had them.
 */
function buildModelRegistryFromManifests(): Record<string, ModelInfo> {
  const registry: Record<string, ModelInfo> = {};
  for (const provider of getAllManifestProviders()) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    for (const [id, entry] of Object.entries(manifest.models)) {
      if (id === "_default" || !entry.pricingPerMTok) {
        continue;
      }
      const reasoningScore = entry.reasoning ? 9 : 6;
      registry[id] = {
        id,
        name: entry.displayName ?? id,
        provider: provider as AIProviderName,
        description: entry.displayName ?? id,
        capabilities: {
          vision: entry.vision,
          functionCalling: entry.functionCalling,
          codeGeneration: true,
          reasoning: entry.reasoning ?? false,
          multimodal: entry.vision || entry.nativeAudio === true,
          streaming: true,
          jsonMode: entry.jsonMode ?? false,
          samplingParams: entry.samplingParams,
        },
        pricing: {
          inputCostPer1K: entry.pricingPerMTok.input / 1000,
          outputCostPer1K: entry.pricingPerMTok.output / 1000,
          currency: "USD",
        },
        performance: entry.curated?.performance ?? {
          speed: deriveSpeed(id),
          quality: deriveQuality(entry),
          accuracy: deriveQuality(entry),
        },
        limits: {
          maxContextTokens: entry.contextWindow,
          maxOutputTokens: entry.maxOutputTokens,
        },
        useCases: entry.curated?.useCases ?? {
          coding: entry.functionCalling ? 8 : 5,
          creative: entry.vision ? 7 : 6,
          analysis: reasoningScore,
          conversation: 7,
          reasoning: reasoningScore,
          translation: 6,
          summarization: 7,
        },
        aliases: entry.aliases,
        deprecated: false,
        isLocal:
          provider === "ollama" ||
          provider === "lm-studio" ||
          provider === "llamacpp",
        category:
          entry.curated?.category ??
          (entry.reasoning ? "reasoning" : "general"),
      };
    }
  }
  return registry;
}

export const MODEL_REGISTRY: Record<string, ModelInfo> =
  buildModelRegistryFromManifests();
```

Add `ProviderModelManifestEntry` and `ModelPerformance` to the file's existing type-only import block (both from `../types/index.js`, per barrel rule 13).

Replace `getAvailableProviders()` (`:2558-2564`):

```typescript
export function getAvailableProviders(): AIProviderName[] {
  return getAllManifestProviders() as AIProviderName[];
}
```

- [ ] **Step 4: Run the test again — it should now FAIL on the two counts the migration deliberately changes**

Run the command from Step 1.
Expected: throws `expected 5 anthropic entries, got 14` (or similar) and/or `expected 7 providers, got 30` — this failure is the confirmation the migration worked; the test encoded the OLD contract on purpose.

- [ ] **Step 5: Write the permanent post-migration assertions**

Run:

```bash
npx tsx -e "
import { getModelById, getModelsByProvider, getAvailableProviders } from './src/lib/models/modelRegistry.ts';
import { AIProviderName } from './src/lib/constants/enums.ts';
const anthropicModels = getModelsByProvider(AIProviderName.ANTHROPIC);
const providers = getAvailableProviders();
if (getModelById('claude-sonnet-5') !== undefined) { throw new Error('claude-sonnet-5 should stay absent (no verified pricing)'); }
if (anthropicModels.length !== 14) { throw new Error('expected 14 anthropic entries, got ' + anthropicModels.length); }
if (getModelById('o1-preview') !== undefined) { throw new Error('o1-preview should be dropped (deprecated)'); }
if (providers.length !== 30) { throw new Error('expected 30 providers, got ' + providers.length); }
if (!providers.includes(AIProviderName.VOYAGE)) { throw new Error('voyage missing from getAvailableProviders'); }

// curated preservation: gpt-4o had a hand-tuned MODEL_REGISTRY row before
// this migration (performance: medium/high/high, useCases per below,
// category general) — these must come through byte-for-byte via entry.curated.
const gpt4o = getModelById('gpt-4o');
if (!gpt4o) { throw new Error('gpt-4o missing from post-migration registry'); }
if (gpt4o.performance.speed !== 'medium' || gpt4o.performance.quality !== 'high' || gpt4o.performance.accuracy !== 'high') {
throw new Error('gpt-4o performance drifted from its curated MODEL_REGISTRY value: ' + JSON.stringify(gpt4o.performance));
}
if (gpt4o.useCases.coding !== 9 || gpt4o.useCases.creative !== 8 || gpt4o.useCases.analysis !== 9 || gpt4o.useCases.conversation !== 9 || gpt4o.useCases.reasoning !== 9 || gpt4o.useCases.translation !== 8 || gpt4o.useCases.summarization !== 8) {
throw new Error('gpt-4o useCases drifted from its curated MODEL_REGISTRY value: ' + JSON.stringify(gpt4o.useCases));
}
if (gpt4o.category !== 'general') { throw new Error('gpt-4o category drifted from its curated MODEL_REGISTRY value: ' + gpt4o.category); }

// mechanical derivation: claude-opus-4-6 never had a MODEL_REGISTRY row
// before this migration (Anthropic went from 5 to 14 entries), so it has
// no curated block — performance/category must come from deriveSpeed/
// deriveQuality/the reasoning-based category fallback, not from curated.
const opus46 = getModelById('claude-opus-4-6');
if (!opus46) { throw new Error('claude-opus-4-6 missing from post-migration registry'); }
if (opus46.performance.speed !== 'slow') {
throw new Error('claude-opus-4-6 mechanical speed derivation broke: expected slow (matches /opus/i), got ' + opus46.performance.speed);
}
if (opus46.category !== 'reasoning') {
throw new Error('claude-opus-4-6 mechanical category derivation broke: expected reasoning (entry.reasoning is true), got ' + opus46.category);
}

console.log('PASS (post-migration):', anthropicModels.length, providers.length);
"
```

Expected: `PASS (post-migration): 14 30`

- [ ] **Step 6: Verify the CLI's `models --provider` choices already follow getAvailableProviders — no code change needed**

This step requires no edit. Confirmed by reading the live source: `src/cli/commands/models.ts:17-32` imports `getAvailableProviders` directly from `modelRegistry.js`:

```typescript
import {
  getAllModels,
  getModelsByProvider,
  getAvailableProviders,
  formatModelForDisplay,
} from "../../lib/models/modelRegistry.js";
```

And `ModelsCommandFactory`'s private `buildListOptions()` (`src/cli/commands/models.ts:171-182`) already wires it straight into the `--provider` option's `choices`:

```typescript
private static buildListOptions(yargs: Argv): Argv {
  return yargs
    .option("provider", {
      choices: getAvailableProviders(),
      description: "Filter by AI provider",
    })
    .option("category", {
      choices: ["general", "coding", "creative", "vision", "reasoning"],
      description: "Filter by model category",
    })
    ...
```

`choices: getAvailableProviders()` is evaluated at option-build time (yargs command construction), which runs after this task's module-level `MODEL_REGISTRY`/`getAvailableProviders` initialization in `modelRegistry.ts` — so once Step 3 lands, `getAvailableProviders()` here automatically returns the new 30-provider list with zero edits to `models.ts`. (Note: `src/cli/factories/commandFactory.ts`'s `createModelsCommands()` is a one-line delegator — `return ModelsCommandFactory.createModelsCommands();` — the real option logic lives entirely in `src/cli/commands/models.ts`, not in `commandFactory.ts` itself.) Confirm this by running Step 7's CLI smoke test and checking `--help` output lists all 30 providers, not the pre-migration 7.

- [ ] **Step 7: Run the project type-check, build, and CLI smoke test**

Run: `pnpm run check && pnpm run build:cli && pnpm run cli models --provider anthropic && pnpm run cli models --help`
Expected: type-check and build pass; the `--provider anthropic` command lists Anthropic models without error; the `--help` output's `--provider` choices list includes all 30 providers (e.g. `voyage`, `jina`, `stability` now appear — none of the 23 minimal-tier providers were selectable before this task).

- [ ] **Step 8: Commit**

```bash
git add src/lib/models/modelRegistry.ts
git commit -m "refactor(models): build MODEL_REGISTRY from manifests, derive getAvailableProviders from all 30 providers"
```

---

## Task 10: Migrate providerImageAdapter.ts

**Files:**

- Modify: `src/lib/adapters/providerImageAdapter.ts:650-680` (`supportsVision`), `:107+` (keep `VISION_CAPABILITIES`/`VISION_FAMILY_RULES` as fallback for providers without a manifest entry — see design note)
- Test: standalone script checks (folded into Task 14's suite)

**Interfaces:**

- Consumes: `resolveManifestEntryExact` (Task 4)
- Produces: `ProviderImageAdapter.supportsVision(provider: string, model?: string): boolean`, `getSupportedModels(provider: string): string[]`, `getVisionProviders(): string[]` — **all unchanged signatures**.

**Design note.** `supportsVision`'s current cascade: normalize provider → Anthropic-with-`ANTHROPIC_BASE_URL`-env special case (proxy override, untouched — not model metadata) → `VISION_CAPABILITIES[provider]` lookup → no-model short-circuit → substring match → `VISION_FAMILY_RULES` regex fallback → `PROXY_PROVIDERS` pass-through. The manifest's `vision` boolean plus its own `familyRules` cover the "substring match" and "family regex" steps together (Task 2's anthropic manifest already embeds the same two `CLAUDE_MODERN_VISION_FAMILIES` regexes as `familyRules`, applied by `resolveManifestEntryExact` itself — Task 4). The `ANTHROPIC_BASE_URL` env override and `PROXY_PROVIDERS` pass-through are provider-routing concerns, not model metadata — both stay in `providerImageAdapter.ts` untouched, running before and after the manifest call respectively, exactly as they do today relative to `VISION_CAPABILITIES`.

- [ ] **Step 1: Write the failing test**

```typescript
// Confirms today's behavior for three cases spanning every branch this
// migration touches: an explicit-list hit, a family-rule hit (unlisted
// gateway-shaped id), and the documented non-vision exception.
npx tsx -e "
import { ProviderImageAdapter } from './src/lib/adapters/providerImageAdapter.ts';
const explicit = ProviderImageAdapter.supportsVision('openai', 'gpt-4o');
const familyRule = ProviderImageAdapter.supportsVision('anthropic', 'claude-opus-4-7-20260115');
const nonVision = ProviderImageAdapter.supportsVision('anthropic', 'claude-3-5-haiku-20241022');
if (!explicit) { throw new Error('gpt-4o should support vision'); }
if (!familyRule) { throw new Error('unlisted modern opus id should match family rule'); }
if (nonVision) { throw new Error('claude-3-5-haiku must stay non-vision'); }
console.log('PASS (pre-migration):', explicit, familyRule, nonVision);
"
```

- [ ] **Step 2: Run it to confirm today's baseline**

Run the command from Step 1.
Expected: `PASS (pre-migration): true true false`

- [ ] **Step 3: Route supportsVision through the manifest, falling back to the legacy tables for un-manifested providers**

Read `src/lib/adapters/providerImageAdapter.ts:650-680` in full before editing. Replace the body between the `ANTHROPIC_BASE_URL` special case and the `try`/`catch`'s closing return with:

```typescript
const manifestEntry = resolveManifestEntryExact(
  normalizedProvider,
  model ?? "",
);
if (manifestEntry) {
  if (!model) {
    return true;
  }
  if (manifestEntry.vision) {
    return true;
  }
  if (PROXY_PROVIDERS.has(normalizedProvider)) {
    return true;
  }
  return false;
}
// No manifest entry (unmapped provider or a model id the manifest
// doesn't recognize even via prefix match): fall back to the legacy
// VISION_CAPABILITIES table so a provider not yet given a full
// manifest keeps working exactly as before.
const supportedModels =
  VISION_CAPABILITIES[normalizedProvider as keyof typeof VISION_CAPABILITIES];
if (!supportedModels) {
  return false;
}
if (supportedModels.length === 0) {
  return false;
}
if (!model) {
  return true;
}
const modelMatched = supportedModels.some((supportedModel) =>
  model.toLowerCase().includes(supportedModel.toLowerCase()),
);
if (
  !modelMatched &&
  VISION_FAMILY_RULES[normalizedProvider]?.some((rule) => rule.test(model))
) {
  return true;
}
if (!modelMatched && PROXY_PROVIDERS.has(normalizedProvider)) {
  return true;
}
return modelMatched;
```

Add the import at the top of the file:

```typescript
import { resolveManifestEntryExact } from "../models/manifestRegistry.js";
```

`getSupportedModels`/`getVisionProviders` stay unchanged — they read `VISION_CAPABILITIES` directly and are documented as reading the legacy table specifically (their docblocks don't claim manifest-derived completeness), so no behavior change is implied for them by this task.

- [ ] **Step 4: Run the test again to verify it still passes**

Run the command from Step 1.
Expected: `PASS (pre-migration): true true false` — identical output. `gpt-4o` and the family-rule case now resolve through the manifest (both providers have full manifests); `claude-3-5-haiku` correctly still returns `false` since its manifest entry has `vision: false` and no family rule matches it.

- [ ] **Step 5: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/adapters/providerImageAdapter.ts
git commit -m "refactor(adapters): migrate ProviderImageAdapter.supportsVision to manifest with legacy fallback"
```

---

## Task 11: Migrate core/constants.ts (PROVIDER_MAX_TOKENS) and resolve the Claude max-tokens contradiction

**Files:**

- Modify: `src/lib/core/constants.ts:175-224` (`PROVIDER_MAX_TOKENS`)
- Test: standalone script checks (folded into Task 14's suite)

**Interfaces:**

- Consumes: `anthropicManifest` (Task 2), `getAllManifestProviders`, `getManifestForProvider` (Task 4)
- Produces: `PROVIDER_MAX_TOKENS: Record<string, {default: number} & Record<string, number>>` — **unchanged shape and export name**; `getSafeMaxTokens()` (`src/lib/utils/tokenLimits.ts`) — **unchanged signature**, its per-model override branch (`providerLimits[model]`, already present in the existing code) now actually has per-model data to find for Anthropic.

**Design note — the documented contradiction.** `getSafeMaxTokens()` and `resolveClaudeMaxTokens()` (both `src/lib/utils/tokenLimits.ts`) both claim to answer "what's the max output for this Anthropic model" and disagree: `resolveClaudeMaxTokens("claude-opus-4-6")` correctly returns `32000` via the regex ladder (`getClaudeMaxOutputTokens`, `:141-170`), but `getSafeMaxTokens("anthropic", "claude-opus-4-6")` returns `64000` — it never calls `resolveClaudeMaxTokens`/`getClaudeMaxOutputTokens` at all; it only reads `PROVIDER_MAX_TOKENS.anthropic`, which today is a single flat `{ default: 64000 }` with no per-model entries (confirmed: `src/lib/core/constants.ts:176`). `getSafeMaxTokens`'s own logic (`src/lib/utils/tokenLimits.ts:93-98`) **already** checks `providerLimits[model]` before falling back to `.default` — the function was written to support per-model overrides, it simply never had any data to find. This task fixes the contradiction by populating `PROVIDER_MAX_TOKENS[provider]` with a genuine per-model-id entry for every manifest model, generated mechanically, so `getSafeMaxTokens`'s existing override branch starts finding real data instead of falling through to the coarse default — with zero changes to `getSafeMaxTokens`'s own logic.

- [ ] **Step 1: Write the failing test**

```typescript
// Confirms today's contradiction: getSafeMaxTokens disagrees with
// resolveClaudeMaxTokens for an Opus-family model.
npx tsx -e "
import { getSafeMaxTokens, resolveClaudeMaxTokens } from './src/lib/utils/tokenLimits.ts';
const safe = getSafeMaxTokens('anthropic', 'claude-opus-4-6');
const claude = resolveClaudeMaxTokens('claude-opus-4-6');
console.log('pre-migration:', safe, claude);
if (safe === claude) { throw new Error('expected a contradiction before migration, found agreement: ' + safe); }
console.log('PASS (contradiction confirmed)');
"
```

- [ ] **Step 2: Run it to confirm the contradiction exists**

Run the command from Step 1.
Expected: `pre-migration: 64000 32000` then `PASS (contradiction confirmed)`.

- [ ] **Step 3: Populate PROVIDER_MAX_TOKENS with per-model overrides from the manifest**

Read `src/lib/core/constants.ts:175-224` in full before editing. Replace the `PROVIDER_MAX_TOKENS` literal with a manifest-derived build, keeping the exact same declared shape (a `default` key plus optional per-model keys, per-provider):

```typescript
import {
  getAllManifestProviders,
  getManifestForProvider,
} from "../models/manifestRegistry.js";

/**
 * Per-model output-token ceilings, generated from each provider's manifest
 * (src/lib/models/manifests/). Every manifest model becomes an explicit
 * override on top of the provider's flat default — this is what resolves
 * the historical contradiction between getSafeMaxTokens() (this table) and
 * resolveClaudeMaxTokens() (the Claude-specific regex ladder in
 * tokenLimits.ts): both now agree because getSafeMaxTokens's existing
 * per-model lookup (tokenLimits.ts:93-98) has real per-model data to find
 * instead of always falling through to a single coarse default.
 */
function buildProviderMaxTokens(): Record<
  string,
  { default: number } & Record<string, number>
> {
  const result: Record<string, { default: number } & Record<string, number>> = {
    default: 64000,
  } as Record<string, { default: number } & Record<string, number>>;
  for (const provider of getAllManifestProviders()) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    const perModel: Record<string, number> = {};
    for (const [id, entry] of Object.entries(manifest.models)) {
      if (id === "_default") {
        continue;
      }
      perModel[id] = entry.maxOutputTokens;
    }
    result[provider] = {
      default:
        manifest.models._default?.maxOutputTokens ??
        manifest.defaultContextWindow,
      ...perModel,
    } as { default: number } & Record<string, number>;
  }
  return result;
}

export const PROVIDER_MAX_TOKENS: Record<
  string,
  { default: number } & Record<string, number>
> = buildProviderMaxTokens();
```

This preserves every existing provider key (`anthropic`, `openai`, `google-ai`, `vertex`, `bedrock`, `azure`, `mistral`, `ollama`, `litellm`, plus the top-level `default`) since all of them are manifest providers post-Task-5, and their `.default` values match today's hand-authored numbers for providers whose manifest `_default` entry mirrors the old flat value (verify in Step 4).

- [ ] **Step 4: Run the test again — it should now report agreement**

Run the command from Step 1.
Expected: throws on the `if (safe === claude)` check being inverted — replace the script's assertion for this run to confirm the fix directly:

Run: `npx tsx -e "
import { getSafeMaxTokens, resolveClaudeMaxTokens } from './src/lib/utils/tokenLimits.ts';
const safe = getSafeMaxTokens('anthropic', 'claude-opus-4-6');
const claude = resolveClaudeMaxTokens('claude-opus-4-6');
console.log('post-migration:', safe, claude);
if (safe !== claude) { throw new Error('still contradicting: ' + safe + ' vs ' + claude); }
console.log('PASS: getSafeMaxTokens and resolveClaudeMaxTokens now agree at', safe);
"`
Expected: `post-migration: 32000 32000` then `PASS: getSafeMaxTokens and resolveClaudeMaxTokens now agree at 32000`.

- [ ] **Step 5: Verify other providers' flat defaults are unaffected**

Run: `npx tsx -e "
import { getSafeMaxTokens } from './src/lib/utils/tokenLimits.ts';
const openaiDefault = getSafeMaxTokens('openai', 'some-unlisted-future-model');
const azureDefault = getSafeMaxTokens('azure');
console.log(openaiDefault, azureDefault);
if (openaiDefault !== 128000) { throw new Error('openai default regressed: ' + openaiDefault); }
if (azureDefault !== 128000) { throw new Error('azure default regressed: ' + azureDefault); }
console.log('PASS: unlisted-model defaults unchanged');
"`
Expected: `128000 128000` then `PASS: unlisted-model defaults unchanged`.

- [ ] **Step 6: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/core/constants.ts
git commit -m "fix(constants): generate PROVIDER_MAX_TOKENS per-model overrides from manifest, resolve getSafeMaxTokens/resolveClaudeMaxTokens contradiction"
```

---

## Task 12: ClassifierRouter observability + ranking fix

**Files:**

- Modify: `src/lib/routing/classifierRouter.ts:220-251` (`rank()`), `:281-340` (`metaFor()`)
- Test: `test/continuous-test-suite-model-manifests.ts` adds two assertions in Task 14; this task's own verification is a standalone script check.

**Interfaces:**

- Consumes: nothing new (uses the already-injected `this.deps.logger` of type `ClassifierLogger`, `src/lib/types/classifierRouter.ts:205-208`, and the existing `ModelResolver.resolveModel` call already inside `metaFor()`)
- Produces: no new exported symbols — `rank()` and `metaFor()` keep their existing signatures; only their internal behavior changes.

**Design note.** `metaFor()` currently wraps `ModelResolver.resolveModel(member.model)` in a bare `catch { /* Enrichment is best-effort; ignore registry lookup failures. */ }` (`:326-328`) with **no branch at all** for the equally-common "resolved successfully but returned `null`" case — a silent miss is indistinguishable from a silent success at the call site. This task adds `this.deps.logger?.debug?.()` for the no-match case (routine, expected for any model not yet in the registry — a `debug`, not a `warn`) and keeps `this.deps.logger?.warn?.()` for genuine thrown exceptions (unexpected). `rank()`'s `num(v) = typeof v === "number" ? v : NEUTRAL` (`:226`, `NEUTRAL = 0.5`) currently substitutes a fixed midpoint for any candidate missing cost/quality data, silently biasing cost-ascending and quality-descending orderings toward the middle instead of excluding genuinely unmeasured candidates from the ranked comparison — this task changes candidates with **both** cost and quality `undefined` to sort **after** every candidate that has real data (order preserved among themselves), rather than being interleaved via the arbitrary `0.5` fill.

- [ ] **Step 1: Write the failing test for metaFor's silent catch-all**

```typescript
// Confirms today's silent behavior: a spy logger sees zero calls even
// though metaFor is given a query guaranteed to miss the registry.
npx tsx -e "
import { ClassifierRouter } from './src/lib/routing/classifierRouter.ts';
const calls: string[] = [];
const router = new ClassifierRouter({
  logger: {
    debug: (m: string) => calls.push('debug:' + m),
    warn: (m: string) => calls.push('warn:' + m),
  },
} as never);
// @ts-expect-error accessing private method for the pre-migration behavior check
router.metaFor({ provider: 'openai', model: 'totally-unregistered-model-xyz' });
console.log('calls:', calls.length);
if (calls.length !== 0) { throw new Error('expected zero log calls pre-migration, got ' + calls.length); }
console.log('PASS (pre-migration): silent miss confirmed');
"
```

Expected: since `ClassifierRouter`'s constructor and `metaFor`'s exact private-method access pattern depend on its full type (`src/lib/types/classifierRouter.ts`), run this against the actual class shape — if `metaFor` is not directly callable from outside (private/unexported from the class's public surface), adapt the script to go through the router's public `rank()`/`selectTools()` entry point with a model guaranteed to miss the registry instead, keeping the same assertion (`calls.length === 0` pre-migration).

- [ ] **Step 2: Run it to confirm today's silent behavior**

Run the command from Step 1 (or its `rank()`-based adaptation).
Expected: `PASS (pre-migration): silent miss confirmed`.

- [ ] **Step 3: Add differentiated logging to metaFor**

This is the exact, current, verbatim body of `metaFor()` at `src/lib/routing/classifierRouter.ts:281-340` (read it yourself to confirm before editing — do not trust this transcription blindly, but it was captured directly from the file):

```typescript
  private metaFor(member: ClassifierRouterPoolMember): ClassifierModelMeta {
    const key = `${member.provider}::${member.model ?? ""}`;
    const cached = this.metaCache.get(key);
    if (cached) {
      return cached;
    }

    let cost = member.cost;
    let quality = member.quality;
    let capabilities = member.capabilities
      ? [...member.capabilities]
      : undefined;

    const needsEnrichment =
      cost === undefined || quality === undefined || capabilities === undefined;
    if (needsEnrichment && member.model) {
      try {
        const info = ModelResolver.resolveModel(member.model);
        if (info) {
          if (cost === undefined) {
            cost = info.pricing.inputCostPer1K + info.pricing.outputCostPer1K;
          }
          if (quality === undefined) {
            quality = QUALITY_SCORE[info.performance.quality] ?? NEUTRAL;
          }
          if (capabilities === undefined) {
            const caps: string[] = [];
            if (info.capabilities.vision) {
              caps.push("vision");
            }
            if (info.capabilities.functionCalling) {
              caps.push("tools");
            }
            if (info.capabilities.reasoning) {
              caps.push("reasoning");
            }
            if (info.capabilities.codeGeneration) {
              caps.push("code");
            }
            if (info.capabilities.multimodal) {
              caps.push("multimodal");
            }
            capabilities = caps;
          }
        }
      } catch {
        // Enrichment is best-effort; ignore registry lookup failures.
      }
    }

    const meta: ClassifierModelMeta = { cost, quality, capabilities };
    if (this.metaCache.size >= MAX_META_CACHE_ENTRIES) {
      const oldest = this.metaCache.keys().next().value;
      if (oldest !== undefined) {
        this.metaCache.delete(oldest);
      }
    }
    this.metaCache.set(key, meta);
    return meta;
  }
```

Replace the entire method body with this — every line outside the `try { ... } catch { ... }` block (the cache read, the `cost`/`quality`/`capabilities` declarations, the `needsEnrichment` check, and the final cache-write + return) is carried forward completely unchanged; only the `try`/`catch` block itself is rewritten, adding the `if (!info)` debug branch and giving the `catch` a bound `err` parameter that logs instead of silently swallowing:

```typescript
  private metaFor(member: ClassifierRouterPoolMember): ClassifierModelMeta {
    const key = `${member.provider}::${member.model ?? ""}`;
    const cached = this.metaCache.get(key);
    if (cached) {
      return cached;
    }

    let cost = member.cost;
    let quality = member.quality;
    let capabilities = member.capabilities
      ? [...member.capabilities]
      : undefined;

    const needsEnrichment =
      cost === undefined || quality === undefined || capabilities === undefined;
    if (needsEnrichment && member.model) {
      try {
        const info = ModelResolver.resolveModel(member.model);
        if (!info) {
          this.deps.logger?.debug?.(
            `[ClassifierRouter] metaFor: no registry match for ${member.provider}/${member.model}`,
          );
        } else {
          if (cost === undefined) {
            cost = info.pricing.inputCostPer1K + info.pricing.outputCostPer1K;
          }
          if (quality === undefined) {
            quality = QUALITY_SCORE[info.performance.quality] ?? NEUTRAL;
          }
          if (capabilities === undefined) {
            const caps: string[] = [];
            if (info.capabilities.vision) {
              caps.push("vision");
            }
            if (info.capabilities.functionCalling) {
              caps.push("tools");
            }
            if (info.capabilities.reasoning) {
              caps.push("reasoning");
            }
            if (info.capabilities.codeGeneration) {
              caps.push("code");
            }
            if (info.capabilities.multimodal) {
              caps.push("multimodal");
            }
            capabilities = caps;
          }
        }
      } catch (err) {
        this.deps.logger?.warn?.(
          `[ClassifierRouter] metaFor: registry lookup threw for ${member.provider}/${member.model}`,
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
    }

    const meta: ClassifierModelMeta = { cost, quality, capabilities };
    if (this.metaCache.size >= MAX_META_CACHE_ENTRIES) {
      const oldest = this.metaCache.keys().next().value;
      if (oldest !== undefined) {
        this.metaCache.delete(oldest);
      }
    }
    this.metaCache.set(key, meta);
    return meta;
  }
```

The `{ error: err instanceof Error ? err.message : String(err) }` shape and the `[ClassifierRouter] ...` bracket-prefixed message string match this same file's existing logging convention exactly (`route()`'s catch at `:94-97` and `classify()`'s catch at `:116-120`) — no new convention is introduced.

- [ ] **Step 4: Run the test again to verify the miss is now logged**

Run the command from Step 1, changing the final assertion to `if (calls.length === 0) { throw new Error('expected a debug log call, got none'); } console.log('PASS: miss logged via', calls[0]);`
Expected: `PASS: miss logged via debug:[ClassifierRouter] metaFor: no registry match for openai/totally-unregistered-model-xyz`.

- [ ] **Step 5: Write the failing test for rank()'s NEUTRAL substitution bias**

```typescript
// Confirms today's bias: a candidate with zero real cost/quality data
// (both undefined) sorts INTERLEAVED with measured candidates via the
// fixed 0.5 fill, rather than being pushed to the end.
npx tsx -e "
import { ClassifierRouter } from './src/lib/routing/classifierRouter.ts';
const router = new ClassifierRouter({} as never);
const ranked = router.rank(
  [
    { provider: 'openai', model: 'gpt-4o', cost: 0.9, quality: 0.9 },
    { provider: 'unknown', model: 'unmeasured-model', cost: undefined, quality: undefined },
    { provider: 'openai', model: 'gpt-4o-mini', cost: 0.1, quality: 0.6 },
  ] as never,
  'cost-asc' as never,
);
const positions = ranked.map((r: { model: string }) => r.model);
console.log('order:', positions);
if (positions[positions.length - 1] !== 'unmeasured-model') { throw new Error('expected unmeasured candidate last, got order: ' + positions.join(',')); }
console.log('PASS: unmeasured candidate correctly excluded from cost-asc ordering');
"
```

(Adapt the exact `rank()` call shape to match its real parameter types, read from `src/lib/routing/classifierRouter.ts:220-251` and `src/lib/types/classifierRouter.ts` before running — the assertion's intent, "the fully-unmeasured candidate must not be interleaved via a 0.5 fill," is what must hold regardless of the exact adapter shape.)

- [ ] **Step 6: Run it to confirm today's bias**

Run the command from Step 5.
Expected: throws with an order where `unmeasured-model` is interleaved (e.g. between the two real candidates, since `0.5` sits between `0.9`'s and `0.1`'s normalized positions) — confirming the pre-migration bug.

- [ ] **Step 7: Fix rank() to exclude fully-unmeasured candidates from the primary ordering**

This is the exact, current, verbatim body of `rank()` at `src/lib/routing/classifierRouter.ts:220-251` (read it yourself to confirm before editing):

```typescript
  private rank(
    members: ClassifierRouterPoolMember[],
    difficulty: ClassifierDifficulty,
  ): ClassifierRouterPoolMember[] {
    const mode = DIFFICULTY_RANK_MODE[difficulty];
    const originalIndex = new Map(members.map((m, i) => [m, i] as const));
    const num = (v?: number): number => (typeof v === "number" ? v : NEUTRAL);

    return [...members].sort((a, b) => {
      const ma = this.metaFor(a);
      const mb = this.metaFor(b);
      let delta: number;
      if (mode === "cost-asc") {
        delta = num(ma.cost) - num(mb.cost);
      } else if (mode === "quality-desc") {
        delta = num(mb.quality) - num(ma.quality);
      } else {
        // balanced: maximize quality-minus-cost
        delta =
          num(mb.quality) - num(mb.cost) - (num(ma.quality) - num(ma.cost));
      }
      if (delta !== 0) {
        return delta;
      }
      const weightDelta = (b.weight ?? 1) - (a.weight ?? 1);
      if (weightDelta !== 0) {
        return weightDelta;
      }
      // Stable: preserve declared pool order on a tie.
      return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
    });
  }
```

Replace the entire method body with this. The partition happens before sorting: candidates where **both** `cost` and `quality` are `undefined` (per `metaFor()`) are filtered out into `unmeasured` up front — `Array.prototype.filter` preserves relative order, so no extra bookkeeping is needed to keep them in their original relative order. The `measured` array is sorted with the exact original comparator, extracted unchanged into the `sortMeasured` closure; `unmeasured` is appended after it, untouched by sorting. This applies uniformly across all three modes (`cost-asc`, `quality-desc`, `balanced`) — matching the Design note above, which does not gate the exclusion on `mode`:

```typescript
  private rank(
    members: ClassifierRouterPoolMember[],
    difficulty: ClassifierDifficulty,
  ): ClassifierRouterPoolMember[] {
    const mode = DIFFICULTY_RANK_MODE[difficulty];
    const originalIndex = new Map(members.map((m, i) => [m, i] as const));
    const num = (v?: number): number => (typeof v === "number" ? v : NEUTRAL);

    const isFullyUnmeasured = (m: ClassifierRouterPoolMember): boolean => {
      const meta = this.metaFor(m);
      return meta.cost === undefined && meta.quality === undefined;
    };
    const measured = members.filter((m) => !isFullyUnmeasured(m));
    const unmeasured = members.filter(isFullyUnmeasured);

    const sortMeasured = (
      pool: ClassifierRouterPoolMember[],
    ): ClassifierRouterPoolMember[] =>
      [...pool].sort((a, b) => {
        const ma = this.metaFor(a);
        const mb = this.metaFor(b);
        let delta: number;
        if (mode === "cost-asc") {
          delta = num(ma.cost) - num(mb.cost);
        } else if (mode === "quality-desc") {
          delta = num(mb.quality) - num(ma.quality);
        } else {
          // balanced: maximize quality-minus-cost
          delta =
            num(mb.quality) - num(mb.cost) - (num(ma.quality) - num(ma.cost));
        }
        if (delta !== 0) {
          return delta;
        }
        const weightDelta = (b.weight ?? 1) - (a.weight ?? 1);
        if (weightDelta !== 0) {
          return weightDelta;
        }
        // Stable: preserve declared pool order on a tie.
        return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
      });

    return [...sortMeasured(measured), ...unmeasured];
  }
```

Note `sortMeasured`'s body is character-for-character the original `[...members].sort((a, b) => { ... })` callback — only its input array changed (`pool` instead of `members`) and its result is now concatenated with `unmeasured` instead of being returned directly.

- [ ] **Step 8: Run the test again to verify the fix**

Run the command from Step 5.
Expected: `order: [ 'gpt-4o-mini', 'gpt-4o', 'unmeasured-model' ]` (or whatever correct cost-ascending order the two measured candidates produce, with `unmeasured-model` last) then `PASS: unmeasured candidate correctly excluded from cost-asc ordering`.

- [ ] **Step 9: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/routing/classifierRouter.ts
git commit -m "fix(routing): log ClassifierRouter registry misses, exclude unmeasured candidates from rank() ordering"
```

---

## Task 13: Tighten ModelResolver fuzzy matching

**Files:**

- Modify: `src/lib/models/modelResolver.ts:1-90` (`resolveModel`, plus two new private helpers)
- Test: standalone script check (folded into Task 14's suite)

**Interfaces:**

- Consumes: `MODEL_REGISTRY`, `MODEL_ALIASES`, `getAllModels` (unchanged, from `modelRegistry.js`)
- Produces: `ModelResolver.resolveModel(query: string): ModelInfo | null` — **unchanged signature**. Two new module-private helpers (`escapeRegExp`, `includesAtWordBoundary`) — not exported, used only inside `resolveModel`.

**Design note.** `resolveModel`'s three fuzzy-match branches (id, name, provider-prefixed) use plain bidirectional `.includes()` with no length floor and no word-boundary check — a short, underspecified query like `"5.2"` matches any model id/name containing that substring anywhere, with the result depending entirely on `Object.values()` iteration order (today: `MODEL_REGISTRY`'s literal declaration order, soon: `buildModelRegistryFromManifests()`'s iteration order over `getAllManifestProviders()`, Task 9). This task adds a minimum-length guard (queries under 4 characters skip fuzzy matching and return `null` after the exact/alias checks) and a word-boundary check so a query only fuzzy-matches at a real token boundary (hyphen, underscore, dot, slash, whitespace, or string start/end) rather than anywhere inside an id. This removes ambiguous, order-dependent auto-resolution for underspecified queries while preserving every legitimate word-bounded match.

- [ ] **Step 1: Write the failing test**

```typescript
// query "5.2" is short and appears inside "gpt-5.2" (a real MODEL_REGISTRY
// id post-migration) — today's resolveModel returns whatever "gpt-5.2"-ish
// entry Object.values() iterates to first, an order-dependent false
// resolution for a query with no real specificity.
npx tsx -e "
import { ModelResolver } from './src/lib/models/modelResolver.ts';
const result = ModelResolver.resolveModel('5.2');
console.log('pre-migration resolveModel(\"5.2\"):', result?.id ?? null);
if (result === null) { throw new Error('expected a (wrong) match today, got null already'); }
console.log('PASS (pre-migration): ambiguous short query resolves to', result.id);
"
```

- [ ] **Step 2: Run it to confirm today's ambiguous resolution**

Run the command from Step 1.
Expected: `PASS (pre-migration): ambiguous short query resolves to gpt-5.2` (or a similarly-matching id — the exact id depends on registry iteration order, which is precisely the bug).

- [ ] **Step 3: Add the length guard and word-boundary helper, and use them in the three fuzzy branches**

Read `src/lib/models/modelResolver.ts:1-90` in full before editing. Add two private module-level helpers immediately after the imports:

```typescript
const MIN_FUZZY_QUERY_LENGTH = 4;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `needle` appears in `haystack` at a real token boundary (hyphen,
 * underscore, dot, slash, whitespace, or string start/end) — not merely as
 * an arbitrary substring. Model ids use hyphens/dots ("gpt-4.1-mini");
 * MODEL_REGISTRY .name fields use spaces ("GPT-4 Omni"), hence including
 * \s in the boundary class.
 */
function includesAtWordBoundary(haystack: string, needle: string): boolean {
  const boundary = "(?:^|[-_./\\s])";
  const pattern = new RegExp(
    `${boundary}${escapeRegExp(needle)}${boundary.replace("^|", "$|")}`,
  );
  return pattern.test(haystack);
}
```

Then, inside `resolveModel`, immediately after the alias-match block and before the `// Fuzzy matching` comment, add the length short-circuit:

```typescript
// Underspecified queries produce ambiguous, iteration-order-dependent
// matches (see Task 13 of the model metadata consolidation plan) — skip
// fuzzy matching entirely below this length.
if (normalizedQuery.length < MIN_FUZZY_QUERY_LENGTH) {
  return null;
}
```

Replace each of the three fuzzy branches' bidirectional `.includes()` calls with `includesAtWordBoundary()` in both directions:

```typescript
// Try partial matching on ID
const idMatch = allModels.find(
  (model) =>
    includesAtWordBoundary(model.id.toLowerCase(), normalizedQuery) ||
    includesAtWordBoundary(normalizedQuery, model.id.toLowerCase()),
);
if (idMatch) {
  return idMatch;
}

// Try partial matching on name
const nameMatch = allModels.find(
  (model) =>
    includesAtWordBoundary(model.name.toLowerCase(), normalizedQuery) ||
    includesAtWordBoundary(normalizedQuery, model.name.toLowerCase()),
);
if (nameMatch) {
  return nameMatch;
}

// Try provider-specific matching
const providerMatch = allModels.find((model) => {
  const providerQuery = `${model.provider}-${normalizedQuery}`;
  return (
    includesAtWordBoundary(model.id.toLowerCase(), providerQuery) ||
    includesAtWordBoundary(model.name.toLowerCase(), normalizedQuery)
  );
});
if (providerMatch) {
  return providerMatch;
}
```

- [ ] **Step 4: Run the test again to verify the ambiguous match is now rejected**

Run the command from Step 1, changing the final assertion to `if (result !== null) { throw new Error('expected null, got ' + result.id); } console.log('PASS: ambiguous short query correctly returns null');`
Expected: `PASS: ambiguous short query correctly returns null`.

- [ ] **Step 5: Write the positive-control test — legitimate word-bounded matches still work**

```typescript
npx tsx -e "
import { ModelResolver } from './src/lib/models/modelResolver.ts';
const result = ModelResolver.resolveModel('sonnet-4-5');
console.log('resolveModel(\"sonnet-4-5\"):', result?.id ?? null);
if (result === null) { throw new Error('expected a real match for a legitimate word-bounded query'); }
if (result.id !== 'claude-sonnet-4-5-20250929') { throw new Error('expected claude-sonnet-4-5-20250929, got ' + result.id); }
console.log('PASS: legitimate word-bounded fuzzy match still resolves correctly');
"
```

- [ ] **Step 6: Run it to verify**

Run the command from Step 5.
Expected: `PASS: legitimate word-bounded fuzzy match still resolves correctly`.

- [ ] **Step 7: Run the project type-check and build**

Run: `pnpm run check && pnpm run build`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/models/modelResolver.ts
git commit -m "fix(models): add minimum-length + word-boundary guards to ModelResolver fuzzy matching"
```

---

## Task 14: Consistency test suite

**Files:**

- Create: `test/continuous-test-suite-model-manifests.ts`
- Modify: `package.json` (add `test:model-manifests` script)

**Interfaces:**

- Consumes: `MANIFEST_REGISTRY`, `getAllManifestProviders`, `resolveManifestEntry`, `resolveManifestEntryExact` (Task 4, via `../dist/lib/models/manifestRegistry.js` — deep, non-barrel import, the established pattern for internals not on the public SDK barrel: `getContextWindowSize`, `MODEL_REGISTRY`, `ModelResolver`, `PROVIDER_MAX_TOKENS`, `ProviderImageAdapter`, and every `manifestRegistry.ts` symbol are all confirmed absent from `src/lib/index.ts`'s exports — only `calculateCost`/`hasPricing` (pricing.ts) and `ClassifierRouter` are barrel-exported among the symbols this plan touches), plus the same deep-import pattern for `getContextWindowSize` (`../dist/lib/constants/contextWindows.js`), `MODEL_REGISTRY`/`getAvailableProviders` (`../dist/lib/models/modelRegistry.js`), `ModelResolver` (`../dist/lib/models/modelResolver.js`), `ProviderImageAdapter` (`../dist/lib/adapters/providerImageAdapter.js`), `PROVIDER_MAX_TOKENS`/`getSafeMaxTokens` (`../dist/lib/core/constants.js`, `../dist/lib/utils/tokenLimits.js`), `AIProviderName` (`../dist/lib/constants/enums.js`).
- Produces: nothing consumed elsewhere — this is the terminal verification task the roadmap's program-level gate (`npx tsx test/continuous-test-suite-model-manifests.ts # metadata consistency (after plan 06)`) already expects to exist.

- [ ] **Step 1: Write the suite skeleton with one intentionally-broken assertion (the break-one-assertion sanity check CLAUDE.md requires for new suites)**

```typescript
import { assertDistFresh } from "./helpers/distFreshness.js";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";

await assertDistFresh();

const { test, runSuite } = defineSuite("Model Manifest Consistency");

const { getAllManifestProviders, resolveManifestEntry } =
  await import("../dist/lib/models/manifestRegistry.js");
const { AIProviderName } = await import("../dist/lib/constants/enums.js");

await test("sanity: intentionally broken assertion reports FAIL, not SKIP", async () => {
  assert(
    false,
    "intentional break-one-assertion sanity check — do not commit this test as-is",
  );
});

await runSuite();
```

- [ ] **Step 2: Run it to confirm the harness correctly reports FAIL (not SKIP) and exits non-zero**

Run: `pnpm run build && npx tsx test/continuous-test-suite-model-manifests.ts; echo "exit code: $?"`
Expected: the sanity test prints `✗ sanity: intentionally broken assertion...`, the summary shows `Failed: 1`, `RESULT: FAIL`, and `exit code: 1` — confirming this suite is not vulnerable to the skip-hazard CLAUDE.md warns about (the assertion message here deliberately contains no payload/provider-error-shaped text, so `isExpectedProviderError()` cannot downgrade it).

- [ ] **Step 3: Remove the sanity test and write the real assertions**

```typescript
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  defineSuite,
  assert,
  assertEqual,
  assertNotNull,
} from "./helpers/harness.js";

await assertDistFresh();

const { test, runSuite } = defineSuite("Model Manifest Consistency");

const {
  getAllManifestProviders,
  getManifestForProvider,
  resolveManifestEntry,
  resolveManifestEntryExact,
} = await import("../dist/lib/models/manifestRegistry.js");
const { AIProviderName } = await import("../dist/lib/constants/enums.js");
const { getContextWindowSize } =
  await import("../dist/lib/constants/contextWindows.js");
const { getModelById, getAvailableProviders } =
  await import("../dist/lib/models/modelRegistry.js");
const { calculateCost, hasPricing } = await import("../dist/index.js");
const { ModelResolver } = await import("../dist/lib/models/modelResolver.js");
const { ProviderImageAdapter } =
  await import("../dist/lib/adapters/providerImageAdapter.js");
const { getSafeMaxTokens, resolveClaudeMaxTokens } =
  await import("../dist/lib/utils/tokenLimits.js");

await test("all 30 real AIProviderName values have a manifest entry", async () => {
  const providers = getAllManifestProviders();
  const realProviderNames = Object.values(AIProviderName).filter(
    (p: string) => p !== AIProviderName.AUTO,
  );
  for (const provider of realProviderNames) {
    assert(
      providers.includes(provider),
      `manifest missing for provider — mismatch at ${provider}`,
    );
  }
  assertEqual(providers.length, 30, "expected exactly 30 manifest providers");
});

await test("every manifest model has a positive contextWindow and maxOutputTokens", async () => {
  for (const provider of getAllManifestProviders()) {
    const manifest = getManifestForProvider(provider);
    assertNotNull(manifest, `manifest unexpectedly undefined for ${provider}`);
    for (const [id, entry] of Object.entries(manifest.models)) {
      assert(
        entry.contextWindow > 0,
        `non-positive contextWindow — mismatch at ${provider}/${id}`,
      );
      assert(
        entry.maxOutputTokens > 0,
        `non-positive maxOutputTokens — mismatch at ${provider}/${id}`,
      );
    }
  }
});

await test("getContextWindowSize agrees with the manifest for a known model", async () => {
  const fromManifest = resolveManifestEntry(
    "anthropic",
    "claude-opus-4-6",
  )?.contextWindow;
  const fromLegacyApi = getContextWindowSize("anthropic", "claude-opus-4-6");
  assertEqual(
    fromLegacyApi,
    fromManifest,
    "getContextWindowSize disagreed with the manifest",
  );
});

await test("getSafeMaxTokens agrees with resolveClaudeMaxTokens for every anthropic manifest model", async () => {
  const manifest = getManifestForProvider("anthropic");
  assertNotNull(manifest, "anthropic manifest unexpectedly undefined");
  for (const id of Object.keys(manifest.models)) {
    const safe = getSafeMaxTokens("anthropic", id);
    const claude = resolveClaudeMaxTokens(id);
    assertEqual(
      safe,
      claude,
      `getSafeMaxTokens/resolveClaudeMaxTokens disagreement at ${id}`,
    );
  }
});

await test("MODEL_REGISTRY entries only exist for priced manifest models", async () => {
  const sonnet5 = getModelById("claude-sonnet-5");
  assert(
    sonnet5 === undefined,
    "claude-sonnet-5 should stay absent from MODEL_REGISTRY (no verified pricing)",
  );
  const opus46 = getModelById("claude-opus-4-6");
  assertNotNull(opus46, "claude-opus-4-6 should be present (has pricing)");
});

await test("getAvailableProviders returns all 30 manifest providers", async () => {
  assertEqual(
    getAvailableProviders().length,
    30,
    "getAvailableProviders provider count mismatch",
  );
});

await test("pricing.ts and the manifest agree on a priced model's rate", async () => {
  const manifestEntry = resolveManifestEntryExact("openai", "gpt-4o");
  assertNotNull(
    manifestEntry?.pricingPerMTok,
    "gpt-4o manifest entry missing pricing",
  );
  const cost = calculateCost("openai", "gpt-4o", 1_000_000, 0);
  assertEqual(
    cost,
    manifestEntry.pricingPerMTok.input,
    "pricing.ts calculateCost disagreed with the manifest's pricingPerMTok.input",
  );
  assert(
    hasPricing("openai", "gpt-4o"),
    "hasPricing should be true for gpt-4o",
  );
});

await test("ProviderImageAdapter.supportsVision agrees with the manifest's vision flag", async () => {
  const entry = resolveManifestEntryExact(
    "anthropic",
    "claude-3-5-haiku-20241022",
  );
  assertNotNull(entry, "manifest entry missing for claude-3-5-haiku-20241022");
  const supported = ProviderImageAdapter.supportsVision(
    "anthropic",
    "claude-3-5-haiku-20241022",
  );
  assertEqual(
    supported,
    entry.vision,
    "supportsVision disagreed with the manifest's vision flag",
  );
});

await test("ModelResolver rejects underspecified fuzzy queries", async () => {
  const result = ModelResolver.resolveModel("5.2");
  assert(
    result === null,
    "expected null for an underspecified short query — mismatch on length guard",
  );
});

await test("ModelResolver still resolves legitimate word-bounded fuzzy queries", async () => {
  const result = ModelResolver.resolveModel("sonnet-4-5");
  assertNotNull(result, "expected a real match for a word-bounded query");
  assertEqual(
    result.id,
    "claude-sonnet-4-5-20250929",
    "word-bounded fuzzy match resolved to the wrong id",
  );
});

await runSuite();
```

- [ ] **Step 4: Add the package.json script**

Modify `package.json`'s `scripts` block, adding (alongside the other `test:*` entries, e.g. next to `test:mcp`):

```json
    "test:model-manifests": "npx tsx test/continuous-test-suite-model-manifests.ts",
```

- [ ] **Step 5: Run the full build and suite**

Run: `pnpm run build && pnpm run test:model-manifests`
Expected: all 10 tests pass, `RESULT: PASS`, exit code `0`.

- [ ] **Step 6: Commit**

```bash
git add test/continuous-test-suite-model-manifests.ts package.json
git commit -m "test(models): add model manifest consistency suite"
```

---

## Verification Checklist

Run in order after all 14 tasks are complete:

```bash
pnpm run check                                       # typecheck clean
pnpm run lint                                         # all 14 repo rules + format
pnpm run build                                        # SDK + CLI build
npx tsx test/continuous-test-suite-model-manifests.ts # this plan's own suite
pnpm test                                              # main continuous suite (no regressions elsewhere)
pnpm run build:cli && pnpm run cli models --provider anthropic  # CLI smoke test
```

Manual spot-checks (no API keys required — all model-metadata lookups are static):

- [ ] `getModelById("claude-sonnet-5")` returns `undefined` (honest pricing gap preserved, not fabricated).
- [ ] `getModelById("claude-opus-4-6").pricing` reports the real $5/$25 per-million rate, not a placeholder.
- [ ] `getAvailableProviders()` (modelRegistry.ts) returns 30 entries; `getAvailableProviders()` (providerUtils.ts, SDK barrel export) is unchanged and still returns its own distinct list.
- [ ] `ModelResolver.resolveModel("gpt-4")` still resolves via the exact-match branch (unaffected by the fuzzy-match length guard, since `"gpt-4"` is a real `MODEL_REGISTRY` key and exact match short-circuits before fuzzy matching runs).
- [ ] `ClassifierRouter`'s debug-log line appears in output when `NEUROLINK_LOG_LEVEL=debug` and a request references an unregistered model.

## Risks & Rollback

- **Risk: `MODEL_REGISTRY` membership change breaks a consumer that iterates it expecting exactly the old 26 entries (21 OpenAI + 5 Anthropic).** Mitigation: the change is additive for Anthropic (5→14) and neutral for OpenAI (21→20, only the already-dead `o1-preview` dropped) — no previously-working lookup for a still-live model stops working. Rollback: revert Task 9's commit alone; every other task's manifest/store migration is independent and can stay merged (`resolveManifestEntry`/`resolveManifestEntryExact` are pure additions Task 9 is the only consumer of that also touches `MODEL_REGISTRY` itself).
- **Risk: the `getSafeMaxTokens`/`resolveClaudeMaxTokens` reconciliation (Task 11) silently changes a currently-in-flight request's effective max-tokens ceiling for a provider other than Anthropic.** Mitigation: Task 11's Step 5 explicitly asserts OpenAI/Azure's flat defaults are unchanged; the per-model override table only adds new keys, never removes the `.default` fallback. Rollback: revert Task 11's commit; `PROVIDER_MAX_TOKENS` reverts to its flat hand-authored literal, `getSafeMaxTokens`'s own logic is untouched by every other task.
- **Risk: `ModelResolver.resolveModel`'s new length/word-boundary guards reject a query some existing caller relied on matching loosely.** Mitigation: Task 13's Step 5/6 positive-control test proves legitimate word-bounded queries (the realistic query shape: partial model names with real separators) still resolve; only queries under 4 characters or matching mid-token (no realistic caller constructs those on purpose) are newly rejected. Rollback: revert Task 13's commit in isolation — `modelResolver.ts` is not imported by any other task's changes.
- **Risk: a manifest hand-authoring error (Tasks 2-3) or generator bug (Task 5) introduces a wrong price/context-window that silently propagates to five call sites at once (the exact opposite of today's isolated-blast-radius stores).** Mitigation: Task 14's suite is specifically designed to catch drift, and every one of Tasks 7-11's steps includes a pre/post-migration value-equality check against the _specific_ value the old store produced, not just "does it compile." Rollback: any single manifest file (`src/lib/models/manifests/<provider>.ts`) can be hand-corrected and re-committed without touching `manifestRegistry.ts` or any of the five migrated stores — the aggregator re-reads whatever the file exports.
- **Risk: `PRICING`'s two fallback branches (Vertex→Google-Gemini, provider-level `_default`) left un-migrated in Task 8 become a second source of truth alongside the manifest, re-creating exactly the duplication this plan removes.** Mitigation: explicitly documented as intentional and scoped (Task 8's design note) — `google`/Gemini has no hand-authored manifest in this plan (only `anthropic`/`openai` do; `google-ai`'s manifest is Task-5-generated from existing `MODEL_REGISTRY` data, and `PRICING["google"]`'s Gemini keys don't correspond 1:1 with `google-ai`'s `MODEL_REGISTRY` entries without further reconciliation work). Follow-up: a future plan increment can extend Task 5's generator to also emit a `google` manifest and finish routing this fallback through it.

## Out of Scope

- **`ProviderDescriptor`/`PROVIDER_DESCRIPTORS`/`ProviderFactory.getDescriptor()`/`getAllDescriptors()`** — provider-level identity/env, not model-level metadata. Covered by Plan 04 (`2026-08-15-04-provider-descriptor.md`).
- **Generalizing runtime model discovery (`DynamicModelProvider`, `RUNTIME_CONTEXT_WINDOWS`) beyond LiteLLM** — Plan 10 (`2026-08-15-10-onboarding-playbook.md`) covers the broader "add a provider" onboarding path this would be part of.
- **`getAvailableProviders()` in `src/lib/utils/providerUtils.ts`** (barrel-exported from `src/lib/index.ts:176`) — a third, independent function of the same name as this plan's `modelRegistry.ts` target and `pricing.ts`'s internal helper; left untouched since it serves a different (SDK-public) purpose and is not one of this plan's five named stores.
- **The hardcoded-provider-list in `providerFactory.ts:193`'s dynamic provider check** — out of scope; not model metadata.
- **`providerUtils.ts:535`'s hardcoded 10-item literal** — out of scope, unrelated store.
- **`SAMPLING_PARAM_REJECTING_FAMILIES`/`modelSupportsSamplingParams()`/`resolveSamplingParams()`** (`modelRegistry.ts:2477+`) — left fully unchanged; not one of the five named stores, and `ClassifierRouter` plus other consumers depend on their exact current behavior. The manifest's new `samplingParams` field (Task 1) is populated for the one model where real data supports it (`claude-sonnet-5`) but nothing in this plan wires it back into `modelSupportsSamplingParams()` itself — a natural, but explicitly deferred, follow-up.
- **`AnthropicModels` enum in `src/lib/constants/enums.ts`** — a third, independent Anthropic catalog (distinct from `AnthropicModel` in `anthropicModels.ts`, Task 6's target) that only supplies `MODEL_REGISTRY` keys; Task 9 already handles every consequence of `MODEL_REGISTRY`'s membership changing without needing to touch this enum's own declaration.
- **The 4 remaining `AnthropicModel` enum gaps beyond the assigned 4.5-generation set** (`claude-opus-4-1`, `claude-sonnet-5`, `claude-3-7-sonnet`, `claude-3-sonnet` still have no enum member after Task 6) — Task 6's design note flags this explicitly; expanding the enum further than the assigned scope item is a real scope decision for a follow-up, not an oversight here.
- **Migrating `PRICING["google"]`'s Vertex→Google-Gemini fallback branch through the manifest** — deferred, see Risks & Rollback's last entry; would require a hand-authored or generator-backed `google` (not `google-ai`) manifest this plan does not create.
- **`DEFAULT_PROVIDER_CONFIGS`, `ModelPoolMember.provider` typing, `ProviderRuntimeConfig` provider-as-string typing** — all identity/config-surface concerns documented in the spec's touch-point list, none are one of the five metadata stores this plan targets.
