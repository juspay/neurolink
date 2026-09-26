[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetRpcRequest

# Type Alias: ProxyTokenBudgetRpcRequest

> **ProxyTokenBudgetRpcRequest** = `object`

## Properties

### type

> **type**: `"proxy-budget:request"`

---

### rpcId

> **rpcId**: `string`

---

### pid

> **pid**: `number`

---

### generation

> **generation**: `number`

---

### action

> **action**: `"reserve"` \| `"settle"` \| `"cancel"`

---

### reservation?

> `optional` **reservation?**: [`ProxyTokenBudgetReservation`](ProxyTokenBudgetReservation.md)

---

### leaseId?

> `optional` **leaseId?**: `string`

---

### actualTotalTokens?

> `optional` **actualTotalTokens?**: `number`
