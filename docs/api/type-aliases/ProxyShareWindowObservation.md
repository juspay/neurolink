[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4721)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4722)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4723)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4724)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4725)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4726)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4727)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4728)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4729)
