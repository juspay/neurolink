[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / formatContextWithCitations

# Function: formatContextWithCitations()

> **formatContextWithCitations**(`results`, `options?`): `object`

Defined in: [rag/pipeline/contextAssembly.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/contextAssembly.ts#L168)

Format context with inline citations

## Parameters

### results

([`Chunk`](../type-aliases/Chunk.md) \| [`VectorQueryResult`](../type-aliases/VectorQueryResult.md))[]

Retrieved results

### options?

[`ContextAssemblyOptions`](../type-aliases/ContextAssemblyOptions.md) & `object`

Formatting options

## Returns

`object`

Context with citations and citation list

### context

> **context**: `string`

### citations

> **citations**: `string`[]
