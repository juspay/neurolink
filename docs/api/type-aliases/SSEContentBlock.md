[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2733)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2736)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
