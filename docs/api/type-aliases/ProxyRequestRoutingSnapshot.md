[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3594)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3595)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3596)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3597)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3598)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3599)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3600)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3601)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3602)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3603)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3606)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
