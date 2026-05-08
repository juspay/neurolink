[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphNode

# Type Alias: GraphNode

> **GraphNode** = `object`

Defined in: [types/rag.ts:1301](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1301)

Graph node representing a document chunk

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1303)

Unique node identifier

---

### content

> **content**: `string`

Defined in: [types/rag.ts:1305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1305)

Text content of the node

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1307)

Node metadata

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:1309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1309)

Embedding vector
