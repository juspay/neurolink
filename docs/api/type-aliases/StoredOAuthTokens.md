[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredOAuthTokens

# Type Alias: StoredOAuthTokens

> **StoredOAuthTokens** = `object`

Defined in: [types/auth.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L19)

OAuth tokens structure for storage.
Stricter version of OAuthTokens with required fields for persistent storage.

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L21)

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L23)

The refresh token for obtaining new access tokens (optional for some OAuth flows)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/auth.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L25)

Unix timestamp (ms) when the access token expires

---

### tokenType

> **tokenType**: `string`

Defined in: [types/auth.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L27)

Token type, typically "Bearer"

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/auth.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L29)

Optional OAuth scopes granted
