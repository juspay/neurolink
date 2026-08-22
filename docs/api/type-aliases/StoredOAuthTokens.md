[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredOAuthTokens

# Type Alias: StoredOAuthTokens

> **StoredOAuthTokens** = `object`

Defined in: [types/auth.ts:19](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L19)

OAuth tokens structure for storage.
Stricter version of OAuthTokens with required fields for persistent storage.

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L21)

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:23](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L23)

The refresh token for obtaining new access tokens (optional for some OAuth flows)

---

### expiresAt

> **expiresAt**: `number`

Defined in: [types/auth.ts:25](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L25)

Unix timestamp (ms) when the access token expires

---

### tokenType

> **tokenType**: `string`

Defined in: [types/auth.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L27)

Token type, typically "Bearer"

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/auth.ts:29](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L29)

Optional OAuth scopes granted
