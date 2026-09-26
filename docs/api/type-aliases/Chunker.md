[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunker

# Type Alias: Chunker

> **Chunker** = `object`

Chunker type - all chunking strategies implement this

## Properties

### strategy

> `readonly` **strategy**: [`ChunkingStrategy`](ChunkingStrategy.md)

Strategy name for identification

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](Chunk.md)[]\>

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
