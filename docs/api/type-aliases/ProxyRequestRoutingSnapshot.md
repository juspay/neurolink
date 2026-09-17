[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3346)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3347)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3348)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3349)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3350)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3351)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3352)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3353)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3354)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3355)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3358)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
