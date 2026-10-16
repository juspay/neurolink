[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalBatchRequest

# Type Alias: ServerSTTEvalBatchRequest

> **ServerSTTEvalBatchRequest** = `object`

Body of `POST /v1/evals/stt`: one batch of a call's segments.

## Properties

### call_id

> **call_id**: `string`

---

### room?

> `optional` **room?**: `string`

---

### batch

> **batch**: `number`

1, 2, … per call. Numbers may skip when a send failed and was folded into the next.

---

### final?

> `optional` **final?**: `boolean`

True on the batch sent after the last participant left.

---

### models

> **models**: `object`

#### primary

> **primary**: `string`

#### shadow

> **shadow**: `string`

---

### segments

> **segments**: [`ServerSTTEvalSegment`](ServerSTTEvalSegment.md)[]
