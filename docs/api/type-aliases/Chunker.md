[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunker

# Type Alias: Chunker

> **Chunker** = `object`

Defined in: [types/rag.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L23)

Chunker type - all chunking strategies implement this

## Properties

### strategy

> `readonly` **strategy**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L25)

Strategy name for identification

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](Chunk.md)[]\>

Defined in: [types/rag.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L33)

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
