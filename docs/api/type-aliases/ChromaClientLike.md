[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaClientLike

# Type Alias: ChromaClientLike

> **ChromaClientLike** = `object`

Defined in: [types/vectorStoreChroma.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/vectorStoreChroma.ts#L65)

Minimal structural interface for a Chroma client, matching the subset of
`ChromaClient` (from `chromadb`) the adapter calls.

## Methods

### getOrCreateCollection()

> **getOrCreateCollection**(`params`): `Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>

Defined in: [types/vectorStoreChroma.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/vectorStoreChroma.ts#L66)

#### Parameters

##### params

###### name

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>
