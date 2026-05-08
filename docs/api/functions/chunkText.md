[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / chunkText

# Function: chunkText()

> **chunkText**(`text`, `strategy?`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/chunkerRegistry.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L217)

Convenience function to chunk text with a given strategy

## Parameters

### text

`string`

Text to chunk

### strategy?

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md) = `"recursive"`

Chunking strategy (default: "recursive")

### config?

`Record`\<`string`, `unknown`\>

Strategy-specific configuration

## Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Array of chunks
