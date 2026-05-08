[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorMetadata

# Type Alias: MetadataExtractorMetadata

> **MetadataExtractorMetadata** = `object`

Defined in: [types/rag.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L134)

Metadata extractor metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L136)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`MetadataExtractorConfig`](MetadataExtractorConfig.md)\>

Defined in: [types/rag.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L138)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L140)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L142)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L144)

Alternative names for this extractor

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L146)

Whether this extractor requires an AI model

---

### extractionTypes

> **extractionTypes**: `string`[]

Defined in: [types/rag.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L148)

Extraction types this extractor can produce
