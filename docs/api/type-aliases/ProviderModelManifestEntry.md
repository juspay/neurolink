[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelManifestEntry

# Type Alias: ProviderModelManifestEntry

> **ProviderModelManifestEntry** = `object`

Defined in: [types/model.ts:285](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L285)

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

Defined in: [types/model.ts:287](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L287)

Alternate identifiers that resolve to this canonical model id.

---

### displayName?

> `optional` **displayName?**: `string`

Defined in: [types/model.ts:289](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L289)

Human-readable name. Falls back to a mechanical id-derived name when absent.

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/model.ts:290](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L290)

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/model.ts:291](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L291)

---

### pricingPerMTok?

> `optional` **pricingPerMTok?**: `object`

Defined in: [types/model.ts:292](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L292)

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

Defined in: [types/model.ts:298](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L298)

---

### nativeAudio?

> `optional` **nativeAudio?**: `boolean`

Defined in: [types/model.ts:299](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L299)

---

### functionCalling

> **functionCalling**: `boolean`

Defined in: [types/model.ts:300](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L300)

---

### reasoning?

> `optional` **reasoning?**: `boolean`

Defined in: [types/model.ts:301](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L301)

---

### jsonMode?

> `optional` **jsonMode?**: `boolean`

Defined in: [types/model.ts:302](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L302)

---

### samplingParams?

> `optional` **samplingParams?**: `boolean`

Defined in: [types/model.ts:308](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L308)

Whether the model accepts classic sampling parameters (temperature/topP).
Mirrors ModelCapabilities.samplingParams (src/lib/types/model.ts:131) —
unset means supported.

---

### curated?

> `optional` **curated?**: `object`

Defined in: [types/model.ts:318](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L318)

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
