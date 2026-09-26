[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelSearchFilters

# Type Alias: ModelSearchFilters

> **ModelSearchFilters** = `object`

Model search filters

## Properties

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| [`AIProviderName`](../enumerations/AIProviderName.md)[]

---

### capability?

> `optional` **capability?**: keyof [`ModelCapabilities`](ModelCapabilities.md) \| keyof [`ModelCapabilities`](ModelCapabilities.md)[]

---

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

---

### maxCost?

> `optional` **maxCost?**: `number`

---

### minContextSize?

> `optional` **minContextSize?**: `number`

---

### maxContextSize?

> `optional` **maxContextSize?**: `number`

---

### performance?

> `optional` **performance?**: [`ModelPerformance`](ModelPerformance.md)\[`"speed"`\] \| [`ModelPerformance`](ModelPerformance.md)\[`"quality"`\]

---

### category?

> `optional` **category?**: [`ModelInfo`](ModelInfo.md)\[`"category"`\] \| [`ModelInfo`](ModelInfo.md)\[`"category"`\][]
