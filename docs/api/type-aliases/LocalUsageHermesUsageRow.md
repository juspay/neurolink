[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageHermesUsageRow

# Type Alias: LocalUsageHermesUsageRow

> **LocalUsageHermesUsageRow** = `object`

Defined in: [types/localUsage.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L342)

One usage row as this subsystem reads it out of Hermes Agent's `state.db` —
either a `session_model_usage` row, or a `sessions` row projected onto the
same columns for a session that predates that table. Every column but the
first five may be absent from an older schema and is selected with a
default, so they are optional here. `at` is the row's last activity in
epoch SECONDS, coalesced from whichever timestamp the schema has.

## Properties

### session_id

> **session_id**: `string`

Defined in: [types/localUsage.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L343)

---

### model

> **model**: `string` \| `null`

Defined in: [types/localUsage.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L344)

---

### api_call_count

> **api_call_count**: `number` \| `null`

Defined in: [types/localUsage.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L345)

---

### input_tokens

> **input_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L346)

---

### output_tokens

> **output_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L347)

---

### cache_read_tokens?

> `optional` **cache_read_tokens?**: `number` \| `null`

Defined in: [types/localUsage.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L348)

---

### cache_write_tokens?

> `optional` **cache_write_tokens?**: `number` \| `null`

Defined in: [types/localUsage.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L349)

---

### reasoning_tokens?

> `optional` **reasoning_tokens?**: `number` \| `null`

Defined in: [types/localUsage.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L350)

---

### estimated_cost_usd?

> `optional` **estimated_cost_usd?**: `number` \| `null`

Defined in: [types/localUsage.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L351)

---

### actual_cost_usd?

> `optional` **actual_cost_usd?**: `number` \| `null`

Defined in: [types/localUsage.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L352)

---

### cost_status?

> `optional` **cost_status?**: `string` \| `null`

Defined in: [types/localUsage.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L353)

---

### at?

> `optional` **at?**: `number` \| `null`

Defined in: [types/localUsage.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L354)
