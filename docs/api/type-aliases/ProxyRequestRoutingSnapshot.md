[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3020)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3021)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3022)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3023)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3024)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3025)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3026)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3027)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3028)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3029)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3032)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
