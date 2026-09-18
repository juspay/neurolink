[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4339)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4340)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4341)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4342)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4343)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4344)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4345)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4346)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4347)
