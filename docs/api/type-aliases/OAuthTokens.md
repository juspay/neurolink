[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokens

# Type Alias: OAuthTokens

> **OAuthTokens** = `object`

Defined in: [types/auth.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L36)

OAuth tokens structure (relaxed version for general use).
Use StoredOAuthTokens when persisting (stricter — expiresAt and tokenType required).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L38)

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L40)

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/auth.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L42)

Token expiration timestamp (Unix epoch)

---

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [types/auth.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L44)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/auth.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L46)

OAuth scope granted
