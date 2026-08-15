[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedMCPRegistry

# Type Alias: UnifiedMCPRegistry

> **UnifiedMCPRegistry** = `object`

Defined in: [types/mcp.ts:402](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L402)

Unified MCP Registry type

## Methods

### registerInMemoryServer()

> **registerInMemoryServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

Defined in: [types/mcp.ts:406](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L406)

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

Defined in: [types/mcp.ts:414](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L414)

Get all available tools

#### Returns

`Promise`\<[`MCPToolInfo`](MCPToolInfo.md)[]\>

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context`): `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:419](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L419)

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

Defined in: [types/mcp.ts:428](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L428)

Check if connected to a server

#### Parameters

##### serverId

`string`

#### Returns

`boolean`
