[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerMetadata

# Type Alias: ChunkerMetadata

> **ChunkerMetadata** = `object`

Defined in: [types/rag.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1032)

Chunker metadata for factory registration

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1034)

Human-readable description

---

### supportedTypes?

> `optional` **supportedTypes?**: [`DocumentType`](DocumentType.md)[]

Defined in: [types/rag.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1036)

Supported document types

---

### requiresExternalDeps?

> `optional` **requiresExternalDeps?**: `boolean`

Defined in: [types/rag.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1038)

Whether the chunker requires external dependencies

---

### defaultConfig?

> `optional` **defaultConfig?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1040)

Default configuration (can be any chunker-specific config)

---

### supportedOptions?

> `optional` **supportedOptions?**: `string`[]

Defined in: [types/rag.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1042)

Supported configuration options

---

### useCases?

> `optional` **useCases?**: `string`[]

Defined in: [types/rag.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1044)

Use cases where this chunker excels

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/rag.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1046)

Alternative names/aliases for this chunker
