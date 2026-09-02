[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2393)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2399)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2401)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2403)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2405)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
