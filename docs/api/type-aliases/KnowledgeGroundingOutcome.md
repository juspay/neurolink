[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingOutcome

# Type Alias: KnowledgeGroundingOutcome

> **KnowledgeGroundingOutcome** = `object`

Defined in: [types/knowledge.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L492)

The engine's per-turn output: the ephemeral context to inject (null on
no-match, when disabled, or on fail-open), the aggregate metadata for the
result, and the full retrieval for host diagnostics.

## Properties

### ephemeralContext

> **ephemeralContext**: [`EphemeralContext`](EphemeralContext.md) \| `null`

Defined in: [types/knowledge.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L493)

---

### metadata

> **metadata**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/knowledge.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L494)

---

### retrieval

> **retrieval**: [`KnowledgeRetrievalResult`](KnowledgeRetrievalResult.md) \| `null`

Defined in: [types/knowledge.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L495)
