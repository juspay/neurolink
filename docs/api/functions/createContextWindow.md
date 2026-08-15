[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextWindow

# Function: createContextWindow()

> **createContextWindow**(`results`, `options?`): [`ContextWindow`](../type-aliases/ContextWindow.md)

Defined in: [rag/pipeline/contextAssembly.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/pipeline/contextAssembly.ts#L204)

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
