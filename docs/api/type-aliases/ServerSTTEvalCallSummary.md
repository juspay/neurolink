[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalCallSummary

# Type Alias: ServerSTTEvalCallSummary

> **ServerSTTEvalCallSummary** = `object`

One call in `GET /v1/evals/stt`.

## Properties

### call_id

> **call_id**: `string`

---

### room

> **room**: `string` \| `null`

---

### models

> **models**: `object`

#### primary

> **primary**: `string`

#### shadow

> **shadow**: `string`

---

### final

> **final**: `boolean`

---

### batches

> **batches**: `number`

---

### segments

> **segments**: `object`

#### primary

> **primary**: `number`

#### shadow

> **shadow**: `number`

---

### speakers

> **speakers**: `number`

---

### first_received_at

> **first_received_at**: `number` \| `null`

---

### last_received_at

> **last_received_at**: `number` \| `null`

---

### updated_at

> **updated_at**: `number`

Epoch ms this server last accepted a batch.
