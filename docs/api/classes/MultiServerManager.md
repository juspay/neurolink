[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManager

# Class: MultiServerManager

Defined in: [mcp/multiServerManager.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L65)

Multi-Server Manager

Coordinates multiple MCP servers for unified tool access
with load balancing and failover capabilities.

## Example

```typescript
const manager = new MultiServerManager({
  defaultStrategy: "round-robin",
  healthAwareRouting: true,
  autoNamespace: true,
});

// Add servers
manager.addServer(server1Info);
manager.addServer(server2Info);

// Create a group for redundant servers
manager.createGroup({
  id: "data-servers",
  name: "Data Processing Servers",
  servers: ["server1", "server2"],
  strategy: "least-loaded",
});

// Get unified tool list
const tools = manager.getUnifiedTools();

// Execute with automatic routing
const result = await manager.executeTool("readFile", { path: "/data" });
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MultiServerManager**(`config?`): `MultiServerManager`

Defined in: [mcp/multiServerManager.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L73)

#### Parameters

##### config?

[`MultiServerManagerConfig`](../type-aliases/MultiServerManagerConfig.md) = `{}`

#### Returns

`MultiServerManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### addServer()

> **addServer**(`server`): `void`

Defined in: [mcp/multiServerManager.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L90)

Add a server to the manager

#### Parameters

##### server

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

`void`

---

### removeServer()

> **removeServer**(`serverId`): `boolean`

Defined in: [mcp/multiServerManager.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L113)

Remove a server from the manager

#### Parameters

##### serverId

`string`

#### Returns

`boolean`

---

### updateServer()

> **updateServer**(`serverId`, `updates`): `void`

Defined in: [mcp/multiServerManager.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L154)

Update server info

#### Parameters

##### serverId

`string`

##### updates

`Partial`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)\>

#### Returns

`void`

---

### createGroup()

> **createGroup**(`group`): `void`

Defined in: [mcp/multiServerManager.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L180)

Create a server group

#### Parameters

##### group

[`ServerGroup`](../type-aliases/ServerGroup.md)

#### Returns

`void`

---

### removeGroup()

> **removeGroup**(`groupId`): `boolean`

Defined in: [mcp/multiServerManager.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L205)

Remove a server group

#### Parameters

##### groupId

`string`

#### Returns

`boolean`

---

### addServerToGroup()

> **addServerToGroup**(`serverId`, `groupId`): `void`

Defined in: [mcp/multiServerManager.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L217)

Add a server to a group

#### Parameters

##### serverId

`string`

##### groupId

`string`

#### Returns

`void`

---

### removeServerFromGroup()

> **removeServerFromGroup**(`serverId`, `groupId`): `boolean`

Defined in: [mcp/multiServerManager.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L245)

Remove a server from a group

#### Parameters

##### serverId

`string`

##### groupId

`string`

#### Returns

`boolean`

---

### getUnifiedTools()

> **getUnifiedTools**(): [`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

Defined in: [mcp/multiServerManager.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L265)

Get unified tool list from all servers

#### Returns

[`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

---

### getNamespacedTools()

> **getNamespacedTools**(): `object`[]

Defined in: [mcp/multiServerManager.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L325)

Get namespaced tools (server.toolName format)

#### Returns

`object`[]

---

### setToolPreference()

> **setToolPreference**(`toolName`, `serverId`): `void`

Defined in: [mcp/multiServerManager.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L370)

Set tool preference for routing

#### Parameters

##### toolName

`string`

##### serverId

`string`

#### Returns

`void`

---

### clearToolPreference()

> **clearToolPreference**(`toolName`): `void`

Defined in: [mcp/multiServerManager.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L386)

Clear tool preference

#### Parameters

##### toolName

`string`

#### Returns

`void`

---

### selectServer()

> **selectServer**(`toolName`, `groupId?`): \{ `serverId`: `string`; `server`: [`MCPServerInfo`](../type-aliases/MCPServerInfo.md); \} \| `null`

Defined in: [mcp/multiServerManager.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L393)

Select a server for a tool using load balancing

#### Parameters

##### toolName

`string`

##### groupId?

`string`

#### Returns

\{ `serverId`: `string`; `server`: [`MCPServerInfo`](../type-aliases/MCPServerInfo.md); \} \| `null`

---

### updateMetrics()

> **updateMetrics**(`serverId`, `updates`): `void`

Defined in: [mcp/multiServerManager.ts:620](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L620)

Update server metrics

#### Parameters

##### serverId

`string`

##### updates

`Partial`\<[`ServerMetrics`](../type-aliases/ServerMetrics.md)\>

#### Returns

`void`

---

### requestStarted()

> **requestStarted**(`serverId`): `void`

Defined in: [mcp/multiServerManager.ts:632](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L632)

Mark request started

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### requestCompleted()

> **requestCompleted**(`serverId`, `duration`, `success`): `void`

Defined in: [mcp/multiServerManager.ts:643](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L643)

Mark request completed

#### Parameters

##### serverId

`string`

##### duration

`number`

##### success

`boolean`

#### Returns

`void`

---

### getServers()

> **getServers**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [mcp/multiServerManager.ts:665](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L665)

Get all servers

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

---

### getServer()

> **getServer**(`serverId`): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md) \| `undefined`

Defined in: [mcp/multiServerManager.ts:672](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L672)

Get server by ID

#### Parameters

##### serverId

`string`

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md) \| `undefined`

---

### getGroups()

> **getGroups**(): [`ServerGroup`](../type-aliases/ServerGroup.md)[]

Defined in: [mcp/multiServerManager.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L679)

Get all groups

#### Returns

[`ServerGroup`](../type-aliases/ServerGroup.md)[]

---

### getGroup()

> **getGroup**(`groupId`): [`ServerGroup`](../type-aliases/ServerGroup.md) \| `undefined`

Defined in: [mcp/multiServerManager.ts:686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L686)

Get group by ID

#### Parameters

##### groupId

`string`

#### Returns

[`ServerGroup`](../type-aliases/ServerGroup.md) \| `undefined`

---

### getServerMetrics()

> **getServerMetrics**(`serverId`): [`ServerMetrics`](../type-aliases/ServerMetrics.md) \| `undefined`

Defined in: [mcp/multiServerManager.ts:693](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L693)

Get server metrics

#### Parameters

##### serverId

`string`

#### Returns

[`ServerMetrics`](../type-aliases/ServerMetrics.md) \| `undefined`

---

### getAllMetrics()

> **getAllMetrics**(): `Map`\<`string`, [`ServerMetrics`](../type-aliases/ServerMetrics.md)\>

Defined in: [mcp/multiServerManager.ts:700](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L700)

Get all metrics

#### Returns

`Map`\<`string`, [`ServerMetrics`](../type-aliases/ServerMetrics.md)\>

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/multiServerManager.ts:707](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/multiServerManager.ts#L707)

Get statistics

#### Returns

`object`

##### totalServers

> **totalServers**: `number`

##### healthyServers

> **healthyServers**: `number`

##### totalGroups

> **totalGroups**: `number`

##### totalTools

> **totalTools**: `number`

##### conflictingTools

> **conflictingTools**: `number`

##### totalRequests

> **totalRequests**: `number`

##### activeRequests

> **activeRequests**: `number`
