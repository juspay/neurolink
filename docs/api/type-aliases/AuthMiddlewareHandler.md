[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareHandler

# Type Alias: AuthMiddlewareHandler\<TContext\>

> **AuthMiddlewareHandler**\<`TContext`\> = (`context`) => `Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>

Defined in: [types/auth.ts:1313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1313)

Middleware handler function type for the auth layer.

## Type Parameters

### TContext

`TContext` = [`AuthRequestContext`](AuthRequestContext.md)

## Parameters

### context

`TContext`

## Returns

`Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>
