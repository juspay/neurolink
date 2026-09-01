[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JSONChunkerConfig

# Type Alias: JSONChunkerConfig

> **JSONChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L968)

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
