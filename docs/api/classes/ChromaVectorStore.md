[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaVectorStore

# Class: ChromaVectorStore

Defined in: [rag/stores/chroma.ts:255](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/stores/chroma.ts#L255)

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

## Implements

- [`VectorStore`](../type-aliases/VectorStore.md)

## Constructors

### Constructor

> **new ChromaVectorStore**(`client`, `options?`): `ChromaVectorStore`

Defined in: [rag/stores/chroma.ts:262](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/stores/chroma.ts#L262)

#### Parameters

##### client

[`ChromaClientLike`](../type-aliases/ChromaClientLike.md)

##### options?

[`ChromaVectorStoreOptions`](../type-aliases/ChromaVectorStoreOptions.md) = `{}`

#### Returns

`ChromaVectorStore`

## Methods

### upsert()

> **upsert**(`indexName`, `items`): `Promise`\<`void`\>

Defined in: [rag/stores/chroma.ts:281](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/stores/chroma.ts#L281)

Add or update vectors in an index (Chroma collection).

#### Parameters

##### indexName

`string`

##### items

`object`[]

#### Returns

`Promise`\<`void`\>

---

### query()

> **query**(`params`): `Promise`\<[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]\>

Defined in: [rag/stores/chroma.ts:303](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/stores/chroma.ts#L303)

Query vectors by similarity.

#### Parameters

##### params

###### indexName

`string`

###### queryVector

`number`[]

###### topK?

`number`

###### filter?

[`MetadataFilter`](../type-aliases/MetadataFilter.md)

###### includeVectors?

`boolean`

#### Returns

`Promise`\<[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]\>

#### Implementation of

`VectorStore.query`

---

### delete()

> **delete**(`indexName`, `ids`): `Promise`\<`void`\>

Defined in: [rag/stores/chroma.ts:358](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/stores/chroma.ts#L358)

Delete vectors from an index (Chroma collection) by id.

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
