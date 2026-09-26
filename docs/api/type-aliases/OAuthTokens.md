[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokens

# Type Alias: OAuthTokens

> **OAuthTokens** = `object`

OAuth tokens structure (relaxed version for general use).
Use StoredOAuthTokens when persisting (stricter — expiresAt and tokenType required).

## Properties

### accessToken

> **accessToken**: `string`

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

The refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Token expiration timestamp (Unix epoch)

---

### tokenType?

> `optional` **tokenType?**: `string`

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

OAuth scope granted
