[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L419)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L420)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L421)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L422)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L423)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L427)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
