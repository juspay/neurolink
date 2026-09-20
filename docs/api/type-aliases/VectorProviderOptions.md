[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorProviderOptions

# Type Alias: VectorProviderOptions

> **VectorProviderOptions** = `object`

Defined in: [types/rag.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1251)

Provider-specific query options

## Properties

### pinecone?

> `optional` **pinecone?**: `object`

Defined in: [types/rag.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1253)

Pinecone options

#### namespace?

> `optional` **namespace?**: `string`

#### sparseVector?

> `optional` **sparseVector?**: `number`[]

---

### pgVector?

> `optional` **pgVector?**: `object`

Defined in: [types/rag.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1258)

pgVector options

#### minScore?

> `optional` **minScore?**: `number`

#### ef?

> `optional` **ef?**: `number`

#### probes?

> `optional` **probes?**: `number`

---

### chroma?

> `optional` **chroma?**: `object`

Defined in: [types/rag.ts:1264](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1264)

Chroma options

#### where?

> `optional` **where?**: `Record`\<`string`, `unknown`\>

#### whereDocument?

> `optional` **whereDocument?**: `Record`\<`string`, `unknown`\>
