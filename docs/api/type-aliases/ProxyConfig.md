[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfig

# Type Alias: ProxyConfig

> **ProxyConfig** = `object`

Defined in: [types/subscription.ts:1259](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1259)

Full proxy config (loaded from YAML)

## Properties

### host?

> `optional` **host?**: `string`

Defined in: [types/subscription.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1260)

---

### port?

> `optional` **port?**: `number`

Defined in: [types/subscription.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1261)

---

### auth?

> `optional` **auth?**: `"none"` \| `"api-key"`

Defined in: [types/subscription.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1262)

---

### proxyApiKey?

> `optional` **proxyApiKey?**: `string`

Defined in: [types/subscription.ts:1263](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1263)

---

### accounts?

> `optional` **accounts?**: `Record`\<`string`, `object`[]\>

Defined in: [types/subscription.ts:1265](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1265)

Provider-keyed account map matching the YAML structure (e.g. accounts.anthropic[0])

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/subscription.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1278)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/subscription.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1279)
