[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2529)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2530)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2531)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2532](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2532)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2537)
