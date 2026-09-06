[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L420)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L421)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L422)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L423)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L424)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L428)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
