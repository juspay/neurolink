[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2501)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2502)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2503](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2503)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2504)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2509)
