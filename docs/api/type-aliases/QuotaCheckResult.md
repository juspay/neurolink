[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuotaCheckResult

# Type Alias: QuotaCheckResult

> **QuotaCheckResult** = `object`

Quota check result for determining if an operation can proceed

## Description

Result of checking whether quota allows an operation

## Properties

### allowed

> **allowed**: `boolean`

Whether the operation is allowed within quota

---

### reason?

> `optional` **reason?**: `string`

Reason if operation is not allowed

---

### estimatedTokens?

> `optional` **estimatedTokens?**: `number`

Estimated tokens required for the operation

---

### tokensRemainingAfter?

> `optional` **tokensRemainingAfter?**: `number`

Tokens remaining after operation (if allowed)

---

### suggestedWaitMs?

> `optional` **suggestedWaitMs?**: `number`

Suggested wait time in ms if rate limited
