[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenResponse

# Type Alias: OAuthTokenResponse

> **OAuthTokenResponse** = `object`

OAuth 2.0 token response from Anthropic (raw API response shape)

## Properties

### access_token

> **access_token**: `string`

The access token for API authentication

---

### token_type

> **token_type**: `string`

Token type (typically "Bearer")

---

### expires_in

> **expires_in**: `number`

Token expiration time in seconds

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Refresh token for obtaining new access tokens

---

### scope?

> `optional` **scope?**: `string`

Granted scopes (space-separated)
