[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetLease

# Type Alias: ProxyTokenBudgetLease

> **ProxyTokenBudgetLease** = `object`

Defined in: [types/proxyBudget.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L38)

## Properties

### leaseId

> **leaseId**: `string`

Defined in: [types/proxyBudget.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L39)

---

### snapshot

> **snapshot**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxyBudget.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L40)

---

### settle

> **settle**: (`actualTotalTokens?`) => `Promise`\<`void`\>

Defined in: [types/proxyBudget.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L41)

#### Parameters

##### actualTotalTokens?

`number`

#### Returns

`Promise`\<`void`\>

---

### cancelBeforeDispatch

> **cancelBeforeDispatch**: () => `Promise`\<`void`\>

Defined in: [types/proxyBudget.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L42)

#### Returns

`Promise`\<`void`\>
