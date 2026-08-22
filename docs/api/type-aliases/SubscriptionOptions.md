[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionOptions

# Type Alias: SubscriptionOptions

> **SubscriptionOptions** = `object`

Defined in: [types/agentNetwork.ts:1136](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1136)

Subscription options

## Properties

### filterBySender?

> `optional` **filterBySender?**: `string`[]

Defined in: [types/agentNetwork.ts:1138](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1138)

Filter messages by sender

---

### filterByType?

> `optional` **filterByType?**: [`MessageType`](MessageType.md)[]

Defined in: [types/agentNetwork.ts:1141](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1141)

Filter messages by type

---

### filterByPriority?

> `optional` **filterByPriority?**: [`MessagePriority`](MessagePriority.md)[]

Defined in: [types/agentNetwork.ts:1144](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1144)

Filter messages by priority

---

### customFilter?

> `optional` **customFilter?**: (`message`) => `boolean`

Defined in: [types/agentNetwork.ts:1147](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1147)

Custom filter function

#### Parameters

##### message

[`AgentMessage`](AgentMessage.md)

#### Returns

`boolean`

---

### maxMessages?

> `optional` **maxMessages?**: `number`

Defined in: [types/agentNetwork.ts:1150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1150)

Maximum messages to receive (-1 for unlimited)
