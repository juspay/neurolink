[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentToolCallChunk

# Type Alias: AgentToolCallChunk

> **AgentToolCallChunk** = [`NetworkStreamChunkBase`](NetworkStreamChunkBase.md) & `object`

Defined in: [types/agentNetwork.ts:793](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L793)

Agent tool call event

## Type Declaration

### type

> **type**: `"agent-tool-call"`

### agentId

> **agentId**: `string`

### toolName

> **toolName**: `string`

### args

> **args**: `unknown`

### toolCallId

> **toolCallId**: `string`
