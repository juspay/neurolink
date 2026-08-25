[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheControl

# Type Alias: VertexAnthropicCacheControl

> **VertexAnthropicCacheControl** = `object`

Defined in: [types/providers.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2434)

Anthropic ephemeral prompt-cache breakpoint marker. Placed on a content
block / tool / system block to make the rendered prefix up to that point a
cache breakpoint. Vertex has NO automatic caching, so these explicit markers
are the only way the conversation prefix is cached across turns.

## Properties

### type

> **type**: `"ephemeral"`

Defined in: [types/providers.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2434)
