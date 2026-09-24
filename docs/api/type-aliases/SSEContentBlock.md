[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2936)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2937)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2938)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2940)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2942)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2944)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2946)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2948)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
