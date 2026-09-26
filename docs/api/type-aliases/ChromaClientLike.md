[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaClientLike

# Type Alias: ChromaClientLike

> **ChromaClientLike** = `object`

Minimal structural interface for a Chroma client, matching the subset of
`ChromaClient` (from `chromadb`) the adapter calls.

## Methods

### getOrCreateCollection()

> **getOrCreateCollection**(`params`): `Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>

#### Parameters

##### params

###### name

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ChromaCollectionLike`](ChromaCollectionLike.md)\>
