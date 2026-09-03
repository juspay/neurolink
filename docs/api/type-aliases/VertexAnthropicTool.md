[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2526)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2527)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2528)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2529)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2534)
