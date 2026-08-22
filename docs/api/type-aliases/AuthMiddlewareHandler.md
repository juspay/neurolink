[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareHandler

# Type Alias: AuthMiddlewareHandler\<TContext\>

> **AuthMiddlewareHandler**\<`TContext`\> = (`context`) => `Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>

Defined in: [types/auth.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1313)

Middleware handler function type for the auth layer.

## Type Parameters

### TContext

`TContext` = [`AuthRequestContext`](AuthRequestContext.md)

## Parameters

### context

`TContext`

## Returns

`Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>
