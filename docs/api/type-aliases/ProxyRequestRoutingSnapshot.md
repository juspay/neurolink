[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3745)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3748)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3749)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3750)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3751)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3752)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3753)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3756)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.

---

### accountRanking

> **accountRanking**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Defined in: [types/proxy.ts:3757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3757)

---

### preferPrimary

> **preferPrimary**: `boolean`

Defined in: [types/proxy.ts:3758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3758)

---

### sessionAffinity

> **sessionAffinity**: `boolean`

Defined in: [types/proxy.ts:3759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3759)

---

### sessionAffinityIdleTtlMs

> **sessionAffinityIdleTtlMs**: `number`

Defined in: [types/proxy.ts:3760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3760)

---

### spillInflight

> **spillInflight**: `number`

Defined in: [types/proxy.ts:3761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3761)
