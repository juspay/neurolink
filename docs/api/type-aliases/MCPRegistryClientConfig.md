[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPRegistryClientConfig

# Type Alias: MCPRegistryClientConfig

> **MCPRegistryClientConfig** = `object`

Registry client configuration

## Properties

### registries?

> `optional` **registries?**: [`RegistryConfig`](RegistryConfig.md)[]

Registries to consult when `remoteLookup` is on. Only `official` and
`custom` registries are queried; `npm` and `github` entries are accepted
for compatibility but skipped. Defaults to the official MCP Registry.

---

### remoteLookup?

> `optional` **remoteLookup?**: `boolean`

Opt in to remote lookups. Default `false`: the client then reads only
its built-in catalog and custom entries and never touches the network,
whatever `registries` says. When `true`, `getEntry()` falls back to the
configured registries on a local miss and `search()` / `getAllEntries()`
merge their servers after the local ones. Remote entries are always
`verified: false`, and any network or parse failure falls back to the
local result instead of throwing.

---

### enableCache?

> `optional` **enableCache?**: `boolean`

Enable automatic caching. `false` turns it off for the merged list and
for every registry, including one that sets its own `enableCache: true`.

---

### defaultCacheTTL?

> `optional` **defaultCacheTTL?**: `number`

Default cache TTL

---

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds for each remote registry request
(default 10000). A registry's own `timeout` takes precedence.

---

### userAgent?

> `optional` **userAgent?**: `string`

User-Agent header sent on every remote registry request
