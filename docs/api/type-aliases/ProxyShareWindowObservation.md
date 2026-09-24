[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4711)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4712)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4713)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4714)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4715)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4716)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4717)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4718)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4719)
