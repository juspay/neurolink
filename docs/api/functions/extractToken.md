[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / extractToken

# Function: extractToken()

> **extractToken**(`context`, `config?`): `Promise`\<`string` \| `null`\>

Defined in: [auth/middleware/AuthMiddleware.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/AuthMiddleware.ts#L85)

Extract token from request context based on configuration

## Parameters

### context

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

### config?

[`TokenExtractionConfig`](../type-aliases/TokenExtractionConfig.md)

## Returns

`Promise`\<`string` \| `null`\>
