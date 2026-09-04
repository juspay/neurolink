[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2408)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2409)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2410)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2412)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2414)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2416)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
