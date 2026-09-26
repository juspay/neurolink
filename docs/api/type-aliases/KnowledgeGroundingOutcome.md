[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingOutcome

# Type Alias: KnowledgeGroundingOutcome

> **KnowledgeGroundingOutcome** = `object`

The engine's per-turn output: the ephemeral context to inject (null on
no-match, when disabled, or on fail-open), the aggregate metadata for the
result, and the full retrieval for host diagnostics.

## Properties

### ephemeralContext

> **ephemeralContext**: [`EphemeralContext`](EphemeralContext.md) \| `null`

---

### metadata

> **metadata**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

---

### retrieval

> **retrieval**: [`KnowledgeRetrievalResult`](KnowledgeRetrievalResult.md) \| `null`
