[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareHandler

# Type Alias: AuthMiddlewareHandler\<TContext\>

> **AuthMiddlewareHandler**\<`TContext`\> = (`context`) => `Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>

Defined in: [types/auth.ts:1313](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L1313)

Middleware handler function type for the auth layer.

## Type Parameters

### TContext

`TContext` = [`AuthRequestContext`](AuthRequestContext.md)

## Parameters

### context

`TContext`

## Returns

`Promise`\<[`AuthMiddlewareResult`](AuthMiddlewareResult.md)\>
