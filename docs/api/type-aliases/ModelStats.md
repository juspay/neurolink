[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelStats

# Type Alias: ModelStats

> **ModelStats** = `object`

Model Statistics Object - High Reusability

## Properties

### name

> **name**: `string`

---

### provider

> **provider**: `string`

---

### capabilities

> **capabilities**: [`ModelCapability`](ModelCapability.md)[]

---

### useCases

> **useCases**: [`ModelUseCase`](ModelUseCase.md)[]

---

### performance

> **performance**: `object`

#### avgLatency?

> `optional` **avgLatency?**: `number`

#### avgTokensPerSecond?

> `optional` **avgTokensPerSecond?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

---

### pricing?

> `optional` **pricing?**: [`ModelPricing`](ModelPricing.md)

---

### metadata

> **metadata**: `object` & `object`

#### Type Declaration

##### version?

> `optional` **version?**: `string`

##### lastUpdated?

> `optional` **lastUpdated?**: `Date`
