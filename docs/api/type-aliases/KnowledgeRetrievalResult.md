[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalResult

# Type Alias: KnowledgeRetrievalResult

> **KnowledgeRetrievalResult** = `object`

Defined in: [types/knowledge.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L344)

The result of one retrieval: the selected entries, the assembled ephemeral
context string, a confidence class, and assembly diagnostics.

## Properties

### entries

> **entries**: [`NormalizedKnowledgeEntry`](NormalizedKnowledgeEntry.md)[]

Defined in: [types/knowledge.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L345)

---

### assembledContext

> **assembledContext**: `string`

Defined in: [types/knowledge.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L346)

---

### confidence

> **confidence**: [`KnowledgeRetrievalConfidence`](KnowledgeRetrievalConfidence.md)

Defined in: [types/knowledge.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L347)

---

### citations

> **citations**: [`KnowledgeCitation`](KnowledgeCitation.md)[]

Defined in: [types/knowledge.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L348)

---

### selectedEntryIds

> **selectedEntryIds**: `string`[]

Defined in: [types/knowledge.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L350)

Ids of the primary (non-expanded) entries, in final order.

---

### expandedEntryIds

> **expandedEntryIds**: `string`[]

Defined in: [types/knowledge.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L352)

Ids added by bounded relationship expansion.

---

### candidateCount

> **candidateCount**: `number`

Defined in: [types/knowledge.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L354)

Candidates scored before truncation to the result limit.

---

### contextTokens

> **contextTokens**: `number`

Defined in: [types/knowledge.ts:356](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L356)

Estimated token size of `assembledContext`.

---

### truncated

> **truncated**: `boolean`

Defined in: [types/knowledge.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L358)

True when any entry body was truncated or entries were dropped for budget.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/knowledge.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L359)
