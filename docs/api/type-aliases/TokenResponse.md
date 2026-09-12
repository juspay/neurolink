[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenResponse

# Type Alias: TokenResponse

> **TokenResponse** = `object`

Defined in: [types/mcp.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1031)

Token response from OAuth server
Standard OAuth 2.0/2.1 token endpoint response structure
Used internally by NeuroLinkOAuthProvider for token exchange and refresh

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/mcp.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1033)

Access token for API authentication

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/mcp.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1035)

Refresh token for obtaining new access tokens (optional)

---

### expires_in?

> `optional` **expires_in?**: `number`

Defined in: [types/mcp.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1037)

Token lifetime in seconds (optional)

---

### token_type

> **token_type**: `string`

Defined in: [types/mcp.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1039)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1041)

OAuth scope granted (optional, space-separated)
