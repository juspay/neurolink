[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2862)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2863)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2864)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2866)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2868)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2870)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2872)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
