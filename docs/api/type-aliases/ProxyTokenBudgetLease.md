[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetLease

# Type Alias: ProxyTokenBudgetLease

> **ProxyTokenBudgetLease** = `object`

## Properties

### leaseId

> **leaseId**: `string`

---

### snapshot

> **snapshot**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

---

### settle

> **settle**: (`actualTotalTokens?`) => `Promise`\<`void`\>

#### Parameters

##### actualTotalTokens?

`number`

#### Returns

`Promise`\<`void`\>

---

### cancelBeforeDispatch

> **cancelBeforeDispatch**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
