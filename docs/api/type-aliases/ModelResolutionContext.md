[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L411)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L412)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:413](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L413)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L414)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L415)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L419)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
