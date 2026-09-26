[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorStore

# Type Alias: VectorStore

> **VectorStore** = `object`

Abstract vector store type
Vector stores should implement this type to work with the query tool

## Methods

### query()

> **query**(`params`): `Promise`\<[`VectorQueryResult`](VectorQueryResult.md)[]\>

#### Parameters

##### params

###### indexName

`string`

###### queryVector

`number`[]

###### topK?

`number`

###### filter?

[`MetadataFilter`](MetadataFilter.md)

###### includeVectors?

`boolean`

#### Returns

`Promise`\<[`VectorQueryResult`](VectorQueryResult.md)[]\>
