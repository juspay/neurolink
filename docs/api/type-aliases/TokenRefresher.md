[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefresher

# Type Alias: TokenRefresher

> **TokenRefresher** = (`refreshToken`) => `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>

Defined in: [types/auth.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L53)

Token refresher function type.
Takes a refresh token and returns new tokens.

## Parameters

### refreshToken

`string`

## Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>
