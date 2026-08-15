[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / retrieve

# Function: retrieve()

> **retrieve**(`snapshot`, `request`, `config`, `blockedDomains?`): `KnowledgeSelection`

Defined in: [knowledge/retrieval.ts:160](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/knowledge/retrieval.ts#L160)

Run retrieval against a ready snapshot. Returns the primary selection, a
bounded relationship expansion, the scored candidate list (diagnostics), and
a confidence class. Context assembly is a separate, later step.

## Parameters

### snapshot

[`KnowledgeIndexSnapshot`](../type-aliases/KnowledgeIndexSnapshot.md)

### request

[`KnowledgeRetrievalRequest`](../type-aliases/KnowledgeRetrievalRequest.md)

### config

`KnowledgeResolvedRetrieval`

### blockedDomains?

`string`[]

## Returns

`KnowledgeSelection`
