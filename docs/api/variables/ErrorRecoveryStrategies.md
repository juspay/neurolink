[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorRecoveryStrategies

# Variable: ErrorRecoveryStrategies

> `const` **ErrorRecoveryStrategies**: `Record`\<[`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md), \{ `strategy`: `"retry"` \| `"exponentialBackoff"` \| `"circuitBreak"` \| `"fail"`; `maxRetries`: `number`; `baseDelayMs`: `number`; \}\>

Defined in: [server/errors.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/server/errors.ts#L549)

Error recovery strategies
