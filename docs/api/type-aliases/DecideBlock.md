[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideBlock

# Type Alias: DecideBlock

> **DecideBlock** = `object`

## Properties

### dialect

> **dialect**: [`DecideDialectName`](DecideDialectName.md)

---

### order

> **order**: `number`

Decision order, lower runs first; unique across decide providers.

---

### baseURLRequired?

> `optional` **baseURLRequired?**: `boolean`

True when the provider has no built-in endpoint and the caller must supply one.

---

### baseURLNormalize?

> `optional` **baseURLNormalize?**: readonly [`DecideBaseURLTransform`](DecideBaseURLTransform.md)[]

---

### endpoint

> **endpoint**: `string`

Request URL; `{baseURL}` is the only placeholder.

---

### model

> **model**: [`DecideModel`](DecideModel.md)

---

### requestIdHeaders?

> `optional` **requestIdHeaders?**: readonly `string`[]

---

### response?

> `optional` **response?**: `object`

#### modelPaths?

> `optional` **modelPaths?**: readonly `string`[]

---

### errors

> **errors**: [`DecideErrors`](DecideErrors.md)
