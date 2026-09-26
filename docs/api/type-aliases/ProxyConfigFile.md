[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfigFile

# Type Alias: ProxyConfigFile

> **ProxyConfigFile** = `object`

Top-level proxy configuration structure.

## Properties

### version?

> `optional` **version?**: `number`

Configuration schema version

---

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Default provider name to apply when not specified per-account

---

### defaultBaseUrl?

> `optional` **defaultBaseUrl?**: `string`

Default base URL applied to accounts that omit baseUrl

---

### accounts

> **accounts**: `Record`\<`string`, [`ProxyAccountConfig`](ProxyAccountConfig.md)[]\>

Map of provider names to their account lists

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Routing configuration (strategy, model mappings, fallback chain)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Cloaking plugin configuration
