[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouter

# Class: ToolRouter

Tool Router - Intelligent routing for MCP tool calls

## Example

```typescript
const router = new ToolRouter({
  strategy: "least-loaded",
  enableAffinity: true,
  categoryMapping: {
    database: ["db-server-1", "db-server-2"],
    ai: ["ai-server-primary", "ai-server-secondary"],
  },
});

const decision = router.route(tool, { sessionId: "user-123" });
console.log(`Routing to: ${decision.serverId}`);
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ToolRouter**(`config?`): `ToolRouter`

#### Parameters

##### config?

[`ToolRouterConfig`](../type-aliases/ToolRouterConfig.md) = `DEFAULT_ROUTER_CONFIG`

#### Returns

`ToolRouter`

#### Overrides

`EventEmitter.constructor`

## Methods

### destroy()

> **destroy**(): `void`

#### Returns

`void`

---

### registerServer()

> **registerServer**(`serverId`, `capabilities?`): `void`

Register a server as available for routing

#### Parameters

##### serverId

`string`

##### capabilities?

`string`[]

#### Returns

`void`

---

### unregisterServer()

> **unregisterServer**(`serverId`): `void`

Unregister a server from routing

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### route()

> **route**(`tool`, `context?`): [`RoutingDecision`](../type-aliases/RoutingDecision.md)

Route a tool call to the best server

#### Parameters

##### tool

[`MCPTool`](../type-aliases/MCPTool.md)

##### context?

###### sessionId?

`string`

###### userId?

`string`

#### Returns

[`RoutingDecision`](../type-aliases/RoutingDecision.md)

---

### routeByCategory()

> **routeByCategory**(`tool`, `category`): `string`[]

Route by tool category

#### Parameters

##### tool

[`MCPTool`](../type-aliases/MCPTool.md)

##### category

`string`

#### Returns

`string`[]

---

### routeByAnnotation()

> **routeByAnnotation**(`tool`): `string`[]

Route by tool annotation hints

#### Parameters

##### tool

[`MCPTool`](../type-aliases/MCPTool.md)

#### Returns

`string`[]

---

### routeByCapability()

> **routeByCapability**(`tool`, `requiredCapabilities`): `string`[]

Route by required capabilities

#### Parameters

##### tool

[`MCPTool`](../type-aliases/MCPTool.md)

##### requiredCapabilities

`string`[]

#### Returns

`string`[]

---

### updateServerLoad()

> **updateServerLoad**(`serverId`, `delta`): `void`

Update server load for least-loaded routing

#### Parameters

##### serverId

`string`

##### delta

`number`

#### Returns

`void`

---

### updateHealthStatus()

> **updateHealthStatus**(`serverId`, `healthy`): `void`

Update server health status

#### Parameters

##### serverId

`string`

##### healthy

`boolean`

#### Returns

`void`

---

### setAffinity()

> **setAffinity**(`key`, `serverId`): `void`

Set session/user affinity

#### Parameters

##### key

`string`

##### serverId

`string`

#### Returns

`void`

---

### clearAffinity()

> **clearAffinity**(`key`): `void`

Clear affinity for a key

#### Parameters

##### key

`string`

#### Returns

`void`

---

### getStats()

> **getStats**(): `object`

Get current routing statistics

#### Returns

`object`

##### availableServers

> **availableServers**: `number`

##### healthyServers

> **healthyServers**: `number`

##### activeAffinities

> **activeAffinities**: `number`

##### serverLoads

> **serverLoads**: `Record`\<`string`, `number`\>
