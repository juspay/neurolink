[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryVectorStore

# Class: InMemoryVectorStore

Defined in: [rag/retrieval/vectorQueryTool.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/vectorQueryTool.ts#L198)

In-memory vector store implementation for testing and development

## Implements

- [`VectorStore`](../type-aliases/VectorStore.md)

## Constructors

### Constructor

> **new InMemoryVectorStore**(): `InMemoryVectorStore`

#### Returns

`InMemoryVectorStore`

## Methods

### upsert()

> **upsert**(`indexName`, `items`): `Promise`\<`void`\>

Defined in: [rag/retrieval/vectorQueryTool.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/vectorQueryTool.ts#L207)

Add vectors to an index

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

Defined in: [rag/retrieval/vectorQueryTool.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/vectorQueryTool.ts#L231)

Query vectors by similarity

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

Defined in: [rag/retrieval/vectorQueryTool.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/vectorQueryTool.ts#L288)

Delete vectors from an index

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
