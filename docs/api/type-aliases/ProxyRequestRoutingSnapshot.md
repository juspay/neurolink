[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3007)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3008)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3009)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3010)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3011)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3012)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3013)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3014)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3015)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3016)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3019)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
