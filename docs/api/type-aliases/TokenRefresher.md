[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefresher

# Type Alias: TokenRefresher

> **TokenRefresher** = (`refreshToken`) => `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>

Defined in: [types/auth.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L53)

Token refresher function type.
Takes a refresh token and returns new tokens.

## Parameters

### refreshToken

`string`

## Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>
