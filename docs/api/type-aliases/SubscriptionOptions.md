[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionOptions

# Type Alias: SubscriptionOptions

> **SubscriptionOptions** = `object`

Subscription options

## Properties

### filterBySender?

> `optional` **filterBySender?**: `string`[]

Filter messages by sender

---

### filterByType?

> `optional` **filterByType?**: [`MessageType`](MessageType.md)[]

Filter messages by type

---

### filterByPriority?

> `optional` **filterByPriority?**: [`MessagePriority`](MessagePriority.md)[]

Filter messages by priority

---

### customFilter?

> `optional` **customFilter?**: (`message`) => `boolean`

Custom filter function

#### Parameters

##### message

[`AgentMessage`](AgentMessage.md)

#### Returns

`boolean`

---

### maxMessages?

> `optional` **maxMessages?**: `number`

Maximum messages to receive (-1 for unlimited)
