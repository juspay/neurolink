[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfigFile

# Type Alias: ProxyConfigFile

> **ProxyConfigFile** = `object`

Defined in: [types/proxy.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L521)

Top-level proxy configuration structure.

## Properties

### version?

> `optional` **version?**: `number`

Defined in: [types/proxy.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L523)

Configuration schema version

---

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Defined in: [types/proxy.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L525)

Default provider name to apply when not specified per-account

---

### defaultBaseUrl?

> `optional` **defaultBaseUrl?**: `string`

Defined in: [types/proxy.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L527)

Default base URL applied to accounts that omit baseUrl

---

### accounts

> **accounts**: `Record`\<`string`, [`ProxyAccountConfig`](ProxyAccountConfig.md)[]\>

Defined in: [types/proxy.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L529)

Map of provider names to their account lists

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/proxy.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L531)

Routing configuration (strategy, model mappings, fallback chain)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/proxy.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L533)

Cloaking plugin configuration
