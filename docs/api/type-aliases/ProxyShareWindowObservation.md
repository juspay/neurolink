[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3977)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3978)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3979)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3980)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3981)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3982)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3983)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3984)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3985)
