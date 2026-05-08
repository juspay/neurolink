[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedToolDiscovery

# Class: EnhancedToolDiscovery

Defined in: [mcp/enhancedToolDiscovery.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L63)

Enhanced Tool Discovery Service

Provides advanced tool discovery features including annotation support,
multi-server coordination, and powerful search capabilities.

## Example

```typescript
const discovery = new EnhancedToolDiscovery();

// Discover tools with annotation inference
const result = await discovery.discoverToolsWithAnnotations(
  "github-server",
  client,
);

// Search for tools
const searchResult = await discovery.searchTools({
  category: "file-system",
  annotations: { readOnlyHint: true },
  limit: 10,
});

// Get tools by safety level
const safeTools = discovery.getToolsBySafetyLevel("safe");
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new EnhancedToolDiscovery**(`multiServerManager?`): `EnhancedToolDiscovery`

Defined in: [mcp/enhancedToolDiscovery.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L69)

#### Parameters

##### multiServerManager?

[`MultiServerManager`](MultiServerManager.md)

#### Returns

`EnhancedToolDiscovery`

#### Overrides

`EventEmitter.constructor`

## Methods

### discoverToolsWithAnnotations()

> **discoverToolsWithAnnotations**(`serverId`, `client`, `timeout?`): `Promise`\<[`ToolDiscoveryResult`](../type-aliases/ToolDiscoveryResult.md)\>

Defined in: [mcp/enhancedToolDiscovery.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L77)

Discover tools with automatic annotation inference

#### Parameters

##### serverId

`string`

##### client

`Client`

##### timeout?

`number` = `10000`

#### Returns

`Promise`\<[`ToolDiscoveryResult`](../type-aliases/ToolDiscoveryResult.md)\>

---

### searchTools()

> **searchTools**(`criteria`): [`ToolSearchResult`](../type-aliases/ToolSearchResult.md)

Defined in: [mcp/enhancedToolDiscovery.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L250)

Search tools with advanced criteria

#### Parameters

##### criteria

[`ToolSearchCriteria`](../type-aliases/ToolSearchCriteria.md)

#### Returns

[`ToolSearchResult`](../type-aliases/ToolSearchResult.md)

---

### getToolsBySafetyLevel()

> **getToolsBySafetyLevel**(`level`): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L369)

Get tools by safety level

#### Parameters

##### level

`"safe"` \| `"moderate"` \| `"dangerous"`

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getToolsRequiringConfirmation()

> **getToolsRequiringConfirmation**(): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L391)

Get tools requiring confirmation

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getReadOnlyTools()

> **getReadOnlyTools**(): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L402)

Get read-only tools

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getUnifiedTools()

> **getUnifiedTools**(): [`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:411](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L411)

Get unified tools from all servers

#### Returns

[`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

---

### registerServer()

> **registerServer**(`server`): `void`

Defined in: [mcp/enhancedToolDiscovery.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L418)

Register a server with the multi-server manager

#### Parameters

##### server

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

`void`

---

### updateToolAnnotations()

> **updateToolAnnotations**(`serverId`, `toolName`, `annotations`): `boolean`

Defined in: [mcp/enhancedToolDiscovery.ts:425](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L425)

Update tool annotations

#### Parameters

##### serverId

`string`

##### toolName

`string`

##### annotations

`Partial`\<[`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md)\>

#### Returns

`boolean`

---

### checkCompatibility()

> **checkCompatibility**(`toolName`, `serverId`, `targetVersion?`): [`CompatibilityCheckResult`](../type-aliases/CompatibilityCheckResult.md)

Defined in: [mcp/enhancedToolDiscovery.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L455)

Check tool compatibility

#### Parameters

##### toolName

`string`

##### serverId

`string`

##### targetVersion?

`string`

#### Returns

[`CompatibilityCheckResult`](../type-aliases/CompatibilityCheckResult.md)

---

### getTool()

> **getTool**(`serverId`, `toolName`): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md) \| `undefined`

Defined in: [mcp/enhancedToolDiscovery.ts:518](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L518)

Get tool by key

#### Parameters

##### serverId

`string`

##### toolName

`string`

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md) \| `undefined`

---

### getAllTools()

> **getAllTools**(): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:525](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L525)

Get all tools

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getServerTools()

> **getServerTools**(`serverId`): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Defined in: [mcp/enhancedToolDiscovery.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L532)

Get tools for a server

#### Parameters

##### serverId

`string`

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### clearServerTools()

> **clearServerTools**(`serverId`): `void`

Defined in: [mcp/enhancedToolDiscovery.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L546)

Clear tools for a server

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/enhancedToolDiscovery.ts:567](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/enhancedToolDiscovery.ts#L567)

Get statistics

#### Returns

`object`

##### totalTools

> **totalTools**: `number`

##### toolsByServer

> **toolsByServer**: `Record`\<`string`, `number`\>

##### toolsByCategory

> **toolsByCategory**: `Record`\<`string`, `number`\>

##### toolsBySafetyLevel

> **toolsBySafetyLevel**: `Record`\<`string`, `number`\>

##### toolsWithAnnotations

> **toolsWithAnnotations**: `number`

##### deprecatedTools

> **deprecatedTools**: `number`
