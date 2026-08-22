[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfigFile

# Type Alias: ProxyConfigFile

> **ProxyConfigFile** = `object`

Defined in: [types/proxy.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L483)

Top-level proxy configuration structure.

## Properties

### version?

> `optional` **version?**: `number`

Defined in: [types/proxy.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L485)

Configuration schema version

---

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Defined in: [types/proxy.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L487)

Default provider name to apply when not specified per-account

---

### defaultBaseUrl?

> `optional` **defaultBaseUrl?**: `string`

Defined in: [types/proxy.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L489)

Default base URL applied to accounts that omit baseUrl

---

### accounts

> **accounts**: `Record`\<`string`, [`ProxyAccountConfig`](ProxyAccountConfig.md)[]\>

Defined in: [types/proxy.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L491)

Map of provider names to their account lists

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/proxy.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L493)

Routing configuration (strategy, model mappings, fallback chain)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/proxy.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L495)

Cloaking plugin configuration
