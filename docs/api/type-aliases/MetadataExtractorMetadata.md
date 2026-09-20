[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorMetadata

# Type Alias: MetadataExtractorMetadata

> **MetadataExtractorMetadata** = `object`

Defined in: [types/rag.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L138)

Metadata extractor metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L140)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`MetadataExtractorConfig`](MetadataExtractorConfig.md)\>

Defined in: [types/rag.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L142)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L144)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L146)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L148)

Alternative names for this extractor

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L150)

Whether this extractor requires an AI model

---

### extractionTypes

> **extractionTypes**: `string`[]

Defined in: [types/rag.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L152)

Extraction types this extractor can produce
