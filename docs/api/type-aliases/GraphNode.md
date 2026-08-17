[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphNode

# Type Alias: GraphNode

> **GraphNode** = `object`

Defined in: [types/rag.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1364)

Graph node representing a document chunk

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1366)

Unique node identifier

---

### content

> **content**: `string`

Defined in: [types/rag.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1368)

Text content of the node

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1370)

Node metadata

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1372)

Embedding vector
