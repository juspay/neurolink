[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaClientLike

# Type Alias: ChromaClientLike

> **ChromaClientLike** = `object`

Defined in: [types/vectorStoreChroma.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L65)

Minimal structural interface for a Chroma client, matching the subset of
`ChromaClient` (from `chromadb`) the adapter calls.

## Methods

### getOrCreateCollection()

> **getOrCreateCollection**(`params`): `Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>

Defined in: [types/vectorStoreChroma.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L66)

#### Parameters

##### params

###### name

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>
