[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4566)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4567)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4568)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4569)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4570)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4571)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4572)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4573)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4574)
