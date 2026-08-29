[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCopilotUsageRow

# Type Alias: LocalUsageCopilotUsageRow

> **LocalUsageCopilotUsageRow** = `object`

Defined in: [types/localUsage.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L255)

One row of Copilot CLI's `assistant_usage_events` SQLite table, restricted
to the columns `copilotCliReader.ts` actually reads. `cache_read_tokens`
and `cache_write_tokens` are both subsets of `input_tokens` — see that
reader's module header for the arithmetic proof.

## Properties

### model

> **model**: `string` \| `null`

Defined in: [types/localUsage.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L256)

---

### input_tokens

> **input_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L257)

---

### output_tokens

> **output_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L258)

---

### cache_read_tokens

> **cache_read_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L259)

---

### cache_write_tokens

> **cache_write_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L260)

---

### reasoning_tokens

> **reasoning_tokens**: `number` \| `null`

Defined in: [types/localUsage.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L261)

---

### created_at

> **created_at**: `string` \| `null`

Defined in: [types/localUsage.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L262)
