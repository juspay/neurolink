[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalSegment

# Type Alias: ServerSTTEvalSegment

> **ServerSTTEvalSegment** = `object`

One finalized transcript segment, from the STT people saw or the one run alongside it.

## Properties

### id

> **id**: `string`

Stable per segment: a resend with the same id replaces it.

---

### source

> **source**: `"primary"` \| `"shadow"`

`primary` = shown to users, `shadow` = run for evaluation only.

---

### model

> **model**: `string`

---

### participant_identity

> **participant_identity**: `string`

---

### participant_name?

> `optional` **participant_name?**: `string`

---

### text

> **text**: `string`

---

### language?

> `optional` **language?**: `string` \| `null`

---

### start_time?

> `optional` **start_time?**: `number` \| `null`

Epoch seconds, when the STT reports timings.

---

### end_time?

> `optional` **end_time?**: `number` \| `null`

---

### received_at

> **received_at**: `number`

Epoch seconds the sender received the final.
