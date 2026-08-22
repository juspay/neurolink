[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolPrimitive

# Type Alias: ToolPrimitive

> **ToolPrimitive** = [`NetworkPrimitive`](NetworkPrimitive.md) & `object`

Defined in: [types/agentNetwork.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L253)

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
