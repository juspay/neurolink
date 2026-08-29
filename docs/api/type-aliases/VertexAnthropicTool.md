[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2508)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2509)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2510)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2511)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2516)
