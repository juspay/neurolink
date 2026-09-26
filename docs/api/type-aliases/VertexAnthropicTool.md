[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2668)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2669)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2670)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2671](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2671)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2676)
