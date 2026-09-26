[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalResult

# Type Alias: KnowledgeRetrievalResult

> **KnowledgeRetrievalResult** = `object`

The result of one retrieval: the selected entries, the assembled ephemeral
context string, a confidence class, and assembly diagnostics.

## Properties

### entries

> **entries**: [`NormalizedKnowledgeEntry`](NormalizedKnowledgeEntry.md)[]

---

### assembledContext

> **assembledContext**: `string`

---

### confidence

> **confidence**: [`KnowledgeRetrievalConfidence`](KnowledgeRetrievalConfidence.md)

---

### citations

> **citations**: [`KnowledgeCitation`](KnowledgeCitation.md)[]

---

### selectedEntryIds

> **selectedEntryIds**: `string`[]

Ids of the primary (non-expanded) entries, in final order.

---

### expandedEntryIds

> **expandedEntryIds**: `string`[]

Ids added by bounded relationship expansion.

---

### candidateCount

> **candidateCount**: `number`

Candidates scored before truncation to the result limit.

---

### contextTokens

> **contextTokens**: `number`

Estimated token size of `assembledContext`.

---

### truncated

> **truncated**: `boolean`

True when any entry body was truncated or entries were dropped for budget.

---

### durationMs

> **durationMs**: `number`
