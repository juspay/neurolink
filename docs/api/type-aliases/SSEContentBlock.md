[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:3063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3063)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:3064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3064)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:3067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3067)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:3069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3069)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:3071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3071)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:3075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3075)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
