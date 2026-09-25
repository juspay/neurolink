[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4659)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4660)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4661)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4662)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4663)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4664)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4665)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4666)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4667)
