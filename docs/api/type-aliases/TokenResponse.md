[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenResponse

# Type Alias: TokenResponse

> **TokenResponse** = `object`

Token response from OAuth server
Standard OAuth 2.0/2.1 token endpoint response structure
Used internally by NeuroLinkOAuthProvider for token exchange and refresh

## Properties

### access_token

> **access_token**: `string`

Access token for API authentication

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Refresh token for obtaining new access tokens (optional)

---

### expires_in?

> `optional` **expires_in?**: `number`

Token lifetime in seconds (optional)

---

### token_type

> **token_type**: `string`

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

OAuth scope granted (optional, space-separated)
