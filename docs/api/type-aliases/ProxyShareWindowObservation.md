[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3998)
