[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRoutingPolicySnapshot

# Type Alias: ProxyRoutingPolicySnapshot

> **ProxyRoutingPolicySnapshot** = `object`

Defined in: [types/proxy.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L717)

The five routing.\* values in effect for one request, as reported on the decision.

## Properties

### ranking

> **ranking**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Defined in: [types/proxy.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L718)

---

### preferPrimary

> **preferPrimary**: `boolean`

Defined in: [types/proxy.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L719)

---

### sessionAffinity

> **sessionAffinity**: `boolean`

Defined in: [types/proxy.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L720)

---

### sessionAffinityIdleTtlMs

> **sessionAffinityIdleTtlMs**: `number`

Defined in: [types/proxy.ts:721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L721)

---

### spillInflight

> **spillInflight**: `number`

Defined in: [types/proxy.ts:722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L722)
