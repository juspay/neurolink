[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingInput

# Type Alias: KnowledgeGroundingInput

> **KnowledgeGroundingInput** = `object`

Defined in: [types/knowledge.ts:474](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L474)

Per-turn input to `KnowledgeGroundingEngine.ground()`.

## Properties

### query

> **query**: `string`

Defined in: [types/knowledge.ts:475](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L475)

---

### recentTurns?

> `optional` **recentTurns?**: [`KnowledgeConversationTurn`](KnowledgeConversationTurn.md)[]

Defined in: [types/knowledge.ts:476](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L476)

---

### scope?

> `optional` **scope?**: [`KnowledgeRequestScope`](KnowledgeRequestScope.md)

Defined in: [types/knowledge.ts:477](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L477)
