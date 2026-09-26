[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthFlowTokens

# Type Alias: OAuthFlowTokens

> **OAuthFlowTokens** = `object`

Parsed OAuth tokens from a fresh OAuth flow.
Uses Date for expiresAt (vs number in OAuthTokens for storage).

## Properties

### accessToken

> **accessToken**: `string`

The access token for API authentication

---

### tokenType

> **tokenType**: `string`

Token type (typically "Bearer")

---

### expiresAt

> **expiresAt**: `Date`

Expiration timestamp (Date object)

---

### refreshToken?

> `optional` **refreshToken?**: `string`

Refresh token for obtaining new access tokens

---

### scopes

> **scopes**: `string`[]

Granted scopes as an array
