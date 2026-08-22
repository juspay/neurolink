[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaClientLike

# Type Alias: ChromaClientLike

> **ChromaClientLike** = `object`

Defined in: [types/vectorStoreChroma.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStoreChroma.ts#L65)

Minimal structural interface for a Chroma client, matching the subset of
`ChromaClient` (from `chromadb`) the adapter calls.

## Methods

### getOrCreateCollection()

> **getOrCreateCollection**(`params`): `Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>

Defined in: [types/vectorStoreChroma.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStoreChroma.ts#L66)

#### Parameters

##### params

###### name

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>
