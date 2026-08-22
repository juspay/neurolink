[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / JSONChunkerConfig

# Type Alias: JSONChunkerConfig

> **JSONChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:949](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L949)

JSON chunker configuration
JSON structure-aware splitting

## Type Declaration

### maxDepth?

> `optional` **maxDepth?**: `number`

Maximum depth to traverse

### splitKeys?

> `optional` **splitKeys?**: `string`[]

Keys to split on (arrays/objects at these keys become chunks)

### preserveKeys?

> `optional` **preserveKeys?**: `string`[]

Keys to preserve as single units

### includeJsonPath?

> `optional` **includeJsonPath?**: `boolean`

Include JSON path in metadata
