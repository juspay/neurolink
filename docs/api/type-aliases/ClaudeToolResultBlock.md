[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeToolResultBlock

# Type Alias: ClaudeToolResultBlock

> **ClaudeToolResultBlock** = `object`

Defined in: [types/proxy.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L111)

Tool-result block sent back by the caller.

## Properties

### type

> **type**: `"tool_result"`

Defined in: [types/proxy.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L112)

---

### tool_use_id

> **tool_use_id**: `string`

Defined in: [types/proxy.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L113)

---

### content

> **content**: `string` \| [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L114)

---

### cache_control?

> `optional` **cache_control?**: [`ClaudeCacheControl`](ClaudeCacheControl.md)

Defined in: [types/proxy.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L115)
