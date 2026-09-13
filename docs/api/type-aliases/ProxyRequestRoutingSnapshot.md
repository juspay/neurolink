[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3219)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3220)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3221)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3222)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3223)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3224)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3225)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3226)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3227)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3228)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3231)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
