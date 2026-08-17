[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorProviderOptions

# Type Alias: VectorProviderOptions

> **VectorProviderOptions** = `object`

Defined in: [types/rag.ts:1232](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1232)

Provider-specific query options

## Properties

### pinecone?

> `optional` **pinecone?**: `object`

Defined in: [types/rag.ts:1234](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1234)

Pinecone options

#### namespace?

> `optional` **namespace?**: `string`

#### sparseVector?

> `optional` **sparseVector?**: `number`[]

---

### pgVector?

> `optional` **pgVector?**: `object`

Defined in: [types/rag.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1239)

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

Defined in: [types/rag.ts:1245](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1245)

Chroma options

#### where?

> `optional` **where?**: `Record`\<`string`, `unknown`\>

#### whereDocument?

> `optional` **whereDocument?**: `Record`\<`string`, `unknown`\>
