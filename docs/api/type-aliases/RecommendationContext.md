[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecommendationContext

# Type Alias: RecommendationContext

> **RecommendationContext** = `object`

Model recommendation context

## Properties

### useCase?

> `optional` **useCase?**: keyof [`UseCaseSuitability`](UseCaseSuitability.md)

---

### maxCost?

> `optional` **maxCost?**: `number`

---

### minQuality?

> `optional` **minQuality?**: `"low"` \| `"medium"` \| `"high"`

---

### requireCapabilities?

> `optional` **requireCapabilities?**: keyof [`ModelCapabilities`](ModelCapabilities.md)[]

---

### excludeProviders?

> `optional` **excludeProviders?**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

---

### contextSize?

> `optional` **contextSize?**: `number`

---

### preferLocal?

> `optional` **preferLocal?**: `boolean`
