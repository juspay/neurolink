[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PromptMessage

# Type Alias: PromptMessage

> **PromptMessage** = `object`

Defined in: [types/mcp.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2025)

Prompt message content

## Properties

### role

> **role**: `"user"` \| `"assistant"`

Defined in: [types/mcp.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2029)

Message role

---

### content

> **content**: `object`

Defined in: [types/mcp.ts:2034](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2034)

Message content

#### type

> **type**: `"text"` \| `"image"` \| `"resource"`

#### text?

> `optional` **text?**: `string`

#### data?

> `optional` **data?**: `string`

#### mimeType?

> `optional` **mimeType?**: `string`

#### uri?

> `optional` **uri?**: `string`
