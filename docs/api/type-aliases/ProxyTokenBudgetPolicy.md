[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetPolicy

# Type Alias: ProxyTokenBudgetPolicy

> **ProxyTokenBudgetPolicy** = `object`

Defined in: [types/proxyBudget.ts:2](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L2)

Operator-configured proxy token caps. All caps are optional and disabled by default.

## Properties

### maxInFlightTokens?

> `optional` **maxInFlightTokens?**: `number`

Defined in: [types/proxyBudget.ts:4](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L4)

Per-provider/account estimated outstanding input plus maximum output.

---

### accountWindowTokens?

> `optional` **accountWindowTokens?**: `number`

Defined in: [types/proxyBudget.ts:6](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L6)

Charged tokens in the account's fixed window, including outstanding reservations.

---

### sessionWindowTokens?

> `optional` **sessionWindowTokens?**: `number`

Defined in: [types/proxyBudget.ts:8](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L8)

Charged tokens across providers/accounts sharing the same client session.

---

### windowMs?

> `optional` **windowMs?**: `number`

Defined in: [types/proxyBudget.ts:9](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyBudget.ts#L9)
