[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseChunkerConfig

# Type Alias: BaseChunkerConfig

> **BaseChunkerConfig** = `object`

Defined in: [types/rag.ts:848](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L848)

Base configuration for all chunkers

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:850](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L850)

Maximum chunk size (interpretation varies by strategy)

---

### minSize?

> `optional` **minSize?**: `number`

Defined in: [types/rag.ts:852](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L852)

Minimum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:854](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L854)

Overlap between consecutive chunks

---

### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

Defined in: [types/rag.ts:856](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L856)

Whether to trim whitespace from chunks

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:858](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L858)

Custom metadata to add to all chunks

---

### preserveMetadata?

> `optional` **preserveMetadata?**: `boolean`

Defined in: [types/rag.ts:860](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L860)

Whether to preserve metadata from source document
