[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerMetadata

# Type Alias: ChunkerMetadata

> **ChunkerMetadata** = `object`

Chunker metadata for factory registration

## Properties

### description

> **description**: `string`

Human-readable description

---

### supportedTypes?

> `optional` **supportedTypes?**: [`DocumentType`](DocumentType.md)[]

Supported document types

---

### requiresExternalDeps?

> `optional` **requiresExternalDeps?**: `boolean`

Whether the chunker requires external dependencies

---

### defaultConfig?

> `optional` **defaultConfig?**: `Record`\<`string`, `unknown`\>

Default configuration (can be any chunker-specific config)

---

### supportedOptions?

> `optional` **supportedOptions?**: `string`[]

Supported configuration options

---

### useCases?

> `optional` **useCases?**: `string`[]

Use cases where this chunker excels

---

### aliases?

> `optional` **aliases?**: `string`[]

Alternative names/aliases for this chunker
