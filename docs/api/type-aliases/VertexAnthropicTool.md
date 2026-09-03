[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2516)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2517)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2518](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2518)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2519)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2524)
