[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / assembleContext

# Function: assembleContext()

> **assembleContext**(`results`, `options?`): `string`

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
