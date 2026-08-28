# OpenAI-Compatible Provider Catalog

Nine OpenAI-compatible providers — SambaNova, Cerebras, Groq, xAI,
Together AI, Fireworks, Perplexity, Mistral, Cloudflare Workers AI — are
registered from **one JSON file each**, under
`src/lib/providers/catalog/<id>.json`, and served by one generic class,
`ConfiguredOpenAICompatProvider`
(`src/lib/providers/configuredOpenAICompat.ts`). Adding another provider to
this family means adding one JSON file — no subclass, no registry edit, no
hand-written enum member, no test edit.

## The JSON is the source of truth

`OPENAI_COMPAT_CATALOG` still exists and keeps its name and element type,
but it is now _built_ by the loader (`src/lib/providers/catalog/loader.ts`)
from the JSON files rather than hand-written. Two consumers read the JSON:

- **Codegen** (`pnpm run codegen:catalog`) writes the compile-time
  artifacts into marked regions — the `AIProviderName` member, the
  `<Name>Models` enum, the `NeurolinkCredentials` key — plus the generated
  index. Pre-commit and CI fail on stale output.
- **The loader** builds the runtime entry; the descriptor, config options,
  context windows, pricing, vision map and model-choice tables all derive
  from it, as do the provider test suites' rows and counts.

Each file is validated by a zod schema (`src/lib/providers/catalog/schema.ts`)
with a mirrored `provider-catalog.schema.json` for editor squiggles.
Probe evidence (roster/auth/billing dates, live-matrix result, PR URL)
lives in the file's `evidence` block — the old
`docs/provider-integration/manifests/<id>.json` files were folded into it.

Field-by-field reference and the escape hatches:
`tiers/tier-2-catalog-entry.md`. Design rationale and the approved rulings:
`docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md`.

## When a provider belongs in the catalog

A provider belongs in the JSON catalog if it needs **only**:

- a credential (API key, optionally an extra field like Cloudflare's account id)
- a base URL (static default + optional env override, or computed from an
  extra credential field)
- a default/fallback model
- error-message classification (auth / rate-limit / invalid-model / generic)

## When a provider needs a dedicated subclass instead

Two providers in this family are deliberately **not** in the catalog because
they override real request-shaping behavior that a flat data table can't
express:

- **DeepSeek** (`src/lib/providers/deepseek.ts`) overrides
  `adjustResponseFormat`: DeepSeek 400s on `json_schema` structured-output
  requests, so the subclass downgrades to `json_object` before sending.
- **Azure OpenAI** (`src/lib/providers/azureOpenai.ts`) overrides four hooks:
  `getChatCompletionsURL` (deployment-name URL routing across two Azure
  endpoint schemes), `getAuthHeaders` (Azure's `api-key` header instead of
  `Authorization: Bearer`), `adjustRequestBody` (renames `max_tokens` to
  `max_completion_tokens` for o-series/gpt-5+ deployments), and
  `suppressResponseFormatWithTools` (Azure supports both at once).

If a future provider needs any hook beyond the 3 mandatory ones
(`getProviderName`, `getDefaultModel`, `formatProviderError`) or the 2
purely-declarative optional ones (`getFallbackModelName`,
`getFallbackModels`), it needs a dedicated subclass — follow the DeepSeek or
Azure OpenAI pattern, not the catalog.

## Error-message fidelity

Each entry's `errorRules` is a direct, order-preserving translation of its
original subclass's `formatProviderError` `if`/`else` ladder into rule data
(status code and/or case-insensitive pattern), classified via
`classifyProviderError()`
(`src/lib/utils/errorClassifier.ts`). Every bespoke message string is
preserved verbatim — including xAI's "top up your account" quota URL and
Groq's decommissioned-vs-not-found distinction — via each rule's own
`message` field (`string | ((ctx) => string)`), with model-name
interpolation carried through `ctx.modelName`. There is no message-wording
regression here. Timeout classification is likewise unchanged: 8 of the 9
providers map `TimeoutError` to `NetworkError` (the classifier's default),
and Groq alone maps it to `ProviderError`. Groq's subclass override is
preserved verbatim via the JSON's `quirks.timeoutErrorClass`, so no
provider's timeout class changed during migration.

## Known pre-existing quirk this migration preserved (not fixed)

Mistral's provider registration passes a `defaultModel` value to
`ProviderFactory.registerProvider()` that does **not** check `MISTRAL_MODEL`
(`MistralModels.MISTRAL_LARGE_LATEST`, a bare literal), while
`ConfiguredOpenAICompatProvider.getDefaultModel()` for Mistral **does**
check `MISTRAL_MODEL` (falling back to `MistralModels.MISTRAL_SMALL_2506`).
Every other catalog provider's registry default and class default agree.
This is expressed via the JSON's `quirks.registryDefaultIgnoresModelEnvVar`
(`true` only for Mistral). The JSON migration did reconcile one half of it:
`getDefaultModel(MISTRAL)` now returns the real generation default
(`mistral-small-2506`) rather than the registry literal — a disclosed
bug-fix-grade delta, since the two disagreed before.
