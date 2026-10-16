[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalBatchResponse

# Type Alias: ServerSTTEvalBatchResponse

> **ServerSTTEvalBatchResponse** = `object`

Answer to `POST /v1/evals/stt`.

## Properties

### call_id

> **call_id**: `string`

---

### batch

> **batch**: `number`

---

### final

> **final**: `boolean`

---

### inserted

> **inserted**: `number`

New segment ids.

---

### updated

> **updated**: `number`

Ids already held (a resend), replaced.

---

### ignored

> **ignored**: `number`

New ids refused because the call is at `maxSegmentsPerCall`.

---

### segments

> **segments**: `object`

#### primary

> **primary**: `number`

#### shadow

> **shadow**: `number`
