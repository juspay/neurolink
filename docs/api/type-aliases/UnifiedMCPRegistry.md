[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedMCPRegistry

# Type Alias: UnifiedMCPRegistry

> **UnifiedMCPRegistry** = `object`

Unified MCP Registry type

## Methods

### registerInMemoryServer()

> **registerInMemoryServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

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

Get all available tools

#### Returns

`Promise`\<[`MCPToolInfo`](MCPToolInfo.md)[]\>

---

### executeTool()

> **executeTool**(`toolName`, `params`, `context`): `Promise`\<`unknown`\>

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

Check if connected to a server

#### Parameters

##### serverId

`string`

#### Returns

`boolean`
