[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecommendationContext

# Type Alias: RecommendationContext

> **RecommendationContext** = `object`

Defined in: [types/model.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L213)

Model recommendation context

## Properties

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

Defined in: [types/model.ts:214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L214)

---

### maxCost?

> `optional` **maxCost?**: `number`

Defined in: [types/model.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L215)

---

### minQuality?

> `optional` **minQuality?**: `"low"` \| `"medium"` \| `"high"`

Defined in: [types/model.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L216)

---

### requireCapabilities?

> `optional` **requireCapabilities?**: keyof [`ModelCapabilities`](ModelCapabilities.md)[]

Defined in: [types/model.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L217)

---

### excludeProviders?

> `optional` **excludeProviders?**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/model.ts:218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L218)

---

### contextSize?

> `optional` **contextSize?**: `number`

Defined in: [types/model.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L219)

---

### preferLocal?

> `optional` **preferLocal?**: `boolean`

Defined in: [types/model.ts:220](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L220)
