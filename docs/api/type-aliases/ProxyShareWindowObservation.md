[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3869)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3870)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3871)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3872)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3873)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3874)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3875)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3876)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3877)
