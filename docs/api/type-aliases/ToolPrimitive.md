[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolPrimitive

# Type Alias: ToolPrimitive

> **ToolPrimitive** = [`NetworkPrimitive`](NetworkPrimitive.md) & `object`

Defined in: [types/agentNetwork.ts:253](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L253)

Tool as a network primitive

## Type Declaration

### type

> **type**: `"tool"`

### tool

> **tool**: [`NetworkToolInfo`](NetworkToolInfo.md)

Tool information

### execute

> **execute**: (`args`, `context?`) => `Promise`\<`unknown`\>

Execute the tool

#### Parameters

##### args

`unknown`

##### context?

[`AgentExecutionContext`](AgentExecutionContext.md)

#### Returns

`Promise`\<`unknown`\>
