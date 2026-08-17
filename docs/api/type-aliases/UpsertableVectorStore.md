[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpsertableVectorStore

# Type Alias: UpsertableVectorStore

> **UpsertableVectorStore** = [`VectorStore`](VectorStore.md) & `object`

Defined in: [types/rag.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L506)

Structural extension of [VectorStore](VectorStore.md) for stores that can also write
vectors via `upsert()` (e.g. [InMemoryVectorStore](../classes/InMemoryVectorStore.md)). Custom stores
that expose an `upsert` method satisfy this type without a cast.

## Type Declaration

### upsert()

> **upsert**(`indexName`, `items`): `Promise`\<`void`\>

#### Parameters

##### indexName

`string`

##### items

`object`[]

#### Returns

`Promise`\<`void`\>
