[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentToolResultChunk

# Type Alias: AgentToolResultChunk

> **AgentToolResultChunk** = [`NetworkStreamChunkBase`](NetworkStreamChunkBase.md) & `object`

Defined in: [types/agentNetwork.ts:804](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L804)

Agent tool result event

## Type Declaration

### type

> **type**: `"agent-tool-result"`

### agentId

> **agentId**: `string`

### toolName

> **toolName**: `string`

### toolCallId

> **toolCallId**: `string`

### result

> **result**: `unknown`

### success

> **success**: `boolean`
