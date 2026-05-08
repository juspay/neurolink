[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextWindow

# Function: createContextWindow()

> **createContextWindow**(`results`, `options?`): [`ContextWindow`](../type-aliases/ContextWindow.md)

Defined in: [rag/pipeline/contextAssembly.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/contextAssembly.ts#L204)

Create a context window with detailed tracking

## Parameters

### results

([`Chunk`](../type-aliases/Chunk.md) \| [`VectorQueryResult`](../type-aliases/VectorQueryResult.md))[]

Retrieved results

### options?

[`ContextAssemblyOptions`](../type-aliases/ContextAssemblyOptions.md)

Assembly options

## Returns

[`ContextWindow`](../type-aliases/ContextWindow.md)

Context window with metadata
