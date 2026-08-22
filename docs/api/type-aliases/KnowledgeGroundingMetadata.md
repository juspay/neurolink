[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingMetadata

# Type Alias: KnowledgeGroundingMetadata

> **KnowledgeGroundingMetadata** = `object`

Defined in: [types/knowledge.ts:380](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L380)

Aggregate, content-free diagnostics attached to a generation/stream result
so the host can evaluate retrieval without the SDK exposing entry bodies.

## Properties

### retrievalMode

> **retrievalMode**: [`KnowledgeRetrievalMode`](KnowledgeRetrievalMode.md)

Defined in: [types/knowledge.ts:381](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L381)

---

### selectedIds

> **selectedIds**: `string`[]

Defined in: [types/knowledge.ts:382](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L382)

---

### expandedIds

> **expandedIds**: `string`[]

Defined in: [types/knowledge.ts:383](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L383)

---

### candidateCount

> **candidateCount**: `number`

Defined in: [types/knowledge.ts:384](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L384)

---

### contextTokens

> **contextTokens**: `number`

Defined in: [types/knowledge.ts:385](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L385)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/knowledge.ts:386](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L386)

---

### durationMs

> **durationMs**: `number`

Defined in: [types/knowledge.ts:387](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L387)

---

### confidence?

> `optional` **confidence?**: [`KnowledgeRetrievalConfidence`](KnowledgeRetrievalConfidence.md)

Defined in: [types/knowledge.ts:388](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L388)

---

### failureReason?

> `optional` **failureReason?**: `string`

Defined in: [types/knowledge.ts:390](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L390)

Present when grounding failed open; names the failure class.
