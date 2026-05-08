[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuotaCheckResult

# Type Alias: QuotaCheckResult

> **QuotaCheckResult** = `object`

Defined in: [types/subscription.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L574)

Quota check result for determining if an operation can proceed

## Description

Result of checking whether quota allows an operation

## Properties

### allowed

> **allowed**: `boolean`

Defined in: [types/subscription.ts:576](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L576)

Whether the operation is allowed within quota

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/subscription.ts:578](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L578)

Reason if operation is not allowed

---

### estimatedTokens?

> `optional` **estimatedTokens?**: `number`

Defined in: [types/subscription.ts:580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L580)

Estimated tokens required for the operation

---

### tokensRemainingAfter?

> `optional` **tokensRemainingAfter?**: `number`

Defined in: [types/subscription.ts:582](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L582)

Tokens remaining after operation (if allowed)

---

### suggestedWaitMs?

> `optional` **suggestedWaitMs?**: `number`

Defined in: [types/subscription.ts:584](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L584)

Suggested wait time in ms if rate limited
