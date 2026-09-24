[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L475)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L476)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L477)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L478)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L479)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L483)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
