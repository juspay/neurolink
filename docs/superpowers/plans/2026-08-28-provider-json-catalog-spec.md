# Spec: Single-JSON Provider Catalog

**Status:** Approved by Sachin Sharma 2026-08-28 (four rulings below).
**Problem owner ruling:** "When we add anything, the amount of things that we
add in src and test should be very minimal, basically minimal code change."

## Problem

Onboarding a Tier-2 (zero-quirk OpenAI-compatible) provider today touches
~16 files. The sambanova commit (PR #1586) is the measured evidence:

| Touchpoint                                                                                                                    | Nature                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `openaiCompatCatalog.ts` entry, descriptor, `create<Name>Config()`, setup-wizard entry                                        | data                                                               |
| `<Name>Models` enum, models manifest + registry, `modelChoices` ×2 tables, `contextWindows`, `pricing`, `VISION_CAPABILITIES` | data                                                               |
| mocked-suite spec row, matrix row, `providerValidator` entry                                                                  | the same data, restated for tests                                  |
| five count pins across two suites                                                                                             | hand-bumped integers that exist only because the data is scattered |
| `errorRules` match functions                                                                                                  | status code + regex — expressible as data                          |
| `AIProviderName` member, `NeurolinkCredentials` slice                                                                         | compile-time constructs (~2 lines)                                 |

ADR-0002 collapsed the provider _class_ into data but left that data
scattered across per-concern files, each with its own registry, and tests
pinned to hand-counted totals. Every provider re-states the same facts
six ways; every restatement is a drift surface (pilot findings #1–#6).

## Target end state

Adding a Tier-2 provider is **one JSON file**:

1. Author `src/lib/providers/catalog/<id>.json` (schema-validated).
2. Run `pnpm run codegen:catalog` (also runs in pre-commit; CI fails on
   stale output). This machine-writes every compile-time artifact.
3. Done. Zero hand-written code, zero test-file edits, zero doc-count
   edits.

## Approved rulings

| #   | Decision                               | Ruling                                                                                                                  |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | File layout                            | **One JSON file per provider** (`src/lib/providers/catalog/<id>.json`); a generated index aggregates them for bundling. |
| 2   | Enum member + credentials slice        | **Machine-generated** into marked regions — no human ever writes them. CI enforces freshness.                           |
| 3   | `<Name>Models` enums for new providers | **Yes — codegen'd** (autocomplete parity with existing enums).                                                          |
| 4   | Format                                 | **Strict JSON** with a zod schema validated in CI; probe evidence lives in structured fields, not comments.             |

## Schema (authoritative shape)

All types live in `src/lib/types/providerCatalog.ts` with the
`ProviderCatalog*` prefix (rule 9). The zod schema is the single
validator; a mirrored `provider-catalog.schema.json` gives editors
red-squiggle validation via the `$schema` field. The `$schema` key itself
is accepted (and ignored) by the strict parser — it is authoring
metadata, not catalog data.

> **Note:** the block below is annotated JSONC for THIS document only —
> the comments and any trailing commas are explanatory. Actual catalog
> files are STRICT JSON (no comments); the zod parser rejects anything
> else. Copy the shape, not the comments.

```jsonc
{
  "$schema": "./provider-catalog.schema.json",
  "id": "sambanova", // kebab-case; becomes the AIProviderName value and credentials key (camelCased)
  "displayName": "SambaNova", // human name for setup wizard / docs
  "aliases": [], // registry aliases
  "tier": 2,

  "wire": {
    "baseURL": "https://api.sambanova.ai/v1",
    // Env var names DERIVE by convention: <CONSTANT_CASE(id)>_API_KEY / _BASE_URL / _MODEL.
    // "envOverrides": { "apiKey": "...", "baseURL": "...", "model": "..." }  // only if a provider breaks convention (none of the 9 do)
    // Computed-URL providers (Cloudflare) instead use:
    // "baseURLTemplate": "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1",
    // "extraCredentials": ["accountId"],   // schema-constrained to EXACTLY ONE entry — deliberately
    //                                      // narrow, mirroring the runtime computedBaseURL type
    //                                      // (Cloudflare-shaped; see OpenAICompatCatalogEntry)
    // "missingCredentialMessage": "..."
  },

  "models": {
    "default": "Meta-Llama-3.3-70B-Instruct",
    "fallbacks": ["Meta-Llama-3.3-70B-Instruct", "gpt-oss-120b"],
    // "fallbackModelName": "gpt-oss-120b",  // optional; default = fallbacks[1] ?? fallbacks[0].
    // Set explicitly where the legacy entry differs
    // (behavior-preservation, e.g. Groq).
    "defaultContextWindow": 131072,
    "defaultMaxOutputTokens": 8192,
    "catalog": {
      "Meta-Llama-3.3-70B-Instruct": {
        "contextWindow": 131072, // optional; falls back to defaultContextWindow
        "maxOutputTokens": 8192, // optional; falls back to defaultMaxOutputTokens
        "pricingPerMTok": { "input": 0.6, "output": 1.2 }, // optional ("cachedInput" also allowed)
        "vision": false,
        "status": "production", // "production" | "preview" | "retired"
        "description": "Recommended - Meta Llama 3.3 70B; production, 128K context",
        "enumMember": "META_LLAMA_3_3_70B_INSTRUCT", // optional override; default = derived constant-case.
        // REQUIRED where the derived name differs from a
        // pre-existing exported enum member (e.g. Groq's
        // GEMMA_2_9B_IT vs derived GEMMA2_9B_IT) so the
        // public API surface is bit-identical.
      },
    },
  },

  "capabilities": {
    // feeds the matrix row; vision is DERIVED (any model with vision:true)
    "text": true,
    "streaming": true,
    "tools": true,
    "toolsWithStreaming": true,
    "structuredOutput": true,
    "structuredOutputWithTools": false,
    "embeddings": false,
    "thinking": false,
  },

  "errorRules": [
    // loader appends DEFAULT_ERROR_RULES; these replace match FUNCTIONS with data
    {
      "status": 401, // optional; matches ctx.statusCode
      "pattern": "invalid_api_key|Incorrect API key", // optional; case-insensitive regex vs ctx.message
      "class": "authentication", // "authentication" | "rate-limit" | "invalid-model" | "network" | "provider"
      "message": "Invalid SambaNova API key. Check {apiKeyEnvVar}. Get one at https://cloud.sambanova.ai/apis",
      // message templates: {model}, {apiKeyEnvVar}, {setupUrl}
    },
  ],

  "quirks": {
    // optional; every field optional
    "timeoutErrorClass": "provider", // Groq only: TimeoutError -> ProviderError instead of NetworkError
    "registryDefaultIgnoresModelEnvVar": true, // Mistral only: registryDefaultModelChecksEnvVar = false
  },

  "setup": {
    "url": "https://cloud.sambanova.ai/apis",
    "apiKeyFormat": null, // regex string or null (null = no apiKeyFormatPattern on the descriptor)
    "billingPolicy": "no-free-tier", // "free-tier" | "free-with-card" | "no-free-tier" — findings #8/#11 as data
    "instructions": [
      "1. Visit ...",
      "2. ...",
      "3. ... set {apiKeyEnvVar} in your .env",
    ],
  },

  "evidence": {
    // replaces code comments AND absorbs docs/provider-integration/manifests/<id>.json
    "rosterVerified": {
      "date": "2026-08-27",
      "method": "authenticated GET /v1/models",
    },
    "authProbe": {
      "date": "2026-08-27",
      "status": 401,
      "code": "invalid_api_key",
    },
    "billingProbe": {
      "date": "2026-08-27",
      "status": 402,
      "code": "PAYMENT_METHOD_REQUIRED",
    },
    "liveMatrix": null, // { "date": "...", "result": "4/4" } after live verification
    "addedInPR": "https://github.com/juspay/neurolink/pull/NNNN",
  },
}
```

## Derivation contract

One JSON file feeds every consumer that is hand-edited today:

| Consumer (today's hand-edit)                        | Derived from                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Registration (`providerRegistry` catalog loop)      | loader output (`OpenAICompatCatalogEntry`)                                             |
| `PROVIDER_DESCRIPTORS` entry                        | `id`, `aliases`, derived env vars, `models.default`, `setup.url`, `setup.apiKeyFormat` |
| `create<Name>Config()` / `EXTRA_PROVIDER_CONFIGS`   | `displayName`, derived env var, `setup`                                                |
| `contextWindows` block                              | `models.catalog[*].contextWindow` + `defaultContextWindow`                             |
| `pricing` block + alias                             | `models.catalog[*].pricingPerMTok`                                                     |
| `VISION_CAPABILITIES`                               | models with `vision: true`                                                             |
| `modelChoices` both tables                          | `models.catalog[*].description` + generated `<Name>Models` enum                        |
| models manifest + `manifestRegistry`                | `models.catalog[*]` (context/output/vision/functionCalling)                            |
| `providerValidator` roster/keys/cases               | `id` + derived env var                                                                 |
| Mocked-contract suite spec row                      | `wire.baseURL` host + `/chat/completions`, `models.default`, `errorRules` patterns     |
| Matrix row                                          | `capabilities` + `models.default` + derived env var                                    |
| Five count pins                                     | derived assertions over `CATALOG_PROVIDER_IDS` — never hand-bumped again               |
| `.env.example` block, docs index/count enumerations | future work — not in the initial plan (stay prose)                                     |
| `docs/provider-integration/manifests/<id>.json`     | **deleted** — merged into `evidence`                                                   |

## Codegen contract

`tools/codegen-catalog.ts`, run via `pnpm run codegen:catalog`:

1. Reads and zod-validates every `src/lib/providers/catalog/*.json`.
2. Writes `src/lib/providers/catalog/index.generated.ts` — static JSON
   imports aggregated into `CATALOG_JSON_ENTRIES` and
   `CATALOG_PROVIDER_IDS` (vite + `resolveJsonModule` already support
   this; three `src/` files import JSON today).
3. Rewrites the marked region in `src/lib/constants/enums.ts`:
   `AIProviderName` catalog members + one `<Name>Models` enum per
   provider (member names from `enumMember` override, else derived
   constant-case).
4. Rewrites the marked region in `src/lib/types/providers.ts`:
   `NeurolinkCredentials` catalog keys
   (`<camelId>?: { apiKey?: string; baseURL?: string }`, plus
   `extraCredentials` fields for computed-URL providers).

Marked regions use `// ── BEGIN GENERATED: provider catalog (pnpm run
codegen:catalog) ──` / `// ── END GENERATED ──` sentinels. Idempotent:
running twice produces byte-identical output. Enforcement: pre-commit
runs codegen and fails on diff; CI job runs
`pnpm run codegen:catalog && git diff --exit-code`.

## Backward-compatibility guarantees (rule 5)

- Every currently exported enum member (`AIProviderName.*`, `GroqModels.*`,
  `CerebrasModels.*`, …) survives with an identical name and string value —
  enforced by a public-surface snapshot test frozen before migration.
- `OPENAI_COMPAT_CATALOG` keeps its export name and element type; only its
  construction changes (loader over JSON instead of a hand-written array).
- Enum _declaration order_ changes (catalog members consolidate into the
  generated region). `Object.values(AIProviderName)` order is not part of
  the public contract; the migration verifies no test asserts order.

## Out of scope

- Tier-3/4 providers (real quirk hooks) stay code by definition. This
  spec collapses Tier 2 — the 150-provider factory line.
- Non-catalog data files keep their non-catalog entries (e.g. `pricing`'s
  OpenAI block); only catalog-provider entries derive.
- Hand-written prose guides (`docs/getting-started/providers/<id>.md`)
  remain optional human work; enumerations/counts derive.
