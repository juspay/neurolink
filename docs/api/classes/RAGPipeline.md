[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipeline

# Class: RAGPipeline

Defined in: [rag/pipeline/RAGPipeline.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L93)

RAG (Retrieval-Augmented Generation) Document Processing

Comprehensive RAG system with document loading, chunking, embedding,
retrieval, and context assembly capabilities.

## Example

```typescript
import {
  MDocument,
  loadDocument,
  RAGPipeline,
  ChunkerRegistry,
} from "@juspay/neurolink";

// Load and process a document
const doc = await loadDocument("/path/to/document.md");
await doc.chunk({ strategy: "markdown", config: { maxSize: 1000 } });

// Use the full RAG pipeline
const pipeline = new RAGPipeline({
  embeddingModel: { provider: "openai", modelName: "text-embedding-3-small" },
  generationModel: { provider: "openai", modelName: "gpt-4o-mini" },
});
await pipeline.ingest(["./docs/*.md"]);
const response = await pipeline.query("What are the key features?");
console.log(response.answer);
```

## Constructors

### Constructor

> **new RAGPipeline**(`config`): `RAGPipeline`

Defined in: [rag/pipeline/RAGPipeline.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L116)

#### Parameters

##### config

[`RAGPipelineConfig`](../type-aliases/RAGPipelineConfig.md)

#### Returns

`RAGPipeline`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [rag/pipeline/RAGPipeline.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L161)

Initialize the pipeline (lazy loading of providers)

#### Returns

`Promise`\<`void`\>

---

### ingest()

> **ingest**(`sources`, `options?`): `Promise`\<\{ `documentsProcessed`: `number`; `chunksCreated`: `number`; \}\>

Defined in: [rag/pipeline/RAGPipeline.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L208)

Ingest documents into the pipeline

#### Parameters

##### sources

(`string` \| [`MDocument`](MDocument.md))[]

Array of file paths, URLs, or MDocument instances

##### options?

[`IngestOptions`](../type-aliases/IngestOptions.md)

Ingestion options

#### Returns

`Promise`\<\{ `documentsProcessed`: `number`; `chunksCreated`: `number`; \}\>

---

### query()

> **query**(`query`, `options?`): `Promise`\<[`RAGResponse`](../type-aliases/RAGResponse.md)\>

Defined in: [rag/pipeline/RAGPipeline.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L335)

Query the pipeline

#### Parameters

##### query

`string`

Search query

##### options?

[`QueryOptions`](../type-aliases/QueryOptions.md)

Query options

#### Returns

`Promise`\<[`RAGResponse`](../type-aliases/RAGResponse.md)\>

RAG response with retrieved context and optional generated answer

---

### getStats()

> **getStats**(): [`PipelineStats`](../type-aliases/PipelineStats.md)

Defined in: [rag/pipeline/RAGPipeline.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L541)

Get pipeline statistics

#### Returns

[`PipelineStats`](../type-aliases/PipelineStats.md)

---

### getId()

> **getId**(): `string`

Defined in: [rag/pipeline/RAGPipeline.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L555)

Get pipeline ID

#### Returns

`string`

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [rag/pipeline/RAGPipeline.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L562)

Clear all indexed data

#### Returns

`Promise`\<`void`\>

---

### ingestImages()

> **ingestImages**(`sources`, `options?`): `Promise`\<\{ `imagesProcessed`: `number`; `chunksCreated`: `number`; \}\>

Defined in: [rag/pipeline/RAGPipeline.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L587)

Ingest images into the pipeline for multi-modal RAG.
Loads images, generates embeddings via the configured multi-modal provider,
and stores them alongside text chunks in the vector store.

#### Parameters

##### sources

(`string` \| `Buffer`\<`ArrayBufferLike`\>)[]

Array of image file paths, URLs, or Buffer objects

##### options?

[`IngestOptions`](../type-aliases/IngestOptions.md)

Ingestion options

#### Returns

`Promise`\<\{ `imagesProcessed`: `number`; `chunksCreated`: `number`; \}\>

---

### queryMultiModal()

> **queryMultiModal**(`query`, `options?`): `Promise`\<[`MultiModalSearchResult`](../type-aliases/MultiModalSearchResult.md)[]\>

Defined in: [rag/pipeline/RAGPipeline.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L804)

Query the pipeline with multi-modal input (text, image, or both).

#### Parameters

##### query

[`EmbedInput`](../type-aliases/EmbedInput.md)

Text, image, or combined query

##### options?

[`QueryOptions`](../type-aliases/QueryOptions.md)

Query options

#### Returns

`Promise`\<[`MultiModalSearchResult`](../type-aliases/MultiModalSearchResult.md)[]\>

Array of multi-modal search results

---

### getMultiModalStats()

> **getMultiModalStats**(): `object`

Defined in: [rag/pipeline/RAGPipeline.ts:885](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/RAGPipeline.ts#L885)

Get multi-modal pipeline statistics

#### Returns

`object`

##### totalImages

> **totalImages**: `number`

##### totalTextChunks

> **totalTextChunks**: `number`

##### multiModalEnabled

> **multiModalEnabled**: `boolean`
