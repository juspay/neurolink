[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / JSONChunkerConfig

# Type Alias: JSONChunkerConfig

> **JSONChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:905](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L905)

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
