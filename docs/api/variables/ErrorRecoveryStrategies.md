[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorRecoveryStrategies

# Variable: ErrorRecoveryStrategies

> `const` **ErrorRecoveryStrategies**: `Record`\<[`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md), \{ `strategy`: `"retry"` \| `"exponentialBackoff"` \| `"circuitBreak"` \| `"fail"`; `maxRetries`: `number`; `baseDelayMs`: `number`; \}\>

Defined in: [server/errors.ts:549](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/errors.ts#L549)

Error recovery strategies
