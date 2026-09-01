[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L448)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L449)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L450)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:451](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L451)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:452](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L452)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L453)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L458)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L459)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
