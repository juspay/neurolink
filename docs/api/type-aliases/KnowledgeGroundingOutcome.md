[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingOutcome

# Type Alias: KnowledgeGroundingOutcome

> **KnowledgeGroundingOutcome** = `object`

Defined in: [types/knowledge.ts:485](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L485)

The engine's per-turn output: the ephemeral context to inject (null on
no-match, when disabled, or on fail-open), the aggregate metadata for the
result, and the full retrieval for host diagnostics.

## Properties

### ephemeralContext

> **ephemeralContext**: [`EphemeralContext`](EphemeralContext.md) \| `null`

Defined in: [types/knowledge.ts:486](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L486)

---

### metadata

> **metadata**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/knowledge.ts:487](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L487)

---

### retrieval

> **retrieval**: [`KnowledgeRetrievalResult`](KnowledgeRetrievalResult.md) \| `null`

Defined in: [types/knowledge.ts:488](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L488)
