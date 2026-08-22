[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenResponse

# Type Alias: TokenResponse

> **TokenResponse** = `object`

Defined in: [types/mcp.ts:993](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L993)

Token response from OAuth server
Standard OAuth 2.0/2.1 token endpoint response structure
Used internally by NeuroLinkOAuthProvider for token exchange and refresh

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/mcp.ts:995](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L995)

Access token for API authentication

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/mcp.ts:997](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L997)

Refresh token for obtaining new access tokens (optional)

---

### expires_in?

> `optional` **expires_in?**: `number`

Defined in: [types/mcp.ts:999](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L999)

Token lifetime in seconds (optional)

---

### token_type

> **token_type**: `string`

Defined in: [types/mcp.ts:1001](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1001)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/mcp.ts:1003](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1003)

OAuth scope granted (optional, space-separated)
