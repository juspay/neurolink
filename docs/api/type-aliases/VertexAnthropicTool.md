[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2590)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2591](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2591)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2592](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2592)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2593](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2593)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2598](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2598)
