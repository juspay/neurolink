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

Applied to the base URL in list order.

---

### baseURLShape?

> `optional` **baseURLShape?**: [`DecideBaseURLShape`](DecideBaseURLShape.md)

Refuses a base URL of another shape before any request. Omitted means no check.

---

### endpoint

> **endpoint**: `string`

Request URL; `{baseURL}` is the only placeholder.

---

### model

> **model**: [`DecideModel`](DecideModel.md)

---

### media?

> `optional` **media?**: [`DecideMedia`](DecideMedia.md)

Body keys for images and video, after `model`, `state` and `questions`. Omitted means the body never carries media.

---

### ambientKeyGuard?

> `optional` **ambientKeyGuard?**: [`DecideAmbientKeyGuard`](DecideAmbientKeyGuard.md)

Keeps a key found only in the environment from becoming the default
decision provider when it plainly belongs to something else. Omitted means
no check.

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
