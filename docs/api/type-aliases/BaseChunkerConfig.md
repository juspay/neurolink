[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseChunkerConfig

# Type Alias: BaseChunkerConfig

> **BaseChunkerConfig** = `object`

Defined in: [types/rag.ts:804](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L804)

Base configuration for all chunkers

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:806](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L806)

Maximum chunk size (interpretation varies by strategy)

---

### minSize?

> `optional` **minSize?**: `number`

Defined in: [types/rag.ts:808](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L808)

Minimum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:810](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L810)

Overlap between consecutive chunks

---

### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

Defined in: [types/rag.ts:812](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L812)

Whether to trim whitespace from chunks

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:814](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L814)

Custom metadata to add to all chunks

---

### preserveMetadata?

> `optional` **preserveMetadata?**: `boolean`

Defined in: [types/rag.ts:816](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L816)

Whether to preserve metadata from source document
