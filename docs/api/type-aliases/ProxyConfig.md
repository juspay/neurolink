[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfig

# Type Alias: ProxyConfig

> **ProxyConfig** = `object`

Defined in: [types/subscription.ts:1135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1135)

Full proxy config (loaded from YAML)

## Properties

### host?

> `optional` **host?**: `string`

Defined in: [types/subscription.ts:1136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1136)

---

### port?

> `optional` **port?**: `number`

Defined in: [types/subscription.ts:1137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1137)

---

### auth?

> `optional` **auth?**: `"none"` \| `"api-key"`

Defined in: [types/subscription.ts:1138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1138)

---

### proxyApiKey?

> `optional` **proxyApiKey?**: `string`

Defined in: [types/subscription.ts:1139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1139)

---

### accounts?

> `optional` **accounts?**: `Record`\<`string`, `object`[]\>

Defined in: [types/subscription.ts:1141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1141)

Provider-keyed account map matching the YAML structure (e.g. accounts.anthropic[0])

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

Defined in: [types/subscription.ts:1154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1154)

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)

Defined in: [types/subscription.ts:1155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1155)
