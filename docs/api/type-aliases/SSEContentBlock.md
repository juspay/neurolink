[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2414)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2415)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2416)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2422)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2426)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
