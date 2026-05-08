[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipeline

# Class: RAGPipeline

Defined in: [rag/pipeline/RAGPipeline.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L70)

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

Defined in: [rag/pipeline/RAGPipeline.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L82)

#### Parameters

##### config

[`RAGPipelineConfig`](../type-aliases/RAGPipelineConfig.md)

#### Returns

`RAGPipeline`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [rag/pipeline/RAGPipeline.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L112)

Initialize the pipeline (lazy loading of providers)

#### Returns

`Promise`\<`void`\>

---

### ingest()

> **ingest**(`sources`, `options?`): `Promise`\<\{ `documentsProcessed`: `number`; `chunksCreated`: `number`; \}\>

Defined in: [rag/pipeline/RAGPipeline.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L146)

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

Defined in: [rag/pipeline/RAGPipeline.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L273)

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

Defined in: [rag/pipeline/RAGPipeline.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L418)

Get pipeline statistics

#### Returns

[`PipelineStats`](../type-aliases/PipelineStats.md)

---

### getId()

> **getId**(): `string`

Defined in: [rag/pipeline/RAGPipeline.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L432)

Get pipeline ID

#### Returns

`string`

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [rag/pipeline/RAGPipeline.ts:439](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/RAGPipeline.ts#L439)

Clear all indexed data

#### Returns

`Promise`\<`void`\>
