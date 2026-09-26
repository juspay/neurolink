[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorProviderOptions

# Type Alias: VectorProviderOptions

> **VectorProviderOptions** = `object`

Provider-specific query options

## Properties

### pinecone?

> `optional` **pinecone?**: `object`

Pinecone options

#### namespace?

> `optional` **namespace?**: `string`

#### sparseVector?

> `optional` **sparseVector?**: `number`[]

---

### pgVector?

> `optional` **pgVector?**: `object`

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

Chroma options

#### where?

> `optional` **where?**: `Record`\<`string`, `unknown`\>

#### whereDocument?

> `optional` **whereDocument?**: `Record`\<`string`, `unknown`\>
