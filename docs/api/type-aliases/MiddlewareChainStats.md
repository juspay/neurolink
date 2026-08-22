[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareChainStats

# Type Alias: MiddlewareChainStats

> **MiddlewareChainStats** = `object`

Defined in: [types/middleware.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L141)

Middleware chain execution statistics

## Properties

### totalMiddleware

> **totalMiddleware**: `number`

Defined in: [types/middleware.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L143)

Total number of middleware in the chain

---

### appliedMiddleware

> **appliedMiddleware**: `number`

Defined in: [types/middleware.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L145)

Number of middleware that were applied

---

### totalExecutionTime

> **totalExecutionTime**: `number`

Defined in: [types/middleware.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L147)

Total execution time for the chain

---

### results

> **results**: `Record`\<`string`, [`MiddlewareExecutionResult`](MiddlewareExecutionResult.md)\>

Defined in: [types/middleware.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L149)

Individual middleware execution results
