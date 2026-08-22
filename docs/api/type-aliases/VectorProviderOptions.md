[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorProviderOptions

# Type Alias: VectorProviderOptions

> **VectorProviderOptions** = `object`

Defined in: [types/rag.ts:1213](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1213)

Provider-specific query options

## Properties

### pinecone?

> `optional` **pinecone?**: `object`

Defined in: [types/rag.ts:1215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1215)

Pinecone options

#### namespace?

> `optional` **namespace?**: `string`

#### sparseVector?

> `optional` **sparseVector?**: `number`[]

---

### pgVector?

> `optional` **pgVector?**: `object`

Defined in: [types/rag.ts:1220](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1220)

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

Defined in: [types/rag.ts:1226](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1226)

Chroma options

#### where?

> `optional` **where?**: `Record`\<`string`, `unknown`\>

#### whereDocument?

> `optional` **whereDocument?**: `Record`\<`string`, `unknown`\>
