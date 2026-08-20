[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2304)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2305)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2306)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2308)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2314)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2316)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
