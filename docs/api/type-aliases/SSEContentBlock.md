[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:3053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3053)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:3054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3054)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:3055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3055)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:3057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3057)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:3059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3059)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:3061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3061)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:3063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3063)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
