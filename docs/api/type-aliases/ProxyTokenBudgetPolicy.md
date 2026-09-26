[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTokenBudgetPolicy

# Type Alias: ProxyTokenBudgetPolicy

> **ProxyTokenBudgetPolicy** = `object`

Operator-configured proxy token caps. All caps are optional and disabled by default.

## Properties

### maxInFlightTokens?

> `optional` **maxInFlightTokens?**: `number`

Per-provider/account estimated outstanding input plus maximum output.

---

### accountWindowTokens?

> `optional` **accountWindowTokens?**: `number`

Charged tokens in the account's fixed window, including outstanding reservations.

---

### sessionWindowTokens?

> `optional` **sessionWindowTokens?**: `number`

Charged tokens across providers/accounts sharing the same client session.

---

### windowMs?

> `optional` **windowMs?**: `number`
