[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L456)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L457)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L458)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L459)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L460)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L461)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L466)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L467)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
