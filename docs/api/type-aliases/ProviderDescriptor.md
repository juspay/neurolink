[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderDescriptor

# Type Alias: ProviderDescriptor

> **ProviderDescriptor** = `object`

Defined in: [types/providers.ts:2155](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2155)

Single source of truth for one AI provider's static identity: how it's
addressed (name/aliases), how it's authenticated (credentialsKey/envVars),
what it defaults to (defaultModel), and how the rest of the codebase
should treat it (toolSupport/localRuntime/healthCheck). Every consumer
that used to hand-maintain its own provider table (CLI choices,
CREDENTIAL_KEY_MAP, env-var checks, health-check dispatch, auto-select
priority, PROMPT_ONLY_TOOL_PROVIDERS) derives from PROVIDER_DESCRIPTORS
instead. See src/lib/factories/providerDescriptors.ts for the data.

## Properties

### name

> **name**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/providers.ts:2157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2157)

Canonical identity — matches an AIProviderName enum member (never AUTO).

---

### aliases

> **aliases**: readonly `string`[]

Defined in: [types/providers.ts:2159](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2159)

Alternate spellings accepted by the CLI and the alias index (kebab-case, shorthand, legacy names). Does not include `name` itself.

---

### credentialsKey

> **credentialsKey**: keyof [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/providers.ts:2161](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2161)

Key into NeurolinkCredentials for per-call/per-instance credential overrides.

---

### envVars

> **envVars**: `object`

Defined in: [types/providers.ts:2163](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2163)

Environment variables this provider reads at runtime.

#### apiKey?

> `optional` **apiKey?**: `string`

Primary identity/secret env var. Absent for providers with no required credential (Ollama, LM Studio, llama.cpp) or that use extraRequired instead of a single key (Vertex).

#### fallbacks?

> `optional` **fallbacks?**: readonly `string`[]

Alternate env vars accepted in place of apiKey, checked in order after apiKey.

#### baseURL?

> `optional` **baseURL?**: `string`

#### baseURLFallbacks?

> `optional` **baseURLFallbacks?**: readonly `string`[]

Alternate env vars accepted in place of baseURL.

#### model?

> `optional` **model?**: `string`

Env var that overrides the static defaultModel at runtime.

#### modelFallbacks?

> `optional` **modelFallbacks?**: readonly `string`[]

Alternate env vars accepted in place of model, checked in order after model.

#### extraRequired?

> `optional` **extraRequired?**: readonly `string`[]

Additional env vars required alongside apiKey (e.g. AWS secret key, Azure endpoint).

#### extraRequiredFallbacks?

> `optional` **extraRequiredFallbacks?**: readonly (`string` \| readonly `string`[])[]

Alternate ways to satisfy extraRequired when it isn't a plain env-var list (e.g. Vertex's file-path-OR-individual-fields auth). Each entry is either a single env var name (satisfied alone) or a nested array of names that must ALL be present together (e.g. Vertex's GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY pair, which is only valid as a pair). Evaluate with `satisfiesFallbacks()` (providerConfig.ts) rather than re-deriving this logic at each call site.

#### optional?

> `optional` **optional?**: `boolean`

True when the provider is usable with zero configuration (local runtime with a documented default URL, or a documented non-secret default like LiteLLM's "sk-anything").

---

### defaultModel

> **defaultModel**: `string`

Defined in: [types/providers.ts:2189](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2189)

Static fallback model. The empty string "" is a documented sentinel
meaning "no static default — resolved at runtime via envVars.model or
provider-side auto-discovery" (used by Bedrock, OpenAI-Compatible,
LM Studio, llama.cpp, matching how providerRegistry.ts already passes
`undefined` as their defaultModel argument today).

---

### toolSupport

> **toolSupport**: `"native"` \| `"prompt-only"` \| `"none"` \| `"model-dependent"`

Defined in: [types/providers.ts:2190](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2190)

---

### localRuntime

> **localRuntime**: `boolean`

Defined in: [types/providers.ts:2192](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2192)

True only for providers that run entirely on the caller's machine with no cloud account (Ollama, LM Studio, llama.cpp). LiteLLM is a local proxy but commonly points at cloud models, so it is deliberately false.

---

### healthCheck

> **healthCheck**: `"env-only"` \| `"models-probe"` \| `"live-generate"`

Defined in: [types/providers.ts:2194](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2194)

How ProviderHealthChecker should verify this provider is reachable.

---

### setupUrl?

> `optional` **setupUrl?**: `string`

Defined in: [types/providers.ts:2195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2195)

---

### timeouts?

> `optional` **timeouts?**: `object`

Defined in: [types/providers.ts:2196](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2196)

#### generateMs?

> `optional` **generateMs?**: `number`

#### streamMs?

> `optional` **streamMs?**: `number`

---

### autoSelectPriority?

> `optional` **autoSelectPriority?**: `number`

Defined in: [types/providers.ts:2198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2198)

Ascending priority (1 = tried first) in the auto-select fallback chain used by getBestProvider(). Undefined = not part of the auto-select chain.

---

### apiKeyFormatPattern?

> `optional` **apiKeyFormatPattern?**: `RegExp`

Defined in: [types/providers.ts:2200](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2200)

Format-validation regex sourced from providerConfig.ts's API_KEY_FORMATS, when one exists for this provider.

---

### credentialsResolvedExternally?

> `optional` **credentialsResolvedExternally?**: `boolean`

Defined in: [types/providers.ts:2215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2215)

True when this provider's credentials are resolved by an external chain
or its own config validator rather than by plain env-var presence, so
its required-env-vars can't be expressed as "every one of these exact
names must be literally set". Examples: Vertex accepts a service-account
file OR individual client-email/private-key fields OR a base64 key
(an OR, not an AND, of auth paths); Bedrock falls back to the AWS SDK's
own default credential chain (shared profile, IAM role) with no env
vars required at all; LiteLLM is a documented zero-config local proxy.
`ProviderHealthChecker.getRequiredEnvironmentVariables()` returns `[]`
for these providers and defers to `checkProviderSpecificConfig()`'s
dedicated per-provider check instead of deriving a flat AND-list from
`envVars`.
