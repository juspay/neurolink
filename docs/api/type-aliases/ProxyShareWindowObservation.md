[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4469)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4470)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4471)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4472)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4473)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4474)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4475)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4476)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4477)
