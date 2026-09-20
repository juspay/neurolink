[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L459)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L460)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L461)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:462](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L462)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L463)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L467)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
