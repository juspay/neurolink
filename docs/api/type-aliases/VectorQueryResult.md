[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResult

# Type Alias: VectorQueryResult

> **VectorQueryResult** = `object`

Vector store query result

## Properties

### id

> **id**: `string`

Unique identifier

---

### text?

> `optional` **text?**: `string`

Text content

---

### score?

> `optional` **score?**: `number`

Similarity/relevance score

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Associated metadata

---

### vector?

> `optional` **vector?**: `number`[]

Embedding vector (if requested)
