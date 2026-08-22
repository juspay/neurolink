[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheControl

# Type Alias: VertexAnthropicCacheControl

> **VertexAnthropicCacheControl** = `object`

Defined in: [types/providers.ts:2416](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2416)

Anthropic ephemeral prompt-cache breakpoint marker. Placed on a content
block / tool / system block to make the rendered prefix up to that point a
cache breakpoint. Vertex has NO automatic caching, so these explicit markers
are the only way the conversation prefix is cached across turns.

## Properties

### type

> **type**: `"ephemeral"`

Defined in: [types/providers.ts:2416](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2416)
