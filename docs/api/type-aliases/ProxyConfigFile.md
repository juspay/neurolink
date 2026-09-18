[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfigFile

# Type Alias: ProxyConfigFile

> **ProxyConfigFile** = `object`

Defined in: [types/proxy.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L490)

Top-level proxy configuration structure.

## Properties

### version?

> `optional` **version?**: `number`

Defined in: [types/proxy.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L492)

Configuration schema version

---

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Defined in: [types/proxy.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L494)

Default provider name to apply when not specified per-account

---

### defaultBaseUrl?

> `optional` **defaultBaseUrl?**: `string`

Defined in: [types/proxy.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L496)

Default base URL applied to accounts that omit baseUrl

---

### accounts

> **accounts**: `Record`\<`string`, [`ProxyAccountConfig`](ProxyAccountConfig.md)[]\>

Defined in: [types/proxy.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L498)

Map of provider names to their account lists

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/proxy.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L500)

Routing configuration (strategy, model mappings, fallback chain)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/proxy.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L502)

Cloaking plugin configuration
