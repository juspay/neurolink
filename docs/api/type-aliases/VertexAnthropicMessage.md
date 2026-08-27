[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicMessage

# Type Alias: VertexAnthropicMessage

> **VertexAnthropicMessage** = `object`

Defined in: [types/providers.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2438)

## Properties

### role

> **role**: `"user"` \| `"assistant"`

Defined in: [types/providers.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2439)

---

### content

> **content**: `string` \| (\{ `type`: `"text"`; `text`: `string`; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"image"`; `source`: \{ `type`: `"base64"`; `media_type`: `string`; `data`: `string`; \}; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"document"`; `source`: \{ `type`: `"base64"`; `media_type`: `string`; `data`: `string`; \}; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"tool_use"`; `id`: `string`; `name`: `string`; `input`: `unknown`; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"tool_result"`; `tool_use_id`: `string`; `content`: `string`; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"thinking"`; `thinking`: `string`; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \} \| \{ `type`: `"redacted_thinking"`; `data`: `string`; `cache_control?`: [`VertexAnthropicCacheControl`](VertexAnthropicCacheControl.md); \})[]

Defined in: [types/providers.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2440)
