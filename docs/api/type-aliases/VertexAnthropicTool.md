[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2621](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2621)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2622)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2623)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2624)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2629)
