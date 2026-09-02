[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEChallenge

# Type Alias: PKCEChallenge

> **PKCEChallenge** = `object`

Defined in: [types/mcp.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L981)

PKCE (Proof Key for Code Exchange) challenge data for OAuth 2.1 authentication
Used internally by OAuth client providers to generate and store PKCE parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/mcp.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L983)

Random code verifier string (43-128 characters, URL-safe)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/mcp.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L985)

SHA-256 hash of code verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/mcp.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L987)

Challenge method - always "S256" per OAuth 2.1 specification
