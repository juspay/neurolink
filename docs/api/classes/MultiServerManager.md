[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiServerManager

# Class: MultiServerManager

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

Add a server to the manager

#### Parameters

##### server

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

`void`

---

### removeServer()

> **removeServer**(`serverId`): `boolean`

Remove a server from the manager

#### Parameters

##### serverId

`string`

#### Returns

`boolean`

---

### updateServer()

> **updateServer**(`serverId`, `updates`): `void`

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

Create a server group

#### Parameters

##### group

[`ServerGroup`](../type-aliases/ServerGroup.md)

#### Returns

`void`

---

### removeGroup()

> **removeGroup**(`groupId`): `boolean`

Remove a server group

#### Parameters

##### groupId

`string`

#### Returns

`boolean`

---

### addServerToGroup()

> **addServerToGroup**(`serverId`, `groupId`): `void`

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

Get unified tool list from all servers

#### Returns

[`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

---

### getNamespacedTools()

> **getNamespacedTools**(): `object`[]

Get namespaced tools (server.toolName format)

#### Returns

`object`[]

---

### setToolPreference()

> **setToolPreference**(`toolName`, `serverId`): `void`

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

Clear tool preference

#### Parameters

##### toolName

`string`

#### Returns

`void`

---

### selectServer()

> **selectServer**(`toolName`, `groupId?`): \{ `serverId`: `string`; `server`: [`MCPServerInfo`](../type-aliases/MCPServerInfo.md); \} \| `null`

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

Mark request started

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### requestCompleted()

> **requestCompleted**(`serverId`, `duration`, `success`): `void`

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

Get all servers

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

---

### getServer()

> **getServer**(`serverId`): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md) \| `undefined`

Get server by ID

#### Parameters

##### serverId

`string`

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md) \| `undefined`

---

### getGroups()

> **getGroups**(): [`ServerGroup`](../type-aliases/ServerGroup.md)[]

Get all groups

#### Returns

[`ServerGroup`](../type-aliases/ServerGroup.md)[]

---

### getGroup()

> **getGroup**(`groupId`): [`ServerGroup`](../type-aliases/ServerGroup.md) \| `undefined`

Get group by ID

#### Parameters

##### groupId

`string`

#### Returns

[`ServerGroup`](../type-aliases/ServerGroup.md) \| `undefined`

---

### getServerMetrics()

> **getServerMetrics**(`serverId`): [`ServerMetrics`](../type-aliases/ServerMetrics.md) \| `undefined`

Get server metrics

#### Parameters

##### serverId

`string`

#### Returns

[`ServerMetrics`](../type-aliases/ServerMetrics.md) \| `undefined`

---

### getAllMetrics()

> **getAllMetrics**(): `Map`\<`string`, [`ServerMetrics`](../type-aliases/ServerMetrics.md)\>

Get all metrics

#### Returns

`Map`\<`string`, [`ServerMetrics`](../type-aliases/ServerMetrics.md)\>

---

### getStatistics()

> **getStatistics**(): `object`

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
