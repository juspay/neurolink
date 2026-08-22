[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2476)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2477)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2478)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2479)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2484)
