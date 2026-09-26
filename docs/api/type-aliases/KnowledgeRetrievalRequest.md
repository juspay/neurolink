[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalRequest

# Type Alias: KnowledgeRetrievalRequest

> **KnowledgeRetrievalRequest** = `object`

The fully-resolved retrieval request the engine builds internally from the
user query, a bounded recent window, and host scope.

## Properties

### query

> **query**: `string`

---

### recentTurns

> **recentTurns**: [`KnowledgeConversationTurn`](KnowledgeConversationTurn.md)[]

---

### enabledIntegrations

> **enabledIntegrations**: `string`[]
