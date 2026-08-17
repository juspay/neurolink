[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelResolutionContext

# Type Alias: ModelResolutionContext

> **ModelResolutionContext** = `object`

Defined in: [types/providers.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L436)

Model Resolution Context - High Reusability

## Properties

### requireCapabilities?

> `optional` **requireCapabilities?**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L437)

---

### preferredProviders?

> `optional` **preferredProviders?**: `string`[]

Defined in: [types/providers.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L438)

---

### useCase?

> `optional` **useCase?**: [`ModelUseCase`](ModelUseCase.md)

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

---

### budgetConstraints?

> `optional` **budgetConstraints?**: `object`

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

#### maxCostPerRequest?

> `optional` **maxCostPerRequest?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/providers.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L444)

#### maxLatency?

> `optional` **maxLatency?**: `number`

#### minQuality?

> `optional` **minQuality?**: `number`
