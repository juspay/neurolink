[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2533)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2534)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2535)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2536)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2541)
