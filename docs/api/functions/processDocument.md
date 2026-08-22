[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / processDocument

# Function: processDocument()

> **processDocument**(`text`, `options?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/index.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/rag/index.ts#L177)

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
