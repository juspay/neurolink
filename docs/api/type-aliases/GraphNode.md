[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphNode

# Type Alias: GraphNode

> **GraphNode** = `object`

Defined in: [types/rag.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1345)

Graph node representing a document chunk

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1347)

Unique node identifier

---

### content

> **content**: `string`

Defined in: [types/rag.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1349)

Text content of the node

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1351)

Node metadata

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1353)

Embedding vector
