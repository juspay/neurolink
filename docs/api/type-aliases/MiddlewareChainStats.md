[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareChainStats

# Type Alias: MiddlewareChainStats

> **MiddlewareChainStats** = `object`

Defined in: [types/middleware.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L135)

Middleware chain execution statistics

## Properties

### totalMiddleware

> **totalMiddleware**: `number`

Defined in: [types/middleware.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L137)

Total number of middleware in the chain

---

### appliedMiddleware

> **appliedMiddleware**: `number`

Defined in: [types/middleware.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L139)

Number of middleware that were applied

---

### totalExecutionTime

> **totalExecutionTime**: `number`

Defined in: [types/middleware.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L141)

Total execution time for the chain

---

### results

> **results**: `Record`\<`string`, [`MiddlewareExecutionResult`](MiddlewareExecutionResult.md)\>

Defined in: [types/middleware.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L143)

Individual middleware execution results
