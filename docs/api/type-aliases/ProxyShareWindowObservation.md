[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3961)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3962)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3963)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3964)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3965)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3967)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3968)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3969)
