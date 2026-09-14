[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4300)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4301)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4302)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4303)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4304)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4305)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4306)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4307)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4308)
