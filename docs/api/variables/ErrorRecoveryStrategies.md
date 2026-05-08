[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorRecoveryStrategies

# Variable: ErrorRecoveryStrategies

> `const` **ErrorRecoveryStrategies**: `Record`\<[`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md), \{ `strategy`: `"retry"` \| `"exponentialBackoff"` \| `"circuitBreak"` \| `"fail"`; `maxRetries`: `number`; `baseDelayMs`: `number`; \}\>

Defined in: [server/errors.ts:549](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L549)

Error recovery strategies
