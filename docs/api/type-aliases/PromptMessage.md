[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PromptMessage

# Type Alias: PromptMessage

> **PromptMessage** = `object`

Defined in: [types/mcp.ts:2025](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2025)

Prompt message content

## Properties

### role

> **role**: `"user"` \| `"assistant"`

Defined in: [types/mcp.ts:2029](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2029)

Message role

---

### content

> **content**: `object`

Defined in: [types/mcp.ts:2034](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2034)

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
