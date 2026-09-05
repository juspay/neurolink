[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L441)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L442)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L443)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L447)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
