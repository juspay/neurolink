[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgVectorStore

# Class: PgVectorStore

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

> **new PgVectorStore**(`client`, `options?`): `PgVectorStore`

#### Parameters

##### client

[`PgClientLike`](../type-aliases/PgClientLike.md)

##### options?

[`PgVectorStoreOptions`](../type-aliases/PgVectorStoreOptions.md) = `{}`

#### Returns

`PgVectorStore`

## Methods

### upsert()

> **upsert**(`indexName`, `items`): `Promise`\<`void`\>

Upsert vectors into an index, creating its table on first use.
Mirrors `InMemoryVectorStore.upsert` (metadata defaults to `{}`).

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

Query by cosine similarity. Returns `[]` if the index's table doesn't
exist yet (mirrors `InMemoryVectorStore.query` on an unknown index)
rather than throwing.

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

Delete vectors by id. No-op if the index's table doesn't exist yet
(mirrors `InMemoryVectorStore.delete`).

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
