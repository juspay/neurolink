[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerMetadata

# Type Alias: RerankerMetadata

> **RerankerMetadata** = `object`

Defined in: [types/rag.ts:418](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L418)

Reranker metadata for discovery and documentation

## Properties

### description

> **description**: `string`

Defined in: [types/rag.ts:420](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L420)

Human-readable description

---

### defaultConfig

> **defaultConfig**: `Partial`\<[`RerankerConfig`](RerankerConfig.md)\>

Defined in: [types/rag.ts:422](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L422)

Default configuration

---

### supportedOptions

> **supportedOptions**: `string`[]

Defined in: [types/rag.ts:424](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L424)

Supported configuration options

---

### useCases

> **useCases**: `string`[]

Defined in: [types/rag.ts:426](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L426)

Recommended use cases

---

### aliases

> **aliases**: `string`[]

Defined in: [types/rag.ts:428](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L428)

Alternative names for this reranker

---

### requiresModel

> **requiresModel**: `boolean`

Defined in: [types/rag.ts:430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L430)

Whether this reranker requires an AI model

---

### requiresExternalAPI

> **requiresExternalAPI**: `boolean`

Defined in: [types/rag.ts:432](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L432)

Whether this reranker requires external API
