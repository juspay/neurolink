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

### authHeader?

> `optional` **authHeader?**: `"bearer"` \| `"x-api-key"`

How the API key is sent. `bearer`, the default when omitted, sends
`Authorization: Bearer <key>`. `x-api-key` sends `x-api-key: <key>` and no
`Authorization` header at all. This is the decide request's own setting;
`quirks.authHeaderStyle` belongs to the chat path and is not read here.

---

### stateEncoding?

> `optional` **stateEncoding?**: `"text"`

`text` makes the state that goes out always a string: a string is sent
unchanged (not trimmed), any other value is sent as its JSON text, and a
state that is blank after trimming is refused before any request, as an
`invalid_request`. Omitted means the state goes out as given.

---

### media?

> `optional` **media?**: [`DecideMedia`](DecideMedia.md)

Body keys for images and video, after `model`, `state` and `questions`. Omitted means the body never carries media.

---

### capableModel?

> `optional` **capableModel?**: [`DecideCapableModel`](DecideCapableModel.md)

A model the request is sent to instead of the default when the call names
no model, no model variable is set, and the request carries media or a
question of one of `questionTypes`. Its `decisionLimits` row is the one
checked. For a text default that cannot read those requests, whose server
would otherwise hand them to this model behind its back, with a smaller
window than the one checked. Omitted means the default model is always sent.

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
