[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
