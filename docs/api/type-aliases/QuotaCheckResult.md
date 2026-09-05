[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuotaCheckResult

# Type Alias: QuotaCheckResult

> **QuotaCheckResult** = `object`

Defined in: [types/subscription.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L657)

Quota check result for determining if an operation can proceed

## Description

Result of checking whether quota allows an operation

## Properties

### allowed

> **allowed**: `boolean`

Defined in: [types/subscription.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L659)

Whether the operation is allowed within quota

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/subscription.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L661)

Reason if operation is not allowed

---

### estimatedTokens?

> `optional` **estimatedTokens?**: `number`

Defined in: [types/subscription.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L663)

Estimated tokens required for the operation

---

### tokensRemainingAfter?

> `optional` **tokensRemainingAfter?**: `number`

Defined in: [types/subscription.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L665)

Tokens remaining after operation (if allowed)

---

### suggestedWaitMs?

> `optional` **suggestedWaitMs?**: `number`

Defined in: [types/subscription.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L667)

Suggested wait time in ms if rate limited
