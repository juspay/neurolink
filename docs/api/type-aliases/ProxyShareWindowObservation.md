[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:4586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4586)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4587)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4588)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4589)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4590)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4591)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:4592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4592)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:4593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4593)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:4594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4594)
