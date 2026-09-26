[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentStreamChunk

# Type Alias: AgentStreamChunk

> **AgentStreamChunk** = `object`

Agent stream chunk

## Properties

### type

> **type**: [`AgentStreamChunkType`](AgentStreamChunkType.md)

Chunk type

---

### agentId

> **agentId**: `string`

Agent ID

---

### timestamp

> **timestamp**: `number`

Timestamp

---

### traceId

> **traceId**: `string`

Trace ID

---

### content?

> `optional` **content?**: `string`

Content (for text chunks)

---

### isPartial?

> `optional` **isPartial?**: `boolean`

Whether content is partial (for text chunks)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Token usage (for complete chunks)

---

### duration?

> `optional` **duration?**: `number`

Duration in ms (for complete chunks)

---

### error?

> `optional` **error?**: `string`

Error message (for error chunks)

---

### toolName?

> `optional` **toolName?**: `string`

Tool name (for tool chunks)

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Tool call ID (for tool chunks)

---

### args?

> `optional` **args?**: `unknown`

Tool arguments (for tool call chunks)

---

### result?

> `optional` **result?**: `unknown`

Tool result (for tool result chunks)

---

### success?

> `optional` **success?**: `boolean`

Whether tool succeeded (for tool result chunks)
