[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / formatContextWithCitations

# Function: formatContextWithCitations()

> **formatContextWithCitations**(`results`, `options?`): `object`

Defined in: [rag/pipeline/contextAssembly.ts:168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/contextAssembly.ts#L168)

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
