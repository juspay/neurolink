[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistryConfig

# Type Alias: RegistryConfig

> **RegistryConfig** = `object`

Registry configuration

## Properties

### type

> **type**: [`RegistrySourceType`](RegistrySourceType.md)

Registry type

---

### url?

> `optional` **url?**: `string`

Base URL of the registry. `official` defaults to
`https://registry.modelcontextprotocol.io`; `custom` requires it. The
client appends `/v0.1/servers`, so pass the origin (a trailing `/v0.1`
is accepted too). Only `http:` and `https:` URLs without embedded
credentials are used.

---

### authToken?

> `optional` **authToken?**: `string`

Bearer token sent as `Authorization: Bearer <token>` to this registry
only. It is never emitted in events or logs. A registry with a token is
queried only over `https:` or on a loopback host (`localhost`,
`127.0.0.0/8`, `[::1]`); a plain `http:` URL to any other host is skipped
so the token never crosses the network in clear.

---

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds. Overrides the client-wide `timeout`
for this registry.

---

### enableCache?

> `optional` **enableCache?**: `boolean`

Set to `false` to turn off caching of this registry's responses. It
cannot override a client-wide `enableCache: false`, which turns caching
off for every registry.

---

### cacheTTL?

> `optional` **cacheTTL?**: `number`

Cache TTL in milliseconds for this registry's responses. Falls back to
the client-wide `defaultCacheTTL`.

---

### maxPages?

> `optional` **maxPages?**: `number`

Maximum number of list pages (100 servers each) fetched when this
registry is merged into `search()` / `getAllEntries()`. Defaults to 5.
