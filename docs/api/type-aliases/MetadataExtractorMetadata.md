[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorMetadata

# Type Alias: MetadataExtractorMetadata

> **MetadataExtractorMetadata** = `object`

Defined in: [types/rag.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L137)

Metadata extractor metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L139)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`MetadataExtractorConfig`](MetadataExtractorConfig.md)\>

Defined in: [types/rag.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L141)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L143)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L145)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L147)

Alternative names for this extractor

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L149)

Whether this extractor requires an AI model

---

### extractionTypes

> **extractionTypes**: `string`[]

Defined in: [types/rag.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L151)

Extraction types this extractor can produce
