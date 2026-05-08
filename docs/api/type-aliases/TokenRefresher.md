[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefresher

# Type Alias: TokenRefresher

> **TokenRefresher** = (`refreshToken`) => `Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>

Defined in: [types/auth.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L53)

Token refresher function type.
Takes a refresh token and returns new tokens.

## Parameters

### refreshToken

`string`

## Returns

`Promise`\<[`StoredOAuthTokens`](StoredOAuthTokens.md)\>
