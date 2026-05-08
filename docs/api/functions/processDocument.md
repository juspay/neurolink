[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / processDocument

# Function: processDocument()

> **processDocument**(`text`, `options?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/index.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/index.ts#L175)

Process a document through the full RAG pipeline

## Parameters

### text

`string`

Document text to process

### options?

Processing options

#### strategy?

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Chunking strategy (default: recursive)

#### maxSize?

`number`

Maximum chunk size

#### overlap?

`number`

Chunk overlap

#### extract?

[`ExtractParams`](../type-aliases/ExtractParams.md)

Metadata extraction options

#### provider?

`string`

Provider for metadata extraction

#### model?

`string`

Model for metadata extraction

#### metadata?

`Record`\<`string`, `unknown`\>

Custom metadata to add

## Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Processed chunks with optional metadata
