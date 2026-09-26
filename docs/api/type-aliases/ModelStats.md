[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L493)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L494)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L495)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L496)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L497)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L498)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L503)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L504)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
