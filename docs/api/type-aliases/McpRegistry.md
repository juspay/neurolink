[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistry

# Type Alias: McpRegistry

> **McpRegistry** = `object`

Defined in: [types/mcp.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L804)

MCP Registry type with optional methods for maximum flexibility
Moved from src/lib/mcp/registry.ts

## Methods

### registerServer()?

> `optional` **registerServer**(`serverId`, `serverConfig?`, `context?`): `Promise`\<`void`\>

Defined in: [types/mcp.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L806)

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

Defined in: [types/mcp.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L811)

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

Defined in: [types/mcp.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L816)

#### Parameters

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<[`ToolInfo`](ToolInfo.md)[]\>
