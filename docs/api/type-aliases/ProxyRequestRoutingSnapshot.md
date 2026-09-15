[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3342)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3344)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3345)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3346)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3347)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3348)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3349)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3350)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3351)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3354)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
