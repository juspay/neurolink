[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedMCPRegistry

# Type Alias: UnifiedMCPRegistry

> **UnifiedMCPRegistry** = `object`

Defined in: [types/mcp.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L421)

Unified MCP Registry type

## Methods

### registerInMemoryServer()

> **registerInMemoryServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

Defined in: [types/mcp.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L425)

Register an in-memory server

#### Parameters

##### serverId

`string`

##### serverInfo

[`MCPServerInfo`](MCPServerInfo.md)

#### Returns

`Promise`\<`void`\>

---

### getAllTools()

> **getAllTools**(): `Promise`\<[`MCPToolInfo`](MCPToolInfo.md)[]\>

Defined in: [types/mcp.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L433)

Get all available tools

#### Returns

`Promise`\<[`MCPToolInfo`](MCPToolInfo.md)[]\>

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context`): `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L438)

Execute a tool

#### Parameters

##### toolName

`string`

##### params

[`JsonObject`](JsonObject.md)

##### context

[`JsonObject`](JsonObject.md)

#### Returns

`Promise`\<`unknown`\>

---

### isConnected()

> **isConnected**(`serverId`): `boolean`

Defined in: [types/mcp.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L447)

Check if connected to a server

#### Parameters

##### serverId

`string`

#### Returns

`boolean`
