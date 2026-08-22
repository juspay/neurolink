[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalRequest

# Type Alias: KnowledgeRetrievalRequest

> **KnowledgeRetrievalRequest** = `object`

Defined in: [types/knowledge.ts:265](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L265)

The fully-resolved retrieval request the engine builds internally from the
user query, a bounded recent window, and host scope.

## Properties

### query

> **query**: `string`

Defined in: [types/knowledge.ts:266](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L266)

---

### recentTurns

> **recentTurns**: [`KnowledgeConversationTurn`](KnowledgeConversationTurn.md)[]

Defined in: [types/knowledge.ts:267](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L267)

---

### enabledIntegrations

> **enabledIntegrations**: `string`[]

Defined in: [types/knowledge.ts:268](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L268)
