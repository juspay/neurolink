[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentMessage

# Type Alias: AgentMessage

> **AgentMessage** = `object`

Message structure for agent communication

## Properties

### id

> **id**: `string`

Unique message ID

---

### type

> **type**: [`MessageType`](MessageType.md)

Message type

---

### topic

> **topic**: `string`

Topic/channel for the message

---

### senderId

> **senderId**: `string`

Sender agent ID

---

### recipientId?

> `optional` **recipientId?**: `string`

Recipient agent ID (for direct messages)

---

### payload

> **payload**: `unknown`

Message payload

---

### correlationId?

> `optional` **correlationId?**: `string`

Correlation ID (for request-response)

---

### replyTo?

> `optional` **replyTo?**: `string`

Reply-to topic (for request-response)

---

### priority

> **priority**: [`MessagePriority`](MessagePriority.md)

Message priority

---

### timestamp

> **timestamp**: `number`

Timestamp

---

### ttl?

> `optional` **ttl?**: `number`

Time-to-live in ms (after which message expires)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Message metadata
