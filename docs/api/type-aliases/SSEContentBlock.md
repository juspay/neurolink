[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEContentBlock

# Type Alias: SSEContentBlock

> **SSEContentBlock** = `object`

Defined in: [types/proxy.ts:2698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2698)

Individual content block observed during an SSE stream.

## Properties

### index

> **index**: `number`

Defined in: [types/proxy.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2699)

---

### type

> **type**: `"text"` \| `"thinking"` \| `"tool_use"` \| `"tool_result"`

Defined in: [types/proxy.ts:2700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2700)

---

### text?

> `optional` **text?**: `string`

Defined in: [types/proxy.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2702)

Accumulated text for text blocks. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/proxy.ts:2704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2704)

Accumulated thinking content. Capped at MAX_BLOCK_CONTENT_BYTES.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/proxy.ts:2706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2706)

Tool name for tool_use blocks.

---

### toolId?

> `optional` **toolId?**: `string`

Defined in: [types/proxy.ts:2708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2708)

Tool call id for tool_use blocks.

---

### toolInput?

> `optional` **toolInput?**: `string`

Defined in: [types/proxy.ts:2710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2710)

Accumulated partial JSON input for tool_use blocks. Capped at MAX_BLOCK_CONTENT_BYTES.
