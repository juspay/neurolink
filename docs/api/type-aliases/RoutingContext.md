[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RoutingContext

# Type Alias: RoutingContext

> **RoutingContext** = `object`

Context for routing decisions

## Properties

### previousDecisions?

> `optional` **previousDecisions?**: [`AgentRoutingDecision`](AgentRoutingDecision.md)[]

Previous routing decisions

---

### conversationHistory?

> `optional` **conversationHistory?**: [`CoreMessage`](CoreMessage.md)[]

Conversation history

---

### userPreferences?

> `optional` **userPreferences?**: `Record`\<`string`, `unknown`\>

User preferences

---

### sessionContext?

> `optional` **sessionContext?**: `Record`\<`string`, `unknown`\>

Session context
