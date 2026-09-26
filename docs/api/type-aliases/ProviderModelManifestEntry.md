[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelManifestEntry

# Type Alias: ProviderModelManifestEntry

> **ProviderModelManifestEntry** = `object`

A single model's metadata inside a provider's manifest. This is the one
canonical shape every model-metadata consumer (context windows, pricing,
MODEL_REGISTRY, vision capability, output-token ceilings) is intended to
migrate onto — this PR is purely additive and does not yet move any
consumer over.

`pricingPerMTok` is optional by design: a model with no verified price
(e.g. a just-announced model pricing.ts hasn't priced yet) must not report
a fabricated rate. Absence here means "unknown", not "free" — callers that
need to distinguish "free" from "unknown" already have `hasPricing()`
(src/lib/utils/pricing.ts) for that.

## Properties

### aliases

> **aliases**: `string`[]

Alternate identifiers that resolve to this canonical model id.

---

### displayName?

> `optional` **displayName?**: `string`

Human-readable name. Falls back to a mechanical id-derived name when absent.

---

### contextWindow

> **contextWindow**: `number`

---

### maxOutputTokens

> **maxOutputTokens**: `number`

---

### pricingPerMTok?

> `optional` **pricingPerMTok?**: `object`

#### input

> **input**: `number`

#### output

> **output**: `number`

#### cacheRead?

> `optional` **cacheRead?**: `number`

#### cacheWrite?

> `optional` **cacheWrite?**: `number`

---

### vision

> **vision**: `boolean`

---

### nativeAudio?

> `optional` **nativeAudio?**: `boolean`

---

### functionCalling

> **functionCalling**: `boolean`

---

### reasoning?

> `optional` **reasoning?**: `boolean`

---

### jsonMode?

> `optional` **jsonMode?**: `boolean`

---

### samplingParams?

> `optional` **samplingParams?**: `boolean`

Whether the model accepts classic sampling parameters (temperature/topP).
Mirrors ModelCapabilities.samplingParams (src/lib/types/model.ts:131) —
unset means supported.

---

### curated?

> `optional` **curated?**: `object`

Hand-tuned ModelInfo.performance/useCases/category values, carried
forward verbatim for the ids that already had a MODEL_REGISTRY entry
before this migration. Absent for every id that never had one — those
get performance/useCases/category derived mechanically instead (see
Task 9's buildModelRegistryFromManifests). Never populate this for a
genuinely new model: mechanical derivation is the correct default, and
a fabricated "curated" value would be worse than an honestly-derived one.

#### performance?

> `optional` **performance?**: [`ModelPerformance`](ModelPerformance.md)

#### useCases?

> `optional` **useCases?**: [`UseCaseSuitability`](UseCaseSuitability.md)

#### category?

> `optional` **category?**: [`ModelInfo`](ModelInfo.md)\[`"category"`\]
