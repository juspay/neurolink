[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetRpcRequest

# Type Alias: ProxyTokenBudgetRpcRequest

> **ProxyTokenBudgetRpcRequest** = `object`

Defined in: [types/proxyBudget.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L61)

## Properties

### type

> **type**: `"proxy-budget:request"`

Defined in: [types/proxyBudget.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L62)

---

### rpcId

> **rpcId**: `string`

Defined in: [types/proxyBudget.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L63)

---

### pid

> **pid**: `number`

Defined in: [types/proxyBudget.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L64)

---

### generation

> **generation**: `number`

Defined in: [types/proxyBudget.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L65)

---

### action

> **action**: `"reserve"` \| `"settle"` \| `"cancel"`

Defined in: [types/proxyBudget.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L66)

---

### reservation?

> `optional` **reservation?**: [`ProxyTokenBudgetReservation`](ProxyTokenBudgetReservation.md)

Defined in: [types/proxyBudget.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L67)

---

### leaseId?

> `optional` **leaseId?**: `string`

Defined in: [types/proxyBudget.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L68)

---

### actualTotalTokens?

> `optional` **actualTotalTokens?**: `number`

Defined in: [types/proxyBudget.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L69)
