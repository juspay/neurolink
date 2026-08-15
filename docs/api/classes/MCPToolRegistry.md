[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolRegistry

# Class: MCPToolRegistry

Defined in: [mcp/toolRegistry.ts:32](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L32)

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

Defined in: [mcp/toolRegistry.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L42)

#### Returns

`MCPToolRegistry`

#### Overrides

`MCPRegistry.constructor`

## Properties

### plugins

> **plugins**: `Map`\<`string`, [`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)\>

Defined in: [mcp/registry.ts:20](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L20)

#### Inherited from

`MCPRegistry.plugins`

## Methods

### register()

> **register**(`plugin`): `void`

Defined in: [mcp/registry.ts:25](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L25)

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

Defined in: [mcp/registry.ts:33](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L33)

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

Defined in: [mcp/registry.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L44)

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

Defined in: [mcp/registry.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L51)

List all plugins

#### Returns

[`DiscoveredMcp`](../type-aliases/DiscoveredMcp.md)[]

#### Inherited from

`MCPRegistry.list`

---

### has()

> **has**(`name`): `boolean`

Defined in: [mcp/registry.ts:58](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L58)

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

Defined in: [mcp/registry.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L65)

Clear all plugins

#### Returns

`void`

#### Inherited from

`MCPRegistry.clear`

---

### registerServerSync()

> **registerServerSync**(`plugin`): `void`

Defined in: [mcp/registry.ts:130](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L130)

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

Defined in: [mcp/registry.ts:137](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L137)

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

Defined in: [mcp/registry.ts:145](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L145)

List all tools (legacy sync version)

#### Returns

`object`[]

#### Inherited from

`MCPRegistry.listToolsSync`

---

### listServers()

> **listServers**(): `string`[]

Defined in: [mcp/registry.ts:174](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/registry.ts#L174)

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

Defined in: [mcp/toolRegistry.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L53)

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

Defined in: [mcp/toolRegistry.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L65)

Get current HITL manager

#### Returns

`HITLManager` \| `undefined`

---

### registerServer()

#### Call Signature

> **registerServer**(`serverInfo`, `context?`): `Promise`\<`void`\>

Defined in: [mcp/toolRegistry.ts:154](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L154)

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

Defined in: [mcp/toolRegistry.ts:158](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L158)

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

Defined in: [mcp/toolRegistry.ts:318](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L318)

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

Defined in: [mcp/toolRegistry.ts:608](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L608)

List all available tools (updated signature with filtering)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

##### Overrides

`MCPRegistry.listTools`

#### Call Signature

> **listTools**(`context`): `Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

Defined in: [mcp/toolRegistry.ts:609](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L609)

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

Defined in: [mcp/toolRegistry.ts:610](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L610)

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

Defined in: [mcp/toolRegistry.ts:747](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L747)

Get tool information with server details

#### Parameters

##### toolName

`string`

#### Returns

\{ `tool`: [`ToolInfo`](../type-aliases/ToolInfo.md); `server`: \{ `id`: `string`; \}; \} \| `undefined`

---

### getExecutionStats()

> **getExecutionStats**(): `Record`\<`string`, \{ `count`: `number`; `averageTime`: `number`; `totalTime`: `number`; \}\>

Defined in: [mcp/toolRegistry.ts:792](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L792)

Get execution statistics

#### Returns

`Record`\<`string`, \{ `count`: `number`; `averageTime`: `number`; `totalTime`: `number`; \}\>

---

### clearStats()

> **clearStats**(): `void`

Defined in: [mcp/toolRegistry.ts:815](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L815)

Clear execution statistics

#### Returns

`void`

---

### getBuiltInServerInfos()

> **getBuiltInServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [mcp/toolRegistry.ts:823](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L823)

Get built-in servers

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo for built-in tools

---

### getToolsByCategory()

> **getToolsByCategory**(`category`): [`ToolInfo`](../type-aliases/ToolInfo.md)[]

Defined in: [mcp/toolRegistry.ts:830](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L830)

Get tools by category

#### Parameters

##### category

`string`

#### Returns

[`ToolInfo`](../type-aliases/ToolInfo.md)[]

---

### getAvailableTools()

> **getAvailableTools**(`circuitBreakers`): `object`

Defined in: [mcp/toolRegistry.ts:845](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L845)

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

Defined in: [mcp/toolRegistry.ts:871](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L871)

Check if tool exists

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### registerTool()

> **registerTool**(`toolId`, `toolInfo`, `toolImpl`): `Promise`\<`void`\>

Defined in: [mcp/toolRegistry.ts:888](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L888)

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

Defined in: [mcp/toolRegistry.ts:930](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L930)

Remove a tool

#### Parameters

##### toolName

`string`

#### Returns

`boolean`

---

### getToolCount()

> **getToolCount**(): `number`

Defined in: [mcp/toolRegistry.ts:957](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L957)

Get tool count

#### Returns

`number`

---

### getStats()

> **getStats**(): `object`

Defined in: [mcp/toolRegistry.ts:964](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L964)

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

Defined in: [mcp/toolRegistry.ts:1004](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolRegistry.ts#L1004)

Unregister a server

#### Parameters

##### serverId

`string`

#### Returns

`boolean`
