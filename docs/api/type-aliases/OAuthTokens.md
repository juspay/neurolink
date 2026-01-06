[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokens

# Type Alias: OAuthTokens

> **OAuthTokens** = `object`

Defined in: [types/mcpTypes.ts:828](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L828)

OAuth tokens structure for MCP HTTP transport authentication

## Properties

### accessToken

> **accessToken**: `string`

Defined in: [types/mcpTypes.ts:830](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L830)

Access token for API authentication

---

### refreshToken?

> `optional` **refreshToken**: `string`

Defined in: [types/mcpTypes.ts:832](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L832)

Refresh token for obtaining new access tokens

---

### expiresAt?

> `optional` **expiresAt**: `number`

Defined in: [types/mcpTypes.ts:834](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L834)

Token expiration timestamp (Unix epoch in milliseconds)

---

### tokenType

> **tokenType**: `string`

Defined in: [types/mcpTypes.ts:836](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L836)

Token type (typically "Bearer")

---

### scope?

> `optional` **scope**: `string`

Defined in: [types/mcpTypes.ts:838](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/mcpTypes.ts#L838)

OAuth scope granted
