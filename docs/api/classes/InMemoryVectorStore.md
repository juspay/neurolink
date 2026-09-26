[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryVectorStore

# Class: InMemoryVectorStore

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

Delete vectors from an index

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
