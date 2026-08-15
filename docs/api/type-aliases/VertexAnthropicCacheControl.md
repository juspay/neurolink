[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheControl

# Type Alias: VertexAnthropicCacheControl

> **VertexAnthropicCacheControl** = `object`

Defined in: [types/providers.ts:2378](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L2378)

Anthropic ephemeral prompt-cache breakpoint marker. Placed on a content
block / tool / system block to make the rendered prefix up to that point a
cache breakpoint. Vertex has NO automatic caching, so these explicit markers
are the only way the conversation prefix is cached across turns.

## Properties

### type

> **type**: `"ephemeral"`

Defined in: [types/providers.ts:2378](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L2378)
