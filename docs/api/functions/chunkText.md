[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / chunkText

# Function: chunkText()

> **chunkText**(`text`, `strategy?`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/chunkerRegistry.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/chunkerRegistry.ts#L217)

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
