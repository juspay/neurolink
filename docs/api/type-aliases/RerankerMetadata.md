[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerMetadata

# Type Alias: RerankerMetadata

> **RerankerMetadata** = `object`

Defined in: [types/rag.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L421)

Reranker metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L423)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`RerankerConfig`](RerankerConfig.md)\>

Defined in: [types/rag.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L425)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L427)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L429)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L431)

Alternative names for this reranker

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L433)

Whether this reranker requires an AI model

---

### requiresExternalAPI

> **requiresExternalAPI**: `boolean`

Defined in: [types/rag.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L435)

Whether this reranker requires external API
