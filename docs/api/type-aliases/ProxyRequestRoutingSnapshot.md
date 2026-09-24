[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3734)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3735)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3736)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3738)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3739)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3740)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3741)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3742)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3743)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.

---

### accountRanking

> **accountRanking**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)

---

### preferPrimary

> **preferPrimary**: `boolean`

Defined in: [types/proxy.ts:3748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3748)

---

### sessionAffinity

> **sessionAffinity**: `boolean`

Defined in: [types/proxy.ts:3749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3749)

---

### sessionAffinityIdleTtlMs

> **sessionAffinityIdleTtlMs**: `number`

Defined in: [types/proxy.ts:3750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3750)

---

### spillInflight

> **spillInflight**: `number`

Defined in: [types/proxy.ts:3751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3751)
