[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L429)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L430)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L431)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L432)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L433)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L434)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
