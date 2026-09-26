[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Defined in: [types/providers.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L495)

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L496)

---

### provider

> **provider**: `string`

Defined in: [types/providers.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L497)

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

Defined in: [types/providers.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L498)

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

Defined in: [types/providers.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L499)

---

### performance

> **performance**: `object`

Defined in: [types/providers.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L500)

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

Defined in: [types/providers.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L505)

---

### metadata

> **metadata**: `object` & `object`

Defined in: [types/providers.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L506)

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
