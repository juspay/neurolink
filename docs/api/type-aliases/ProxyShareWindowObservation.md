[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3970)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3971)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3972)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3973)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3974)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3975)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3976)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3977)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3978)
