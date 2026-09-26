[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:3003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3003)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:3004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3004)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:3005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3005)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:3007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3007)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:3009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3009)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:3011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3011)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:3013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3013)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:3015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3015)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
