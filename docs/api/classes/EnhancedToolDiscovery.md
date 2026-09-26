[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedToolDiscovery

# Class: EnhancedToolDiscovery

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

Search tools with advanced criteria

#### Parameters

##### criteria

[`ToolSearchCriteria`](../type-aliases/ToolSearchCriteria.md)

#### Returns

[`ToolSearchResult`](../type-aliases/ToolSearchResult.md)

---

### getToolsBySafetyLevel()

> **getToolsBySafetyLevel**(`level`): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Get tools by safety level

#### Parameters

##### level

`"safe"` \| `"moderate"` \| `"dangerous"`

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getToolsRequiringConfirmation()

> **getToolsRequiringConfirmation**(): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Get tools requiring confirmation

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getReadOnlyTools()

> **getReadOnlyTools**(): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Get read-only tools

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getUnifiedTools()

> **getUnifiedTools**(): [`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

Get unified tools from all servers

#### Returns

[`UnifiedTool`](../type-aliases/UnifiedTool.md)[]

---

### registerServer()

> **registerServer**(`server`): `void`

Register a server with the multi-server manager

#### Parameters

##### server

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

#### Returns

`void`

---

### updateToolAnnotations()

> **updateToolAnnotations**(`serverId`, `toolName`, `annotations`): `boolean`

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

Get all tools

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### getServerTools()

> **getServerTools**(`serverId`): [`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

Get tools for a server

#### Parameters

##### serverId

`string`

#### Returns

[`EnhancedToolInfo`](../type-aliases/EnhancedToolInfo.md)[]

---

### clearServerTools()

> **clearServerTools**(`serverId`): `void`

Clear tools for a server

#### Parameters

##### serverId

`string`

#### Returns

`void`

---

### getStatistics()

> **getStatistics**(): `object`

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
