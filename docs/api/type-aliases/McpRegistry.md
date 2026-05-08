[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistry

# Type Alias: McpRegistry

> **McpRegistry** = `object`

Defined in: [types/mcp.ts:766](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L766)

MCP Registry type with optional methods for maximum flexibility
Moved from src/lib/mcp/registry.ts

## Methods

### registerServer()?

> `optional` **registerServer**(`serverId`, `serverConfig?`, `context?`): `Promise`\<`void`\>

Defined in: [types/mcp.ts:768](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L768)

#### Parameters

##### serverId

`string`

##### serverConfig?

`unknown`

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<`void`\>

---

### executeTool()?

> `optional` **executeTool**\<`T`\>(`toolName`, `args?`, `context?`): `Promise`\<`T`\>

Defined in: [types/mcp.ts:773](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L773)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### toolName

`string`

##### args?

`unknown`

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<`T`\>

---

### listTools()?

> `optional` **listTools**(`context?`): `Promise`\<[`ToolInfo`](ToolInfo.md)[]\>

Defined in: [types/mcp.ts:778](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L778)

#### Parameters

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<[`ToolInfo`](ToolInfo.md)[]\>
