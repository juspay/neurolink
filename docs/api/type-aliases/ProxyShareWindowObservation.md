[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

Defined in: [types/proxy.ts:3939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3939)

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3940)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3941)

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3942)

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3943)

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3944)

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

Defined in: [types/proxy.ts:3945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3945)

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

Defined in: [types/proxy.ts:3946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3946)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:3947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3947)
