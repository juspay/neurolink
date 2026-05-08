[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPRegistryClient

# Class: MCPRegistryClient

Defined in: [mcp/mcpRegistryClient.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L199)

MCP Registry Client

Provides methods to discover and install MCP servers from registries.

## Example

```typescript
const client = new MCPRegistryClient();

// Search for servers
const results = await client.search({ query: "database" });

// Get server details
const entry = await client.getEntry("postgres");

// Convert to MCPServerInfo
const serverInfo = client.toServerInfo(entry);
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPRegistryClient**(`config?`): `MCPRegistryClient`

Defined in: [mcp/mcpRegistryClient.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L204)

#### Parameters

##### config?

[`MCPRegistryClientConfig`](../type-aliases/MCPRegistryClientConfig.md) = `{}`

#### Returns

`MCPRegistryClient`

#### Overrides

`EventEmitter.constructor`

## Methods

### search()

> **search**(`options?`): `Promise`\<[`RegistrySearchResult`](../type-aliases/RegistrySearchResult.md)\>

Defined in: [mcp/mcpRegistryClient.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L221)

Search the registry

#### Parameters

##### options?

[`RegistrySearchOptions`](../type-aliases/RegistrySearchOptions.md) = `{}`

#### Returns

`Promise`\<[`RegistrySearchResult`](../type-aliases/RegistrySearchResult.md)\>

---

### getEntry()

> **getEntry**(`id`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md) \| `undefined`\>

Defined in: [mcp/mcpRegistryClient.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L310)

Get a specific entry by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md) \| `undefined`\>

---

### getAllEntries()

> **getAllEntries**(): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Defined in: [mcp/mcpRegistryClient.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L329)

Get all available entries

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getByCategory()

> **getByCategory**(`category`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Defined in: [mcp/mcpRegistryClient.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L362)

Get entries by category

#### Parameters

##### category

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getByTag()

> **getByTag**(`tag`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Defined in: [mcp/mcpRegistryClient.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L370)

Get entries by tag

#### Parameters

##### tag

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getCategories()

> **getCategories**(): `Promise`\<`string`[]\>

Defined in: [mcp/mcpRegistryClient.ts:378](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L378)

Get all categories

#### Returns

`Promise`\<`string`[]\>

---

### getTags()

> **getTags**(): `Promise`\<`string`[]\>

Defined in: [mcp/mcpRegistryClient.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L394)

Get all tags

#### Returns

`Promise`\<`string`[]\>

---

### toServerInfo()

> **toServerInfo**(`entry`): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Defined in: [mcp/mcpRegistryClient.ts:410](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L410)

Convert registry entry to MCPServerInfo

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

---

### addCustomEntry()

> **addCustomEntry**(`entry`): `void`

Defined in: [mcp/mcpRegistryClient.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L443)

Add a custom registry entry

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

`void`

---

### removeCustomEntry()

> **removeCustomEntry**(`id`): `boolean`

Defined in: [mcp/mcpRegistryClient.ts:452](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L452)

Remove a custom registry entry

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### addRegistry()

> **addRegistry**(`config`): `void`

Defined in: [mcp/mcpRegistryClient.ts:464](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L464)

Add a registry configuration

#### Parameters

##### config

[`RegistryConfig`](../type-aliases/RegistryConfig.md)

#### Returns

`void`

---

### clearCache()

> **clearCache**(): `void`

Defined in: [mcp/mcpRegistryClient.ts:474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L474)

Clear the cache

#### Returns

`void`

---

### checkRequiredEnvVars()

> **checkRequiredEnvVars**(`entry`): `object`

Defined in: [mcp/mcpRegistryClient.ts:482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L482)

Check if required environment variables are set

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

`object`

##### ready

> **ready**: `boolean`

##### missing

> **missing**: `string`[]

---

### getInstallCommand()

> **getInstallCommand**(`entry`): `string` \| `undefined`

Defined in: [mcp/mcpRegistryClient.ts:503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L503)

Get installation command for an entry

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

`string` \| `undefined`

---

### getPopularServers()

> **getPopularServers**(`limit?`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Defined in: [mcp/mcpRegistryClient.ts:518](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L518)

Get popular servers

#### Parameters

##### limit?

`number` = `10`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getVerifiedServers()

> **getVerifiedServers**(): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Defined in: [mcp/mcpRegistryClient.ts:531](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L531)

Get verified servers

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getStatistics()

> **getStatistics**(): `Promise`\<\{ `totalEntries`: `number`; `verifiedEntries`: `number`; `categories`: `number`; `tags`: `number`; `customEntries`: `number`; \}\>

Defined in: [mcp/mcpRegistryClient.ts:542](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpRegistryClient.ts#L542)

Get statistics

#### Returns

`Promise`\<\{ `totalEntries`: `number`; `verifiedEntries`: `number`; `categories`: `number`; `tags`: `number`; `customEntries`: `number`; \}\>
