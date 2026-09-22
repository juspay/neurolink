[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2594)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2595](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2595)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2596](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2596)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2597](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2597)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2602](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2602)
