[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuotaCheckResult

# Type Alias: QuotaCheckResult

> **QuotaCheckResult** = `object`

Defined in: [types/subscription.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L656)

Quota check result for determining if an operation can proceed

## Description

Result of checking whether quota allows an operation

## Properties

### allowed

> **allowed**: `boolean`

Defined in: [types/subscription.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L658)

Whether the operation is allowed within quota

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/subscription.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L660)

Reason if operation is not allowed

---

### estimatedTokens?

> `optional` **estimatedTokens?**: `number`

Defined in: [types/subscription.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L662)

Estimated tokens required for the operation

---

### tokensRemainingAfter?

> `optional` **tokensRemainingAfter?**: `number`

Defined in: [types/subscription.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L664)

Tokens remaining after operation (if allowed)

---

### suggestedWaitMs?

> `optional` **suggestedWaitMs?**: `number`

Defined in: [types/subscription.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L666)

Suggested wait time in ms if rate limited
