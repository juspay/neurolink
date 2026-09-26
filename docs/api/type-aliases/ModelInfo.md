[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelInfo

# Type Alias: ModelInfo

> **ModelInfo** = `object`

Complete model information

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

---

### description

> **description**: `string`

---

### capabilities

> **capabilities**: [`ModelCapabilities`](ModelCapabilities.md)

---

### pricing

> **pricing**: [`ModelPricingInfo`](ModelPricingInfo.md)

---

### performance

> **performance**: [`ModelPerformance`](ModelPerformance.md)

---

### limits

> **limits**: [`ModelLimits`](ModelLimits.md)

---

### useCases

> **useCases**: [`UseCaseSuitability`](UseCaseSuitability.md)

---

### aliases

> **aliases**: `string`[]

---

### deprecated

> **deprecated**: `boolean`

---

### isLocal

> **isLocal**: `boolean`

---

### releaseDate?

> `optional` **releaseDate?**: `string`

---

### category

> **category**: `"general"` \| `"coding"` \| `"creative"` \| `"vision"` \| `"reasoning"`
