[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorStore

# Type Alias: VectorStore

> **VectorStore** = `object`

Defined in: [types/rag.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L488)

Abstract vector store type
Vector stores should implement this type to work with the query tool

## Methods

### query()

> **query**(`params`): `Promise`\<[`VectorQueryResult`](VectorQueryResult.md)[]\>

Defined in: [types/rag.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L489)

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
