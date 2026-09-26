[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2628)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2629)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2630)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2631)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2636)
