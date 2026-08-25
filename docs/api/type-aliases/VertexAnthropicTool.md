[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2494)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2495)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2496)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2497)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2502)
