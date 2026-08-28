[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L414)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L415)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:416](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L416)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L417)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:418](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L418)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L422)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
