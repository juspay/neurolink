[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2933)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2934)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2935)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2937)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2939)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2941)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2943)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2945)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
