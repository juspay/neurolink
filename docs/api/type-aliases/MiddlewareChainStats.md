[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareChainStats

# Type Alias: MiddlewareChainStats

> **MiddlewareChainStats** = `object`

Defined in: [types/middleware.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L111)

Middleware chain execution statistics

## Properties

### totalMiddleware

> **totalMiddleware**: `number`

Defined in: [types/middleware.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L113)

Total number of middleware in the chain

---

### appliedMiddleware

> **appliedMiddleware**: `number`

Defined in: [types/middleware.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L115)

Number of middleware that were applied

---

### totalExecutionTime

> **totalExecutionTime**: `number`

Defined in: [types/middleware.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L117)

Total execution time for the chain

---

### results

> **results**: `Record`\<`string`, [`MiddlewareExecutionResult`](MiddlewareExecutionResult.md)\>

Defined in: [types/middleware.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L119)

Individual middleware execution results
