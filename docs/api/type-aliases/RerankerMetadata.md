[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerMetadata

# Type Alias: RerankerMetadata

> **RerankerMetadata** = `object`

Defined in: [types/rag.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L440)

Reranker metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L442)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`RerankerConfig`](RerankerConfig.md)\>

Defined in: [types/rag.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L444)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L446)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L448)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L450)

Alternative names for this reranker

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:452](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L452)

Whether this reranker requires an AI model

---

### requiresExternalAPI

> **requiresExternalAPI**: `boolean`

Defined in: [types/rag.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L454)

Whether this reranker requires external API
