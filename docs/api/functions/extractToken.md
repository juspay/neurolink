[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / extractToken

# Function: extractToken()

> **extractToken**(`context`, `config?`): `Promise`\<`string` \| `null`\>

Defined in: [auth/middleware/AuthMiddleware.ts:85](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/AuthMiddleware.ts#L85)

Extract token from request context based on configuration

## Parameters

### context

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

### config?

[`TokenExtractionConfig`](../type-aliases/TokenExtractionConfig.md)

## Returns

`Promise`\<`string` \| `null`\>
