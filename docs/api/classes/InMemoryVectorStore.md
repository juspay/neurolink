[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryVectorStore

# Class: InMemoryVectorStore

Defined in: [rag/retrieval/vectorQueryTool.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/vectorQueryTool.ts#L205)

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

Defined in: [rag/retrieval/vectorQueryTool.ts:214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/vectorQueryTool.ts#L214)

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

Defined in: [rag/retrieval/vectorQueryTool.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/vectorQueryTool.ts#L238)

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

Defined in: [rag/retrieval/vectorQueryTool.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/vectorQueryTool.ts#L295)

Delete vectors from an index

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
