[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpsertableVectorStore

# Type Alias: UpsertableVectorStore

> **UpsertableVectorStore** = [`VectorStore`](VectorStore.md) & `object`

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
