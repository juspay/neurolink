[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatCatalogEntry

# Type Alias: OpenAICompatCatalogEntry

> **OpenAICompatCatalogEntry** = `object`

Defined in: [types/providers.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L730)

One row of the config-driven OpenAI-compatible provider catalog
(OPENAI_COMPAT_CATALOG, src/lib/providers/openaiCompatCatalog.ts).
Replaces a hand-written OpenAIChatCompletionsProvider subclass for
providers whose only differences from every sibling are credentials,
base URL, model defaults, and error-message classification.

## Properties

### providerName

> **providerName**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/providers.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L732)

Registry key / nl.generate({provider}) value, e.g. "groq".

---

### aliases

> **aliases**: `string`[]

Defined in: [types/providers.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L734)

Registry aliases, e.g. ["together-ai", "together"].

---

### apiKeyEnvVar

> **apiKeyEnvVar**: `string`

Defined in: [types/providers.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L744)

Env var holding the API key, e.g. "GROQ_API_KEY".

Declarative: the key is actually read through `configOptions.envVarName`,
which `validateApiKey` consults. This field exists so an entry states its
credential source without a caller having to reach into configOptions,
and the catalog suite asserts the two always name the same variable — two
fields describing one fact are worth nothing if they can disagree.

---

### baseURLEnvVar?

> `optional` **baseURLEnvVar?**: `string`

Defined in: [types/providers.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L749)

Env var that can override the base URL, e.g. "GROQ_BASE_URL". Omit
for entries that use computedBaseURL instead (e.g. Cloudflare).

---

### defaultBaseURL?

> `optional` **defaultBaseURL?**: `string`

Defined in: [types/providers.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L751)

Static default base URL. Omit for computedBaseURL entries.

---

### computedBaseURL?

> `optional` **computedBaseURL?**: `object`

Defined in: [types/providers.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L758)

Present only for providers whose base URL is computed from an extra
required credential value instead of a static default (Cloudflare's
accountId). Deliberately narrow (accountId-shaped) rather than a
generic extra-field mechanism — Cloudflare is the only current user.

#### envVar

> **envVar**: `string`

Env var fallback for the extra value, e.g. "CLOUDFLARE_ACCOUNT_ID".

#### missingValueMessage

> **missingValueMessage**: `string`

Thrown when neither credentials.accountId nor envVar supply a value.

#### build

> **build**: (`accountId`) => `string`

Builds the base URL from the resolved accountId.

##### Parameters

###### accountId

`string`

##### Returns

`string`

---

### configOptions

> **configOptions**: [`ProviderConfigOptions`](ProviderConfigOptions.md)

Defined in: [types/providers.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L770)

Setup/help metadata, passed to validateApiKey(). Not consumed by
classifyProviderError() — that function's ProviderErrorContext has no
docsUrl field; any URL a rule's message needs is inlined in the rule
itself (see Task 4).

---

### modelEnvVar

> **modelEnvVar**: `string`

Defined in: [types/providers.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L772)

Env var for the default model, e.g. "GROQ_MODEL".

---

### defaultModel

> **defaultModel**: `string`

Defined in: [types/providers.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L774)

Default model when modelEnvVar is unset.

---

### registryDefaultModel

> **registryDefaultModel**: `string`

Defined in: [types/providers.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L780)

The literal passed as ProviderFactory.registerProvider()'s defaultModel
argument (resolved before the provider is constructed). Preserves each
provider's exact pre-migration registry behavior.

---

### registryDefaultModelChecksEnvVar

> **registryDefaultModelChecksEnvVar**: `boolean`

Defined in: [types/providers.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L787)

True for every provider except Mistral: whether the registry-level
default also consults modelEnvVar before falling back to
registryDefaultModel. False is a pre-existing, intentionally-preserved
quirk unique to Mistral's registration (see plan's Design reference).

---

### fallbackModelName

> **fallbackModelName**: `string`

Defined in: [types/providers.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L789)

Fallback model name (getFallbackModelName()).

---

### fallbackModels

> **fallbackModels**: `string`[]

Defined in: [types/providers.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L791)

Fallback model list (getFallbackModels()).

---

### errorRules

> **errorRules**: [`ProviderErrorRule`](ProviderErrorRule.md)[]

Defined in: [types/providers.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L802)

Error-classification rules, consumed by classifyProviderError. Typed
as a mutable array — not readonly — because plan 07's
`classifyProviderError(error, rules: ProviderErrorRule[], provider, modelName?)`
declares `rules` as `ProviderErrorRule[]`; a `readonly` array here
would not be assignable to that parameter without a cast, which rule
14 (no double assertions) and general hygiene both rule out. Each
entry's array is still constructed as a fresh literal per provider in
Task 4, so nothing actually mutates it at runtime.

---

### timeoutErrorClass?

> `optional` **timeoutErrorClass?**: (`message`, `provider?`) => [`ProviderError`](../classes/ProviderError.md)

Defined in: [types/providers.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L816)

Optional override for the Error subclass a TimeoutError should produce
for this entry. classifyProviderError() hard-codes
TimeoutError -> NetworkError unconditionally, ahead of any rule table,
and does not make that mapping overridable per-provider (see
errorClassifier.ts). Groq's pre-migration subclass predates that
shared classifier and intercepted TimeoutError itself, returning a
plain ProviderError instead — this field lets
ConfiguredOpenAICompatProvider reproduce that one documented
divergence as data (see its formatProviderError), rather than adding a
class-level hook back in. Omit for every entry whose timeout should use
the classifier's default (six of the seven catalog entries).

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

[`ProviderError`](../classes/ProviderError.md)

---

### messageContentFormat?

> `optional` **messageContentFormat?**: `"string"`

Defined in: [types/providers.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L819)

See CatalogQuirks.messageContentFormat — a vendor that accepts
`messages[].content` only as a plain string.
