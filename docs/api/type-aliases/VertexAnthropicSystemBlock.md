[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicSystemBlock

# Type Alias: VertexAnthropicSystemBlock

> **VertexAnthropicSystemBlock** = `object`

Defined in: [types/providers.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2504)

System prompt block form accepted by the Anthropic Vertex SDK. Used instead
of a bare string when a `cache_control` breakpoint must ride on the system
prompt (a string `system` cannot carry one).

## Properties

### type

> **type**: `"text"`

Defined in: [types/providers.ts:2505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2505)

---

### text

> **text**: `string`

Defined in: [types/providers.ts:2506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2506)

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2507)
