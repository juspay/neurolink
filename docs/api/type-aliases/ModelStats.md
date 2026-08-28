[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L431)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L432)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L433)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L434)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L435)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L436)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L441)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L442)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
