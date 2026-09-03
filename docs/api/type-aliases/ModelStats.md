[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L437)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L438)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L441)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L442)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L447)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L448)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
