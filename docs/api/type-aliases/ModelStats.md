[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L439)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L440)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L441)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L442)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L443)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L444)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L449)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L450)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
