[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorRecoveryStrategies

# Variable: ErrorRecoveryStrategies

> `const` **ErrorRecoveryStrategies**: `Record`\<[`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md), \{ `strategy`: `"retry"` \| `"exponentialBackoff"` \| `"circuitBreak"` \| `"fail"`; `maxRetries`: `number`; `baseDelayMs`: `number`; \}\>

Defined in: [server/errors.ts:549](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/errors.ts#L549)

Error recovery strategies
