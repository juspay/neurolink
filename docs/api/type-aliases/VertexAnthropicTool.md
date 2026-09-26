[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2630)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2631)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2632)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2633)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2638](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2638)
