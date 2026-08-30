[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCatalogJson

# Type Alias: ProviderCatalogJson

> **ProviderCatalogJson** = `object`

Defined in: [types/providerCatalog.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L109)

## Properties

### $schema?

> `optional` **$schema?**: `string`

Defined in: [types/providerCatalog.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L111)

Editor-only pointer to provider-catalog.schema.json — accepted and ignored.

---

### id

> **id**: `string`

Defined in: [types/providerCatalog.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L112)

---

### displayName

> **displayName**: `string`

Defined in: [types/providerCatalog.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L113)

---

### enumTypeName?

> `optional` **enumTypeName?**: `string`

Defined in: [types/providerCatalog.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L120)

Exported <Name>Models enum name override. Default: PascalCase(id) +
"Models". REQUIRED where the derived name differs from a pre-existing
export ("together-ai" derives "TogetherAiModels"; the legacy export is
"TogetherAIModels").

---

### credentialsKey?

> `optional` **credentialsKey?**: `string`

Defined in: [types/providerCatalog.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L129)

NeurolinkCredentials key override. Default: toCamelCase(id). REQUIRED
where the derived key differs from a pre-existing public credential
field ("together-ai" derives "togetherAi"; the shipped public key is
"together" — renaming it would break any caller passing
`credentials: { together: {...} } }`, a public API break rule 5
forbids).

---

### aliases

> **aliases**: `string`[]

Defined in: [types/providerCatalog.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L130)

---

### tier

> **tier**: `2`

Defined in: [types/providerCatalog.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L131)

---

### wire

> **wire**: [`CatalogWire`](CatalogWire.md)

Defined in: [types/providerCatalog.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L132)

---

### models

> **models**: `object`

Defined in: [types/providerCatalog.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L133)

#### default

> **default**: `string`

#### fallbacks

> **fallbacks**: `string`[]

#### fallbackModelName?

> `optional` **fallbackModelName?**: `string`

Default: fallbacks[1] ?? fallbacks[0]. Set explicitly where the
legacy entry differs (behavior preservation — e.g. Groq).

#### registryDefaultModel?

> `optional` **registryDefaultModel?**: `string`

Default: models.default. Set explicitly where the legacy entry's
registry-level default differs (behavior preservation — Mistral's
registryDefaultModel is MISTRAL_LARGE_LATEST while its defaultModel
is not). Must be a models.catalog key (validated).

#### defaultContextWindow

> **defaultContextWindow**: `number`

#### defaultMaxOutputTokens

> **defaultMaxOutputTokens**: `number`

#### catalog

> **catalog**: `Record`\<`string`, [`CatalogModelSpec`](CatalogModelSpec.md)\>

#### topModels?

> `optional` **topModels?**: `string`[]

Ordered curated subset of `catalog` keys for wizard/choice surfaces
(e.g. the CLI setup wizard's top-N model picker). When absent, choice
surfaces fall back to the full catalog in file order.

#### visionModel?

> `optional` **visionModel?**: `string`

The live-verified vision-capable model for capability tests, for
providers whose `default` model is text-only. Must be a
models.catalog key with vision: true (validated). When absent, the
first vision:true model in `catalog` file order is used.

#### testModel?

> `optional` **testModel?**: `string`

The live-verified model the capability matrix drives, for providers
whose `default` is retired upstream or gated off the testing account
(Fireworks serverless deployment, Groq's roster purges). May name a
model outside `catalog` — current account reality, not transcribed
history. When absent, the matrix drives `default`. Never affects the
runtime default.

---

### capabilities

> **capabilities**: [`CatalogCapabilities`](CatalogCapabilities.md)

Defined in: [types/providerCatalog.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L164)

---

### errorRules

> **errorRules**: [`CatalogErrorRuleJson`](CatalogErrorRuleJson.md)[]

Defined in: [types/providerCatalog.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L165)

---

### quirks?

> `optional` **quirks?**: [`CatalogQuirks`](CatalogQuirks.md)

Defined in: [types/providerCatalog.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L166)

---

### setup

> **setup**: [`CatalogSetup`](CatalogSetup.md)

Defined in: [types/providerCatalog.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L167)

---

### evidence

> **evidence**: [`CatalogEvidence`](CatalogEvidence.md)

Defined in: [types/providerCatalog.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L168)
