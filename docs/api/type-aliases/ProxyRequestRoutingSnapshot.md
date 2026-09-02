[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:2991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2991)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2992)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:2993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2993)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:2994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2994)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2995)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:2996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2996)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:2997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2997)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:2998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2998)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:2999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2999)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3000)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3003)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
