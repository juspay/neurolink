[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / chunkText

# Function: chunkText()

> **chunkText**(`text`, `strategy?`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

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
