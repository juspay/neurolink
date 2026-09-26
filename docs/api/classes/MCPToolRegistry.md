[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolRegistry

# Class: MCPToolRegistry

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

- `MCPRegistry`

## Constructors

### Constructor

> **new MCPToolRegistry**(): `MCPToolRegistry`

#### Returns

`MCPToolRegistry`

#### Overrides

`MCPRegistry.constructor`

## Properties

### plugins

> **plugins**: `Map`\<`string`, [`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)\>

#### Inherited from

`MCPRegistry.plugins`

## Methods

### register()

> **register**(`plugin`): `void`

Register a plugin

#### Parameters

##### plugin

[`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)

#### Returns

`void`

#### Inherited from

`MCPRegistry.register`

---

### unregister()

> **unregister**(`name`): `boolean`

Unregister a plugin

#### Parameters

##### name

`string`

#### Returns

`boolean`

#### Inherited from

`MCPRegistry.unregister`

---

### get()

> **get**(`name`): [`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md) \| `undefined`

Get a plugin

#### Parameters

##### name

`string`

#### Returns

[`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md) \| `undefined`

#### Inherited from

`MCPRegistry.get`

---

### list()

> **list**(): [`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)[]

List all plugins

#### Returns

[`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)[]

#### Inherited from

`MCPRegistry.list`

---

### has()

> **has**(`name`): `boolean`

Check if plugin exists

#### Parameters

##### name

`string`

#### Returns

`boolean`

#### Inherited from

`MCPRegistry.has`

---

### clear()

> **clear**(): `void`

Clear all plugins

#### Returns

`void`

#### Inherited from

`MCPRegistry.clear`

---

### registerServerSync()

> **registerServerSync**(`plugin`): `void`

Register a server (legacy sync version)

#### Parameters

##### plugin

[`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)

#### Returns

`void`

#### Inherited from

`MCPRegistry.registerServerSync`

---

### executeToolSync()

> **executeToolSync**(`toolName`, `args?`): [`UnknownRecord`](../type-aliases/UnknownRecord.md)

Execute a tool (legacy sync version)

#### Parameters

##### toolName

`string`

##### args?

`unknown`

#### Returns

[`UnknownRecord`](../type-aliases/UnknownRecord.md)

#### Inherited from

`MCPRegistry.executeToolSync`

---

### listToolsSync()

> **listToolsSync**(): `object`[]

List all tools (legacy sync version)

#### Returns

`object`[]

#### Inherited from

`MCPRegistry.listToolsSync`

---

### listServers()

> **listServers**(): `string`[]

List all registered server IDs

Returns an array of server IDs that are currently registered in the MCP registry.
This complements listTools() by providing server-level information, while listTools()
provides tool-level information across all servers.

#### Returns

`string`[]

Array of registered server identifier strings

#### See

- listTools() for getting detailed tool information from all servers
- list() for getting complete server metadata objects

#### Example

```typescript
const serverIds = registry.listServers();
// ['ai-core', 'external-api', 'database-connector']

// Compare with listTools() for comprehensive overview:
const servers = registry.listServers(); // ['server1', 'server2']
const tools = await registry.listTools(); // [{ name: 'tool1', serverId: 'server1' }, ...]
```

#### Inherited from

`MCPRegistry.listServers`

---

### setHITLManager()

> **setHITLManager**(`hitlManager?`): `void`

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

Get current HITL manager

#### Returns

`HITLManager` \| `undefined`

---

### setFileToolRootResolver()

> **setFileToolRootResolver**(`resolver`): `void`

Resolve file-tool roots for built-in tools executed on this registry
without a per-call policy. Set by the NeuroLink instance that created it.

#### Parameters

##### resolver

() => [`FileToolRootPolicy`](../type-aliases/FileToolRootPolicy.md)

#### Returns

`void`

---

### registerServer()

#### Call Signature

> **registerServer**(`serverInfo`, `context?`): `Promise`\<`void`\>

Register a server with its tools - ONLY accepts MCPServerInfo (zero conversions)

##### Parameters

###### serverInfo

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

###### context?

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

##### Returns

`Promise`\<`void`\>

##### Overrides

`MCPRegistry.registerServer`

#### Call Signature

> **registerServer**(`serverId`, `serverConfig?`, `context?`): `Promise`\<`void`\>

Register a server with its tools - ONLY accepts MCPServerInfo (zero conversions)

##### Parameters

###### serverId

`string`

###### serverConfig?

`unknown`

###### context?

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

##### Returns

`Promise`\<`void`\>

##### Overrides

`MCPRegistry.registerServer`

---

### executeTool()

> **executeTool**\<`T`\>(`toolName`, `args?`, `context?`): `Promise`\<`T`\>

Execute a tool with enhanced context and automatic result wrapping

This method handles both raw return values and ToolResult objects:

- Raw values (primitives, objects) are automatically wrapped in ToolResult format
- Existing ToolResult objects are enhanced with execution metadata
- All results include execution timing and context information

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### toolName

`string`

Name of the tool to execute

##### args?

`unknown`

Parameters to pass to the tool execution function

##### context?

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

Execution context with session, user, and environment info

#### Returns

`Promise`\<`T`\>

Promise resolving to ToolResult object with data, metadata, and usage info

#### Throws

Error if tool is not found or execution fails

#### Example

```typescript
// Tool that returns raw value
const result = await toolRegistry.executeTool("calculator", {
  a: 5,
  b: 3,
  op: "add",
});
// result.data === 8, result.metadata contains execution info

// Tool that returns ToolResult
const result = await toolRegistry.executeTool("complexTool", { input: "test" });
// result is enhanced ToolResult with additional metadata
```

#### Overrides

`MCPRegistry.executeTool`

---

### listTools()

#### Call Signature

> **listTools**(): `Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

List all available tools (updated signature with filtering)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

##### Overrides

`MCPRegistry.listTools`

#### Call Signature

> **listTools**(`context`): `Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

List all available tools (updated signature with filtering)

##### Parameters

###### context

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

##### Overrides

`MCPRegistry.listTools`

#### Call Signature

> **listTools**(`filter`): `Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

List all available tools (updated signature with filtering)

##### Parameters

###### filter

###### category?

`string`

###### serverId?

`string`

###### serverCategory?

`string`

###### permissions?

`string`[]

###### context?

[`ExecutionContext`](../type-aliases/ExecutionContext.md)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

##### Overrides

`MCPRegistry.listTools`

---

### getToolInfo()

> **getToolInfo**(`toolName`): \{ `tool`: [`ToolInfo`](../type-aliases/ToolInfo.md); `server`: \{ `id`: `string`; \}; \} \| `undefined`

Get tool information with server details

#### Parameters

##### toolName

`string`

#### Returns

\{ `tool`: [`ToolInfo`](../type-aliases/ToolInfo.md); `server`: \{ `id`: `string`; \}; \} \| `undefined`

---

### getExecutionStats()

> **getExecutionStats**(): `Record`\<`string`, \{ `count`: `number`; `averageTime`: `number`; `totalTime`: `number`; \}\>

Get execution statistics

#### Returns

`Record`\<`string`, \{ `count`: `number`; `averageTime`: `number`; `totalTime`: `number`; \}\>

---

### clearStats()

> **clearStats**(): `void`

Clear execution statistics

#### Returns

`void`

---

### getBuiltInServerInfos()

> **getBuiltInServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Get built-in servers

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo for built-in tools

---

### getToolsByCategory()

> **getToolsByCategory**(`category`): [`ToolInfo`](../type-aliases/ToolInfo.md)[]

Get tools by category

#### Parameters

##### category

`string`

#### Returns

[`ToolInfo`](../type-aliases/ToolInfo.md)[]

---

### getAvailableTools()

> **getAvailableTools**(`circuitBreakers`): `object`

NL-001: Get available tools, filtering out those with OPEN circuit breakers.
Returns both the filtered tools and the list of unavailable tool names.

#### Parameters

##### circuitBreakers

`Map`\<`string`, `CircuitBreaker`\>

#### Returns

`object`

##### tools

> **tools**: [`ToolInfo`](../type-aliases/ToolInfo.md)[]

##### unavailableTools

> **unavailableTools**: `string`[]

---

### hasTool()

> **hasTool**(`toolName`): `boolean`

Check if tool exists

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### registerTool()

> **registerTool**(`toolId`, `toolInfo`, `toolImpl`): `Promise`\<`void`\>

Register a tool with implementation directly
This is used for external MCP server tools

#### Parameters

##### toolId

`string`

##### toolInfo

[`ToolInfo`](../type-aliases/ToolInfo.md)

##### toolImpl

[`ToolImplementation`](../type-aliases/ToolImplementation.md)

#### Returns

`Promise`\<`void`\>

---

### removeTool()

> **removeTool**(`toolName`): `boolean`

Remove a tool

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### getToolCount()

> **getToolCount**(): `number`

Get tool count

#### Returns

`number`

---

### getStats()

> **getStats**(): `object`

Get comprehensive statistics

#### Returns

`object`

##### totalServers

> **totalServers**: `number`

##### totalTools

> **totalTools**: `number`

##### serversByCategory

> **serversByCategory**: `Record`\<`string`, `number`\>

##### toolsByCategory

> **toolsByCategory**: `Record`\<`string`, `number`\>

##### executionStats

> **executionStats**: `Record`\<`string`, \{ `count`: `number`; `averageTime`: `number`; `totalTime`: `number`; \}\>

---

### unregisterServer()

> **unregisterServer**(`serverId`): `boolean`

Unregister a server

#### Parameters

##### serverId

`string`

#### Returns

`boolean`
