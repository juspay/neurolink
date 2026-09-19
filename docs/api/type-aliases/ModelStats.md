[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L477)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L478)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L479)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L480)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L481)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L482)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L487)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L488)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
