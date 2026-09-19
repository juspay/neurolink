[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicSystemBlock

# Type Alias: VertexAnthropicSystemBlock

> **VertexAnthropicSystemBlock** = `object`

Defined in: [types/providers.ts:2583](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2583)

System prompt block form accepted by the Anthropic Vertex SDK. Used instead
of a bare string when a `cache_control` breakpoint must ride on the system
prompt (a string `system` cannot carry one).

## Properties

### type

> **type**: `"text"`

Defined in: [types/providers.ts:2584](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2584)

---

### text

> **text**: `string`

Defined in: [types/providers.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2585)

---

### cache_control?

> `optional` **cache_control?**: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md)

Defined in: [types/providers.ts:2586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2586)
