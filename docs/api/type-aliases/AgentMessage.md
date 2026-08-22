[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentMessage

# Type Alias: AgentMessage

> **AgentMessage** = `object`

Defined in: [types/agentNetwork.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1090)

Message structure for agent communication

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1092)

Unique message ID

---

### type

> **type**: [`MessageType`](MessageType.md)

Defined in: [types/agentNetwork.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1095)

Message type

---

### topic

> **topic**: `string`

Defined in: [types/agentNetwork.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1098)

Topic/channel for the message

---

### senderId

> **senderId**: `string`

Defined in: [types/agentNetwork.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1101)

Sender agent ID

---

### recipientId?

> `optional` **recipientId?**: `string`

Defined in: [types/agentNetwork.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1104)

Recipient agent ID (for direct messages)

---

### payload

> **payload**: `unknown`

Defined in: [types/agentNetwork.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1107)

Message payload

---

### correlationId?

> `optional` **correlationId?**: `string`

Defined in: [types/agentNetwork.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1110)

Correlation ID (for request-response)

---

### replyTo?

> `optional` **replyTo?**: `string`

Defined in: [types/agentNetwork.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1113)

Reply-to topic (for request-response)

---

### priority

> **priority**: [`MessagePriority`](MessagePriority.md)

Defined in: [types/agentNetwork.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1116)

Message priority

---

### timestamp

> **timestamp**: `number`

Defined in: [types/agentNetwork.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1119)

Timestamp

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [types/agentNetwork.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1122)

Time-to-live in ms (after which message expires)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1125)

Message metadata
