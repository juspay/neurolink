[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistry

# Type Alias: McpRegistry

> **McpRegistry** = `object`

MCP Registry type with optional methods for maximum flexibility
Moved from src/lib/mcp/registry.ts

## Methods

### registerServer()?

> `optional` **registerServer**(`serverId`, `serverConfig?`, `context?`): `Promise`\<`void`\>

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

#### Parameters

##### context?

[`ExecutionContext`](ExecutionContext.md)

#### Returns

`Promise`\<[`ToolInfo`](ToolInfo.md)[]\>
