[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelSearchFilters

# Type Alias: ModelSearchFilters

> **ModelSearchFilters** = `object`

Defined in: [types/model.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L190)

Model search filters

## Properties

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/model.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L191)

---

### capability?

> `optional` **capability?**: keyof [`ModelCapabilities`](ModelCapabilities.md) \| keyof [`ModelCapabilities`](ModelCapabilities.md)[]

Defined in: [types/model.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L192)

---

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

Defined in: [types/model.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L193)

---

### maxCost?

> `optional` **maxCost?**: `number`

Defined in: [types/model.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L194)

---

### minContextSize?

> `optional` **minContextSize?**: `number`

Defined in: [types/model.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L195)

---

### maxContextSize?

> `optional` **maxContextSize?**: `number`

Defined in: [types/model.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L196)

---

### performance?

> `optional` **performance?**: [`ModelPerformance`](ModelPerformance.md)\[`"speed"`\] \| [`ModelPerformance`](ModelPerformance.md)\[`"quality"`\]

Defined in: [types/model.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L197)

---

### category?

> `optional` **category?**: [`ModelInfo`](ModelInfo.md)\[`"category"`\] \| [`ModelInfo`](ModelInfo.md)\[`"category"`\][]

Defined in: [types/model.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L198)
