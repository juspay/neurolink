[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseChunkerConfig

# Type Alias: BaseChunkerConfig

> **BaseChunkerConfig** = `object`

Base configuration for all chunkers

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Maximum chunk size (interpretation varies by strategy)

---

### minSize?

> `optional` **minSize?**: `number`

Minimum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Overlap between consecutive chunks

---

### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

Whether to trim whitespace from chunks

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Custom metadata to add to all chunks

---

### preserveMetadata?

> `optional` **preserveMetadata?**: `boolean`

Whether to preserve metadata from source document
