[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphNode

# Type Alias: GraphNode

> **GraphNode** = `object`

Defined in: [types/rag.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1383)

Graph node representing a document chunk

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1385](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1385)

Unique node identifier

---

### content

> **content**: `string`

Defined in: [types/rag.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1387)

Text content of the node

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1389)

Node metadata

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1391)

Embedding vector
