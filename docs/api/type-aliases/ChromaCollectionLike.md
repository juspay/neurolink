[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaCollectionLike

# Type Alias: ChromaCollectionLike

> **ChromaCollectionLike** = `object`

Minimal structural interface for a Chroma collection handle, matching the
subset of `Collection` (from `chromadb`) the adapter calls.

## Methods

### upsert()

> **upsert**(`params`): `Promise`\<`unknown`\>

#### Parameters

##### params

[`ChromaUpsertParams`](ChromaUpsertParams.md)

#### Returns

`Promise`\<`unknown`\>

---

### query()

> **query**(`params`): `Promise`\<[`ChromaQueryResponse`](ChromaQueryResponse.md)\>

#### Parameters

##### params

[`ChromaQueryParams`](ChromaQueryParams.md)

#### Returns

`Promise`\<[`ChromaQueryResponse`](ChromaQueryResponse.md)\>

---

### delete()

> **delete**(`params`): `Promise`\<`unknown`\>

#### Parameters

##### params

[`ChromaDeleteParams`](ChromaDeleteParams.md)

#### Returns

`Promise`\<`unknown`\>
