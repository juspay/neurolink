[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3684)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3685)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3686)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3687)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3688)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3689)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3690)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3691)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3692)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3693)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3696)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.

---

### accountRanking

> **accountRanking**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Defined in: [types/proxy.ts:3697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3697)

---

### preferPrimary

> **preferPrimary**: `boolean`

Defined in: [types/proxy.ts:3698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3698)

---

### sessionAffinity

> **sessionAffinity**: `boolean`

Defined in: [types/proxy.ts:3699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3699)

---

### sessionAffinityIdleTtlMs

> **sessionAffinityIdleTtlMs**: `number`

Defined in: [types/proxy.ts:3700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3700)

---

### spillInflight

> **spillInflight**: `number`

Defined in: [types/proxy.ts:3701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3701)
