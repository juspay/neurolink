[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCopilotUsageRow

# Type Alias: LocalUsageCopilotUsageRow

> **LocalUsageCopilotUsageRow** = `object`

Defined in: [types/localUsage.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L324)

One row of Copilot CLI's `assistant_usage_events` SQLite table, restricted
to the columns `copilotCliReader.ts` actually reads. `cache_read_tokens`
and `cache_write_tokens` are both subsets of `input_tokens` — see that
reader's module header for the arithmetic proof.

## Properties

### model

> **model**: `string` \| `null`

Defined in: [types/localUsage.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L325)

---

### input_tokens

> **input_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L326)

---

### output_tokens

> **output_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L327)

---

### cache_read_tokens

> **cache_read_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L328)

---

### cache_write_tokens

> **cache_write_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L329)

---

### reasoning_tokens

> **reasoning_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L330)

---

### created_at

> **created_at**: `string` \| `null`

Defined in: [types/localUsage.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L331)
