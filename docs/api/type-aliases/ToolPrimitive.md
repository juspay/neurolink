[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolPrimitive

# Type Alias: ToolPrimitive

> **ToolPrimitive** = [`NetworkPrimitive`](NetworkPrimitive.md) & `object`

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
