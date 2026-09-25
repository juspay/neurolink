[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfig

# Type Alias: ProxyConfig

> **ProxyConfig** = `object`

Defined in: [types/subscription.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1271)

Full proxy config (loaded from YAML)

## Properties

### host?

> `optional` **host?**: `string`

Defined in: [types/subscription.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1272)

---

### port?

> `optional` **port?**: `number`

Defined in: [types/subscription.ts:1273](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1273)

---

### auth?

> `optional` **auth?**: `"none"` \| `"api-key"`

Defined in: [types/subscription.ts:1274](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1274)

---

### proxyApiKey?

> `optional` **proxyApiKey?**: `string`

Defined in: [types/subscription.ts:1275](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1275)

---

### accounts?

> `optional` **accounts?**: `Record`\<`string`, `object`[]\>

Defined in: [types/subscription.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1277)

Provider-keyed account map matching the YAML structure (e.g. accounts.anthropic[0])

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/subscription.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1290)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/subscription.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1291)
