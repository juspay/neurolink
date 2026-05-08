[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorStore

# Type Alias: VectorStore

> **VectorStore** = `object`

Defined in: [types/rag.ts:486](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L486)

Abstract vector store type
Vector stores should implement this type to work with the query tool

## Methods

### query()

> **query**(`params`): `Promise`\<[`VectorQueryResult`](VectorQueryResult.md)[]\>

Defined in: [types/rag.ts:487](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L487)

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
