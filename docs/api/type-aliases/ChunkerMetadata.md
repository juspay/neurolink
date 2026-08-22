[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerMetadata

# Type Alias: ChunkerMetadata

> **ChunkerMetadata** = `object`

Defined in: [types/rag.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1013)

Chunker metadata for factory registration

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1015)

Human-readable description

---

### supportedTypes?

> `optional` **supportedTypes?**: [`DocumentType`](DocumentType.md)[]

Defined in: [types/rag.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1017)

Supported document types

---

### requiresExternalDeps?

> `optional` **requiresExternalDeps?**: `boolean`

Defined in: [types/rag.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1019)

Whether the chunker requires external dependencies

---

### defaultConfig?

> `optional` **defaultConfig?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1021)

Default configuration (can be any chunker-specific config)

---

### supportedOptions?

> `optional` **supportedOptions?**: `string`[]

Defined in: [types/rag.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1023)

Supported configuration options

---

### useCases?

> `optional` **useCases?**: `string`[]

Defined in: [types/rag.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1025)

Use cases where this chunker excels

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/rag.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1027)

Alternative names/aliases for this chunker
