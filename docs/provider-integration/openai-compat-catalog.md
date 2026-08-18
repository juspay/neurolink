# OpenAI-Compatible Provider Catalog

Seven OpenAI-compatible providers — Groq, xAI, Together AI, Fireworks,
Perplexity, Mistral, Cloudflare Workers AI — are registered from a single
data table, `OPENAI_COMPAT_CATALOG` (`src/lib/providers/openaiCompatCatalog.ts`),
read by one generic class, `ConfiguredOpenAICompatProvider`
(`src/lib/providers/configuredOpenAICompat.ts`). Adding another provider to
this family means adding one entry to the catalog array — not writing a new
subclass file, not touching the registry.

## When a provider belongs in the catalog

A provider belongs in `OPENAI_COMPAT_CATALOG` if it needs **only**:

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

Each catalog entry's `errorRules` is a direct, order-preserving translation
of its original subclass's `formatProviderError` `if`/`else` ladder into a
`ProviderErrorRule[]` array, classified via `classifyProviderError()`
(`src/lib/utils/errorClassifier.ts`). Every bespoke message string is
preserved verbatim — including xAI's "top up your account" quota URL and
Groq's decommissioned-vs-not-found distinction — via each rule's own
`message` field (`string | ((ctx) => string)`), with model-name
interpolation carried through `ctx.modelName`. There is no message-wording
regression here. Timeout classification is likewise unchanged: 6 of the 7
providers map `TimeoutError` to `NetworkError` (the classifier's default),
and Groq alone maps it to `ProviderError`. Groq's subclass override is
preserved verbatim via `OpenAICompatCatalogEntry.timeoutErrorClass`, so no
provider's timeout class changed during migration.

## Known pre-existing quirk this migration preserved (not fixed)

Mistral's provider registration passes a `defaultModel` value to
`ProviderFactory.registerProvider()` that does **not** check `MISTRAL_MODEL`
(`MistralModels.MISTRAL_LARGE_LATEST`, a bare literal), while
`ConfiguredOpenAICompatProvider.getDefaultModel()` for Mistral **does**
check `MISTRAL_MODEL` (falling back to `MistralModels.MISTRAL_SMALL_2506`).
Every other catalog provider's registry default and class default agree.
This is expressed via `OpenAICompatCatalogEntry.registryDefaultModelChecksEnvVar`
(`false` only for Mistral) and preserved exactly as it was before this
migration — reconciling it is out of scope here (see the openai-compat
catalog plan's Risks & Rollback for a possible follow-up).
