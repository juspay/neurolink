[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCopilotUsageRow

# Type Alias: LocalUsageCopilotUsageRow

> **LocalUsageCopilotUsageRow** = `object`

One row of Copilot CLI's `assistant_usage_events` SQLite table, restricted
to the columns `copilotCliReader.ts` actually reads. `cache_read_tokens`
and `cache_write_tokens` are both subsets of `input_tokens` — see that
reader's module header for the arithmetic proof.

## Properties

### model

> **model**: `string` \| `null`

---

### input_tokens

> **input_tokens**: `number` \| `null`

---

### output_tokens

> **output_tokens**: `number` \| `null`

---

### cache_read_tokens

> **cache_read_tokens**: `number` \| `null`

---

### cache_write_tokens

> **cache_write_tokens**: `number` \| `null`

---

### reasoning_tokens

> **reasoning_tokens**: `number` \| `null`

---

### created_at

> **created_at**: `string` \| `null`
