[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2511)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2512)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2513](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2513)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2514)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2519)
