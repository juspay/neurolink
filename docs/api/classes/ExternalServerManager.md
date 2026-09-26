[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalServerManager

# Class: ExternalServerManager

Defined in: [mcp/externalServerManager.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L466)

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

Defined in: [mcp/externalServerManager.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L480)

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

Defined in: [mcp/externalServerManager.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L539)

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

Defined in: [mcp/externalServerManager.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L552)

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

Defined in: [mcp/externalServerManager.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L568)

Get current HITL manager

#### Returns

`HITLManager` \| `undefined`

---

### getServerName()

> **getServerName**(`serverId`): `string`

Defined in: [mcp/externalServerManager.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L576)

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

Defined in: [mcp/externalServerManager.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L588)

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

Defined in: [mcp/externalServerManager.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L603)

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

Defined in: [mcp/externalServerManager.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L785)

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

Defined in: [mcp/externalServerManager.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L942)

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

Defined in: [mcp/externalServerManager.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1043)

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

Defined in: [mcp/externalServerManager.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1051)

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

Defined in: [mcp/externalServerManager.ts:1242](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1242)

Remove an external MCP server

#### Parameters

##### serverId

`string`

#### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<`void`\>\>

---

### getServer()

> **getServer**(`serverId`): [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

Defined in: [mcp/externalServerManager.ts:1952](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1952)

Get server instance - converted to ExternalMCPServerInstance for compatibility

#### Parameters

##### serverId

`string`

#### Returns

[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

---

### getAllServers()

> **getAllServers**(): `Map`\<`string`, [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>

Defined in: [mcp/externalServerManager.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L1982)

Get all servers - converted to ExternalMCPServerInstance for compatibility

#### Returns

`Map`\<`string`, [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>

---

### listServers()

> **listServers**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [mcp/externalServerManager.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2011)

List servers as MCPServerInfo - ZERO conversion needed

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

---

### getServerStatuses()

> **getServerStatuses**(): [`ExternalMCPServerHealth`](../type-aliases/ExternalMCPServerHealth.md)[]

Defined in: [mcp/externalServerManager.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2018)

Get server statuses

#### Returns

[`ExternalMCPServerHealth`](../type-aliases/ExternalMCPServerHealth.md)[]

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [mcp/externalServerManager.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2047)

Shutdown all servers and clean up resources
This method should be called during application shutdown to prevent memory leaks

#### Returns

`Promise`\<`void`\>

---

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [mcp/externalServerManager.ts:2084](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2084)

Destroy the manager and all associated resources
Alias for shutdown() to match the pattern used by other components

#### Returns

`Promise`\<`void`\>

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/externalServerManager.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2091)

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

Defined in: [mcp/externalServerManager.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2304)

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

Defined in: [mcp/externalServerManager.ts:2515](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2515)

Get all tools from all servers

#### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

---

### getServerTools()

> **getServerTools**(`serverId`): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [mcp/externalServerManager.ts:2522](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2522)

Get tools for a specific server

#### Parameters

##### serverId

`string`

#### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

---

### getToolDiscovery()

> **getToolDiscovery**(): `ToolDiscoveryService`

Defined in: [mcp/externalServerManager.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/externalServerManager.ts#L2529)

Get tool discovery service

#### Returns

`ToolDiscoveryService`
