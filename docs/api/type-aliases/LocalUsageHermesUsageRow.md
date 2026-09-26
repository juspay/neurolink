[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageHermesUsageRow

# Type Alias: LocalUsageHermesUsageRow

> **LocalUsageHermesUsageRow** = `object`

One usage row as this subsystem reads it out of Hermes Agent's `state.db` —
either a `session_model_usage` row, or a `sessions` row projected onto the
same columns for a session that predates that table. Every column but the
first five may be absent from an older schema and is selected with a
default, so they are optional here. `at` is the row's last activity in
epoch SECONDS, coalesced from whichever timestamp the schema has.

## Properties

### session_id

> **session_id**: `string`

---

### model

> **model**: `string` \| `null`

---

### api_call_count

> **api_call_count**: `number` \| `null`

---

### input_tokens

> **input_tokens**: `number` \| `null`

---

### output_tokens

> **output_tokens**: `number` \| `null`

---

### cache_read_tokens?

> `optional` **cache_read_tokens?**: `number` \| `null`

---

### cache_write_tokens?

> `optional` **cache_write_tokens?**: `number` \| `null`

---

### reasoning_tokens?

> `optional` **reasoning_tokens?**: `number` \| `null`

---

### estimated_cost_usd?

> `optional` **estimated_cost_usd?**: `number` \| `null`

---

### actual_cost_usd?

> `optional` **actual_cost_usd?**: `number` \| `null`

---

### cost_status?

> `optional` **cost_status?**: `string` \| `null`

---

### at?

> `optional` **at?**: `number` \| `null`
