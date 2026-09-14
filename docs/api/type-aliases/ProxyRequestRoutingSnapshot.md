[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3328)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3329)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3330)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3331)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3332)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3333)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3334)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3335)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3336)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3337)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3340)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
