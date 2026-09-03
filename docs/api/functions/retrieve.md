[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / retrieve

# Function: retrieve()

> **retrieve**(`snapshot`, `request`, `config`, `blockedDomains?`): [`KnowledgeSelection`](../type-aliases/KnowledgeSelection.md)

Defined in: [knowledge/retrieval.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/retrieval.ts#L160)

Run retrieval against a ready snapshot. Returns the primary selection, a
bounded relationship expansion, the scored candidate list (diagnostics), and
a confidence class. Context assembly is a separate, later step.

## Parameters

### snapshot

[`KnowledgeIndexSnapshot`](../type-aliases/KnowledgeIndexSnapshot.md)

### request

[`KnowledgeRetrievalRequest`](../type-aliases/KnowledgeRetrievalRequest.md)

### config

[`KnowledgeResolvedRetrieval`](../type-aliases/KnowledgeResolvedRetrieval.md)

### blockedDomains?

`string`[]

## Returns

[`KnowledgeSelection`](../type-aliases/KnowledgeSelection.md)
