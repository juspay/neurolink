[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3367)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3368)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3369)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3370)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3371)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3372)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3373)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3374)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3375)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3376)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3379)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
