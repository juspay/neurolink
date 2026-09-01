[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenResponse

# Type Alias: TokenResponse

> **TokenResponse** = `object`

Defined in: [types/mcp.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1012)

Token response from OAuth server
Standard OAuth 2.0/2.1 token endpoint response structure
Used internally by NeuroLinkOAuthProvider for token exchange and refresh

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/mcp.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1014)

Access token for API authentication

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/mcp.ts:1016](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1016)

Refresh token for obtaining new access tokens (optional)

---

### expires_in?

> `optional` **expires_in?**: `number`

Defined in: [types/mcp.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1018)

Token lifetime in seconds (optional)

---

### token_type

> **token_type**: `string`

Defined in: [types/mcp.ts:1020](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1020)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:1022](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1022)

OAuth scope granted (optional, space-separated)
