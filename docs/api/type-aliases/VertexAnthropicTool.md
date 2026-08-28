[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicTool

# Type Alias: VertexAnthropicTool

> **VertexAnthropicTool** = `object`

Defined in: [types/providers.ts:2498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2498)

Tool definition accepted by the Anthropic Vertex SDK.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2499)

---

### description

> **description**: `string`

Defined in: [types/providers.ts:2500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2500)

---

### input_schema

> **input_schema**: `object`

Defined in: [types/providers.ts:2501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2501)

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, `unknown`\>

#### required?

> `optional` **required?**: `string`[]

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2506)
