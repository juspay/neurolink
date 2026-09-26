[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

---

### passthrough

> **passthrough**: `boolean`

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.

---

### accountRanking

> **accountRanking**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

---

### preferPrimary

> **preferPrimary**: `boolean`

---

### sessionAffinity

> **sessionAffinity**: `boolean`

---

### sessionAffinityIdleTtlMs

> **sessionAffinityIdleTtlMs**: `number`

---

### spillInflight

> **spillInflight**: `number`
