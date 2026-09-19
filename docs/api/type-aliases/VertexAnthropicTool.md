[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2542)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2543)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2544)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2545)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2550)
