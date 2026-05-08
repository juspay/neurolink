[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerMetadata

# Type Alias: ChunkerMetadata

> **ChunkerMetadata** = `object`

Defined in: [types/rag.ts:969](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L969)

Chunker metadata for factory registration

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:971](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L971)

Human-readable description

---

### supportedTypes?

> `optional` **supportedTypes?**: [`DocumentType`](DocumentType.md)[]

Defined in: [types/rag.ts:973](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L973)

Supported document types

---

### requiresExternalDeps?

> `optional` **requiresExternalDeps?**: `boolean`

Defined in: [types/rag.ts:975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L975)

Whether the chunker requires external dependencies

---

### defaultConfig?

> `optional` **defaultConfig?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:977](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L977)

Default configuration (can be any chunker-specific config)

---

### supportedOptions?

> `optional` **supportedOptions?**: `string`[]

Defined in: [types/rag.ts:979](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L979)

Supported configuration options

---

### useCases?

> `optional` **useCases?**: `string`[]

Defined in: [types/rag.ts:981](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L981)

Use cases where this chunker excels

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/rag.ts:983](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L983)

Alternative names/aliases for this chunker
