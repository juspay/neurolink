[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeToolResultBlock

# Type Alias: ClaudeToolResultBlock

> **ClaudeToolResultBlock** = `object`

Tool-result block sent back by the caller.

## Properties

### type

> **type**: `"tool_result"`

---

### tool_use_id

> **tool_use_id**: `string`

---

### content

> **content**: `string` \| [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

---

### cache_control?

> `optional` **cache_control?**: [`ClaudeCacheControl`](ClaudeCacheControl.md)
