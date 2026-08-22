[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunker

# Type Alias: Chunker

> **Chunker** = `object`

Defined in: [types/rag.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L22)

Chunker type - all chunking strategies implement this

## Properties

### strategy

> `readonly` **strategy**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L24)

Strategy name for identification

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](Chunk.md)[]\>

Defined in: [types/rag.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L32)

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
