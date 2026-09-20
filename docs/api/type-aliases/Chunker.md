[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunker

# Type Alias: Chunker

> **Chunker** = `object`

Defined in: [types/rag.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L24)

Chunker type - all chunking strategies implement this

## Properties

### strategy

> `readonly` **strategy**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L26)

Strategy name for identification

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](Chunk.md)[]\>

Defined in: [types/rag.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L34)

Split text into chunks

#### Parameters

##### text

`string`

The text to chunk

##### config?

[`BaseChunkerConfig`](BaseChunkerConfig.md)

Strategy-specific configuration

#### Returns

`Promise`\<[`Chunk`](Chunk.md)[]\>

Array of chunks
