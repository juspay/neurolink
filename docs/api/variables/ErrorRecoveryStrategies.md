[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorRecoveryStrategies

# Variable: ErrorRecoveryStrategies

> `const` **ErrorRecoveryStrategies**: `Record`\<[`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md), \{ `strategy`: `"retry"` \| `"exponentialBackoff"` \| `"circuitBreak"` \| `"fail"`; `maxRetries`: `number`; `baseDelayMs`: `number`; \}\>

Error recovery strategies
