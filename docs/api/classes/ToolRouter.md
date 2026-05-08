[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouter

# Class: ToolRouter

Defined in: [mcp/routing/toolRouter.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L50)

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

Defined in: [mcp/routing/toolRouter.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L59)

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

Defined in: [mcp/routing/toolRouter.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L83)

#### Returns

`void`

---

### registerServer()

> **registerServer**(`serverId`, `capabilities?`): `void`

Defined in: [mcp/routing/toolRouter.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L104)

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

Defined in: [mcp/routing/toolRouter.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L125)

Unregister a server from routing

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### route()

> **route**(`tool`, `context?`): [`RoutingDecision`](../type-aliases/RoutingDecision.md)

Defined in: [mcp/routing/toolRouter.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L146)

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

Defined in: [mcp/routing/toolRouter.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L208)

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

Defined in: [mcp/routing/toolRouter.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L216)

Route by tool annotation hints

#### Parameters

##### tool

[`MCPTool`](../type-aliases/MCPTool.md)

#### Returns

`string`[]

---

### routeByCapability()

> **routeByCapability**(`tool`, `requiredCapabilities`): `string`[]

Defined in: [mcp/routing/toolRouter.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L262)

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

Defined in: [mcp/routing/toolRouter.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L292)

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

Defined in: [mcp/routing/toolRouter.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L300)

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

Defined in: [mcp/routing/toolRouter.ts:312](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L312)

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

Defined in: [mcp/routing/toolRouter.ts:324](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L324)

Clear affinity for a key

#### Parameters

##### key

`string`

#### Returns

`void`

---

### getStats()

> **getStats**(): `object`

Defined in: [mcp/routing/toolRouter.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/routing/toolRouter.ts#L331)

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
