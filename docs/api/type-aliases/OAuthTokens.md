[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokens

# Type Alias: OAuthTokens

> **OAuthTokens** = `object`

Defined in: [types/auth.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L36)

OAuth tokens structure (relaxed version for general use).
Use StoredOAuthTokens when persisting (stricter — expiresAt and tokenType required).

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/auth.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L38)

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Defined in: [types/auth.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L40)

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/auth.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L42)

Token expiration timestamp (Unix epoch)

---

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [types/auth.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L44)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/auth.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L46)

OAuth scope granted
