[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentStreamChunk

# Type Alias: AgentStreamChunk

> **AgentStreamChunk** = `object`

Defined in: [types/agentNetwork.ts:656](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L656)

Agent stream chunk

## Properties

### type

> **type**: [`AgentStreamChunkType`](AgentStreamChunkType.md)

Defined in: [types/agentNetwork.ts:658](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L658)

Chunk type

---

### agentId

> **agentId**: `string`

Defined in: [types/agentNetwork.ts:661](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L661)

Agent ID

---

### timestamp

> **timestamp**: `number`

Defined in: [types/agentNetwork.ts:664](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L664)

Timestamp

---

### traceId

> **traceId**: `string`

Defined in: [types/agentNetwork.ts:667](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L667)

Trace ID

---

### content?

> `optional` **content?**: `string`

Defined in: [types/agentNetwork.ts:670](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L670)

Content (for text chunks)

---

### isPartial?

> `optional` **isPartial?**: `boolean`

Defined in: [types/agentNetwork.ts:673](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L673)

Whether content is partial (for text chunks)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/agentNetwork.ts:676](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L676)

Token usage (for complete chunks)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/agentNetwork.ts:679](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L679)

Duration in ms (for complete chunks)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:682](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L682)

Error message (for error chunks)

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/agentNetwork.ts:685](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L685)

Tool name (for tool chunks)

---

### toolCallId?

> `optional` **toolCallId?**: `string`

Defined in: [types/agentNetwork.ts:688](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L688)

Tool call ID (for tool chunks)

---

### args?

> `optional` **args?**: `unknown`

Defined in: [types/agentNetwork.ts:691](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L691)

Tool arguments (for tool call chunks)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/agentNetwork.ts:694](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L694)

Tool result (for tool result chunks)

---

### success?

> `optional` **success?**: `boolean`

Defined in: [types/agentNetwork.ts:697](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L697)

Whether tool succeeded (for tool result chunks)
