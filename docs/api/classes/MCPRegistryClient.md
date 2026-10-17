[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPRegistryClient

# Class: MCPRegistryClient

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

// Opt in to the official MCP Registry (remote entries are never `verified`)
const remote = new MCPRegistryClient({ remoteLookup: true });
const found = await remote.getEntry("io.github.example/my-server");
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPRegistryClient**(`config?`): `MCPRegistryClient`

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

Search the registry

#### Parameters

##### options?

[`RegistrySearchOptions`](../type-aliases/RegistrySearchOptions.md) = `{}`

#### Returns

`Promise`\<[`RegistrySearchResult`](../type-aliases/RegistrySearchResult.md)\>

---

### getEntry()

> **getEntry**(`id`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md) \| `undefined`\>

Get a specific entry by ID.

Checks custom entries, then the built-in catalog. Only when remote
lookup is enabled does a miss fall through to the configured registries
(first hit wins); a registry that fails or answers with something
unreadable is skipped, so the result is `undefined` rather than an error.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md) \| `undefined`\>

---

### getAllEntries()

> **getAllEntries**(): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Get all available entries.

Lists the built-in catalog, then the custom entries (a custom entry
replaces a built-in one with the same id), then, when remote lookup is
enabled, the servers of each configured registry. A remote entry never
replaces a local one. A registry that cannot be read contributes nothing.

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getByCategory()

> **getByCategory**(`category`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Get entries by category

#### Parameters

##### category

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getByTag()

> **getByTag**(`tag`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Get entries by tag

#### Parameters

##### tag

`string`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getCategories()

> **getCategories**(): `Promise`\<`string`[]\>

Get all categories

#### Returns

`Promise`\<`string`[]\>

---

### getTags()

> **getTags**(): `Promise`\<`string`[]\>

Get all tags

#### Returns

`Promise`\<`string`[]\>

---

### toServerInfo()

> **toServerInfo**(`entry`): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Convert registry entry to MCPServerInfo

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

---

### addCustomEntry()

> **addCustomEntry**(`entry`): `void`

Add a custom registry entry

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

`void`

---

### removeCustomEntry()

> **removeCustomEntry**(`id`): `boolean`

Remove a custom registry entry

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### addRegistry()

> **addRegistry**(`config`): `void`

Add a registry configuration

#### Parameters

##### config

[`RegistryConfig`](../type-aliases/RegistryConfig.md)

#### Returns

`void`

---

### setRemoteLookup()

> **setRemoteLookup**(`enabled`): `void`

Turn remote lookup on or off at runtime, e.g. on the client returned by
`NeuroLink.getMCPRegistryClient()`. Off is the default. Clears the cache
so the next lookup reflects the new setting.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

---

### clearCache()

> **clearCache**(): `void`

Clear the cache

#### Returns

`void`

---

### checkRequiredEnvVars()

> **checkRequiredEnvVars**(`entry`): `object`

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

Get installation command for an entry

#### Parameters

##### entry

[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)

#### Returns

`string` \| `undefined`

---

### getPopularServers()

> **getPopularServers**(`limit?`): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Get popular servers

#### Parameters

##### limit?

`number` = `10`

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getVerifiedServers()

> **getVerifiedServers**(): `Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

Get verified servers

#### Returns

`Promise`\<[`McpRegistryEntry`](../type-aliases/McpRegistryEntry.md)[]\>

---

### getStatistics()

> **getStatistics**(): `Promise`\<\{ `totalEntries`: `number`; `verifiedEntries`: `number`; `categories`: `number`; `tags`: `number`; `customEntries`: `number`; \}\>

Get statistics

#### Returns

`Promise`\<\{ `totalEntries`: `number`; `verifiedEntries`: `number`; `categories`: `number`; `tags`: `number`; `customEntries`: `number`; \}\>
