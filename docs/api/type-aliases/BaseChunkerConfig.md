[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseChunkerConfig

# Type Alias: BaseChunkerConfig

> **BaseChunkerConfig** = `object`

Defined in: [types/rag.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L886)

Base configuration for all chunkers

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L888)

Maximum chunk size (interpretation varies by strategy)

---

### minSize?

> `optional` **minSize?**: `number`

Defined in: [types/rag.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L890)

Minimum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:892](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L892)

Overlap between consecutive chunks

---

### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

Defined in: [types/rag.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L894)

Whether to trim whitespace from chunks

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L896)

Custom metadata to add to all chunks

---

### preserveMetadata?

> `optional` **preserveMetadata?**: `boolean`

Defined in: [types/rag.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L898)

Whether to preserve metadata from source document
