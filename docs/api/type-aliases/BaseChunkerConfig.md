[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseChunkerConfig

# Type Alias: BaseChunkerConfig

> **BaseChunkerConfig** = `object`

Defined in: [types/rag.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L867)

Base configuration for all chunkers

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:869](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L869)

Maximum chunk size (interpretation varies by strategy)

---

### minSize?

> `optional` **minSize?**: `number`

Defined in: [types/rag.ts:871](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L871)

Minimum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L873)

Overlap between consecutive chunks

---

### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

Defined in: [types/rag.ts:875](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L875)

Whether to trim whitespace from chunks

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:877](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L877)

Custom metadata to add to all chunks

---

### preserveMetadata?

> `optional` **preserveMetadata?**: `boolean`

Defined in: [types/rag.ts:879](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L879)

Whether to preserve metadata from source document
