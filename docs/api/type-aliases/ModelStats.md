[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L453)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L454)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L455)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L456)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L457)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L458)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L463)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:464](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L464)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
