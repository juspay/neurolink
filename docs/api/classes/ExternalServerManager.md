[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalServerManager

# Class: ExternalServerManager

Defined in: [mcp/externalServerManager.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L275)

MCP (Model Context Protocol) Plugin Ecosystem

Extensible plugin architecture based on research blueprint for
transforming NeuroLink into a Universal AI Development Platform.

## Example

```typescript
import { mcpEcosystem, readFile, writeFile } from "@juspay/neurolink";

// Initialize the ecosystem
await mcpEcosystem.initialize();

// List available plugins
const plugins = await mcpEcosystem.list();

// Use filesystem operations
const content = await readFile("README.md");
await writeFile("output.txt", "Hello from MCP!");
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ExternalServerManager**(`config?`, `options?`): `ExternalServerManager`

Defined in: [mcp/externalServerManager.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L289)

#### Parameters

##### config?

[`ExternalMCPManagerConfig`](../type-aliases/ExternalMCPManagerConfig.md) = `{}`

##### options?

###### enableMainRegistryIntegration?

`boolean`

#### Returns

`ExternalServerManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### setOutputNormalizer()

> **setOutputNormalizer**(`normalizer`): `void`

Defined in: [mcp/externalServerManager.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L348)

Attach a McpOutputNormalizer to the underlying ToolDiscoveryService.
All tool outputs will be measured and (if oversized) replaced with compact
surrogates before being returned to callers.

#### Parameters

##### normalizer

`McpOutputNormalizer`

#### Returns

`void`

---

### setHITLManager()

> **setHITLManager**(`hitlManager?`): `void`

Defined in: [mcp/externalServerManager.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L361)

Set HITL manager for human-in-the-loop safety mechanisms

#### Parameters

##### hitlManager?

`HITLManager`

HITL manager instance (optional, can be undefined to disable)

#### Returns

`void`

---

### getHITLManager()

> **getHITLManager**(): `HITLManager` \| `undefined`

Defined in: [mcp/externalServerManager.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L377)

Get current HITL manager

#### Returns

`HITLManager` \| `undefined`

---

### getServerName()

> **getServerName**(`serverId`): `string`

Defined in: [mcp/externalServerManager.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L385)

Resolve the human-readable server name for an event payload.
Falls back to serverId if the instance or config.name isn't available.

#### Parameters

##### serverId

`string`

#### Returns

`string`

---

### loadMCPConfiguration()

> **loadMCPConfiguration**(`configPath?`, `options?`): `Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Defined in: [mcp/externalServerManager.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L397)

Load MCP server configurations from .mcp-config.json file with parallel loading support
Automatically registers servers found in the configuration

#### Parameters

##### configPath?

`string`

Optional path to config file (defaults to .mcp-config.json in cwd)

##### options?

Loading options including parallel support

###### parallel?

`boolean`

#### Returns

`Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Promise resolving to { serversLoaded, errors }

---

### loadMCPConfigurationParallel()

> **loadMCPConfigurationParallel**(`configPath?`): `Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Defined in: [mcp/externalServerManager.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L412)

Load MCP servers in parallel for improved performance

#### Parameters

##### configPath?

`string` \| `null`

Optional path to config file (defaults to .mcp-config.json in cwd)

#### Returns

`Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Promise resolving to batch operation result

---

### loadMCPConfigurationSequential()

> **loadMCPConfigurationSequential**(`configPath?`): `Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Defined in: [mcp/externalServerManager.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L594)

Load MCP servers sequentially (original implementation for backward compatibility)

#### Parameters

##### configPath?

`string`

Optional path to config file (defaults to .mcp-config.json in cwd)

#### Returns

`Promise`\<[`ServerLoadResult`](../type-aliases/ServerLoadResult.md)\>

Promise resolving to batch operation result

---

### validateConfig()

> **validateConfig**(`config`): [`ExternalMCPConfigValidation`](../type-aliases/ExternalMCPConfigValidation.md)

Defined in: [mcp/externalServerManager.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L751)

Validate external MCP server configuration

#### Parameters

##### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

[`ExternalMCPConfigValidation`](../type-aliases/ExternalMCPConfigValidation.md)

---

### addServer()

#### Call Signature

> **addServer**(`serverId`, `config`): `Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

Defined in: [mcp/externalServerManager.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L851)

Add a new external MCP server - Backward compatibility overload

##### Parameters

###### serverId

`string`

###### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

##### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

#### Call Signature

> **addServer**(`serverId`, `serverInfo`): `Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

Defined in: [mcp/externalServerManager.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L859)

Add a new external MCP server - Updated to accept MCPServerInfo

##### Parameters

###### serverId

`string`

###### serverInfo

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

##### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

---

### removeServer()

> **removeServer**(`serverId`): `Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<`void`\>\>

Defined in: [mcp/externalServerManager.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1030)

Remove an external MCP server

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<`void`\>\>

---

### getServer()

> **getServer**(`serverId`): [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

Defined in: [mcp/externalServerManager.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1686)

Get server instance - converted to ExternalMCPServerInstance for compatibility

#### Parameters

##### serverId

`string`

#### Returns

[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

---

### getAllServers()

> **getAllServers**(): `Map`\<`string`, [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>

Defined in: [mcp/externalServerManager.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1716)

Get all servers - converted to ExternalMCPServerInstance for compatibility

#### Returns

`Map`\<`string`, [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>

---

### listServers()

> **listServers**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [mcp/externalServerManager.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1745)

List servers as MCPServerInfo - ZERO conversion needed

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

---

### getServerStatuses()

> **getServerStatuses**(): [`ExternalMCPServerHealth`](../type-aliases/ExternalMCPServerHealth.md)[]

Defined in: [mcp/externalServerManager.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1752)

Get server statuses

#### Returns

[`ExternalMCPServerHealth`](../type-aliases/ExternalMCPServerHealth.md)[]

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [mcp/externalServerManager.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1781)

Shutdown all servers and clean up resources
This method should be called during application shutdown to prevent memory leaks

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [mcp/externalServerManager.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1818)

Destroy the manager and all associated resources
Alias for shutdown() to match the pattern used by other components

#### Returns

`Promise`\<`void`\>

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/externalServerManager.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1825)

Get manager statistics

#### Returns

`object`

##### totalServers

> **totalServers**: `number`

##### connectedServers

> **connectedServers**: `number`

##### failedServers

> **failedServers**: `number`

##### totalTools

> **totalTools**: `number`

##### totalConnections

> **totalConnections**: `number`

##### totalErrors

> **totalErrors**: `number`

---

### executeTool()

> **executeTool**(`serverId`, `toolName`, `parameters`, `options?`): `Promise`\<`unknown`\>

Defined in: [mcp/externalServerManager.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2038)

Execute a tool on a specific server

#### Parameters

##### serverId

`string`

##### toolName

`string`

##### parameters

[`JsonObject`](../type-aliases/JsonObject.md)

##### options?

###### timeout?

`number`

#### Returns

`Promise`\<`unknown`\>

---

### getAllTools()

> **getAllTools**(): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [mcp/externalServerManager.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2242)

Get all tools from all servers

#### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

---

### getServerTools()

> **getServerTools**(`serverId`): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [mcp/externalServerManager.ts:2249](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2249)

Get tools for a specific server

#### Parameters

##### serverId

`string`

#### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

---

### getToolDiscovery()

> **getToolDiscovery**(): `ToolDiscoveryService`

Defined in: [mcp/externalServerManager.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2256)

Get tool discovery service

#### Returns

`ToolDiscoveryService`
