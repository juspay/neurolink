[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunker

# Type Alias: Chunker

> **Chunker** = `object`

Defined in: [types/rag.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L20)

Chunker type - all chunking strategies implement this

## Properties

### strategy

> `readonly` **strategy**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L22)

Strategy name for identification

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](Chunk.md)[]\>

Defined in: [types/rag.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L30)

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
