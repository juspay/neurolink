[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelSearchFilters

# Type Alias: ModelSearchFilters

> **ModelSearchFilters** = `object`

Defined in: [types/model.ts:198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L198)

Model search filters

## Properties

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/model.ts:199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L199)

---

### capability?

> `optional` **capability?**: keyof [`ModelCapabilities`](ModelCapabilities.md) \| keyof [`ModelCapabilities`](ModelCapabilities.md)[]

Defined in: [types/model.ts:200](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L200)

---

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

Defined in: [types/model.ts:201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L201)

---

### maxCost?

> `optional` **maxCost?**: `number`

Defined in: [types/model.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L202)

---

### minContextSize?

> `optional` **minContextSize?**: `number`

Defined in: [types/model.ts:203](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L203)

---

### maxContextSize?

> `optional` **maxContextSize?**: `number`

Defined in: [types/model.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L204)

---

### performance?

> `optional` **performance?**: [`ModelPerformance`](ModelPerformance.md)\[`"speed"`\] \| [`ModelPerformance`](ModelPerformance.md)\[`"quality"`\]

Defined in: [types/model.ts:205](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L205)

---

### category?

> `optional` **category?**: [`ModelInfo`](ModelInfo.md)\[`"category"`\] \| [`ModelInfo`](ModelInfo.md)\[`"category"`\][]

Defined in: [types/model.ts:206](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L206)
