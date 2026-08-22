[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / extractToken

# Function: extractToken()

> **extractToken**(`context`, `config?`): `Promise`\<`string` \| `null`\>

Defined in: [auth/middleware/AuthMiddleware.ts:85](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/middleware/AuthMiddleware.ts#L85)

Extract token from request context based on configuration

## Parameters

### context

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

### config?

[`TokenExtractionConfig`](../type-aliases/TokenExtractionConfig.md)

## Returns

`Promise`\<`string` \| `null`\>
