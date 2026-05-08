[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / assembleContext

# Function: assembleContext()

> **assembleContext**(`results`, `options?`): `string`

Defined in: [rag/pipeline/contextAssembly.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/contextAssembly.ts#L44)

Assemble context from retrieved results

Combines multiple chunks into a coherent context string
suitable for LLM consumption.

## Parameters

### results

([`Chunk`](../type-aliases/Chunk.md) \| [`VectorQueryResult`](../type-aliases/VectorQueryResult.md))[]

Retrieved chunks or query results

### options?

[`ContextAssemblyOptions`](../type-aliases/ContextAssemblyOptions.md)

Assembly options

## Returns

`string`

Assembled context string

## Example

```typescript
const context = assembleContext(results, {
  maxTokens: 4000,
  citationFormat: "numbered",
  deduplicate: true,
});
```
