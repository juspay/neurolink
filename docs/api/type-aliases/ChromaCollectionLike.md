[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaCollectionLike

# Type Alias: ChromaCollectionLike

> **ChromaCollectionLike** = `object`

Defined in: [types/vectorStoreChroma.ts:55](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L55)

Minimal structural interface for a Chroma collection handle, matching the
subset of `Collection` (from `chromadb`) the adapter calls.

## Methods

### upsert()

> **upsert**(`params`): `Promise`\<`unknown`\>

Defined in: [types/vectorStoreChroma.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L56)

#### Parameters

##### params

[`ChromaUpsertParams`](ChromaUpsertParams.md)

#### Returns

`Promise`\<`unknown`\>

---

### query()

> **query**(`params`): `Promise`\<[`ChromaQueryResponse`](ChromaQueryResponse.md)\>

Defined in: [types/vectorStoreChroma.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L57)

#### Parameters

##### params

[`ChromaQueryParams`](ChromaQueryParams.md)

#### Returns

`Promise`\<[`ChromaQueryResponse`](ChromaQueryResponse.md)\>

---

### delete()

> **delete**(`params`): `Promise`\<`unknown`\>

Defined in: [types/vectorStoreChroma.ts:58](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L58)

#### Parameters

##### params

[`ChromaDeleteParams`](ChromaDeleteParams.md)

#### Returns

`Promise`\<`unknown`\>
