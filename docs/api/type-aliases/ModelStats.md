[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L436)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L437)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L438)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L441)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L446)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L447)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
