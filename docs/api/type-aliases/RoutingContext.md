[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RoutingContext

# Type Alias: RoutingContext

> **RoutingContext** = `object`

Defined in: [types/agentNetwork.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L902)

Context for routing decisions

## Properties

### previousDecisions?

> `optional` **previousDecisions?**: [`AgentRoutingDecision`](AgentRoutingDecision.md)[]

Defined in: [types/agentNetwork.ts:904](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L904)

Previous routing decisions

---

### conversationHistory?

> `optional` **conversationHistory?**: [`CoreMessage`](CoreMessage.md)[]

Defined in: [types/agentNetwork.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L907)

Conversation history

---

### userPreferences?

> `optional` **userPreferences?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L910)

User preferences

---

### sessionContext?

> `optional` **sessionContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:913](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L913)

Session context
