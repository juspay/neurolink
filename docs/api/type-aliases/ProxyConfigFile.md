[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfigFile

# Type Alias: ProxyConfigFile

> **ProxyConfigFile** = `object`

Defined in: [types/proxy.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L489)

Top-level proxy configuration structure.

## Properties

### version?

> `optional` **version?**: `number`

Defined in: [types/proxy.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L491)

Configuration schema version

---

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Defined in: [types/proxy.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L493)

Default provider name to apply when not specified per-account

---

### defaultBaseUrl?

> `optional` **defaultBaseUrl?**: `string`

Defined in: [types/proxy.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L495)

Default base URL applied to accounts that omit baseUrl

---

### accounts

> **accounts**: `Record`\<`string`, [`ProxyAccountConfig`](ProxyAccountConfig.md)[]\>

Defined in: [types/proxy.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L497)

Map of provider names to their account lists

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/proxy.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L499)

Routing configuration (strategy, model mappings, fallback chain)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/proxy.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L501)

Cloaking plugin configuration
