[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerMetadata

# Type Alias: ChunkerMetadata

> **ChunkerMetadata** = `object`

Defined in: [types/rag.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1051)

Chunker metadata for factory registration

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1053)

Human-readable description

---

### supportedTypes?

> `optional` **supportedTypes?**: [`DocumentType`](DocumentType.md)[]

Defined in: [types/rag.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1055)

Supported document types

---

### requiresExternalDeps?

> `optional` **requiresExternalDeps?**: `boolean`

Defined in: [types/rag.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1057)

Whether the chunker requires external dependencies

---

### defaultConfig?

> `optional` **defaultConfig?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1059)

Default configuration (can be any chunker-specific config)

---

### supportedOptions?

> `optional` **supportedOptions?**: `string`[]

Defined in: [types/rag.ts:1061](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1061)

Supported configuration options

---

### useCases?

> `optional` **useCases?**: `string`[]

Defined in: [types/rag.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1063)

Use cases where this chunker excels

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/rag.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1065)

Alternative names/aliases for this chunker
