[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredOAuthTokens

# Type Alias: StoredOAuthTokens

> **StoredOAuthTokens** = `object`

OAuth tokens structure for storage.
Stricter version of OAuthTokens with required fields for persistent storage.

## Properties

### accessToken

> **accessToken**: `string`

The access token for API authentication

---

### refreshToken?

> `optional` **refreshToken?**: `string`

The refresh token for obtaining new access tokens (optional for some OAuth flows)

---

### expiresAt

> **expiresAt**: `number`

Unix timestamp (ms) when the access token expires

---

### tokenType

> **tokenType**: `string`

Token type, typically "Bearer"

---

### scope?

> `optional` **scope?**: `string`

Optional OAuth scopes granted
