[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareWindowObservation

# Type Alias: ProxyShareWindowObservation

> **ProxyShareWindowObservation** = `object`

A before/after utilization observation for one borrowed request.

Recorded where the response's quota headers are parsed, because that is the
only point at which both the previous snapshot and the new one are in hand.
Token usage settles separately: on a stream it is not known until
`message_delta`, long after the headers arrived.

## Properties

### grantId

> **grantId**: `string`

---

### accountKey

> **accountKey**: `string`

---

### sessionBefore?

> `optional` **sessionBefore?**: `number` \| `null`

---

### sessionAfter?

> `optional` **sessionAfter?**: `number` \| `null`

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number` \| `null`

---

### weeklyBefore?

> `optional` **weeklyBefore?**: `number` \| `null`

---

### weeklyAfter?

> `optional` **weeklyAfter?**: `number` \| `null`

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number` \| `null`
