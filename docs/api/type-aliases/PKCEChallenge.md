[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEChallenge

# Type Alias: PKCEChallenge

> **PKCEChallenge** = `object`

Defined in: [types/mcp.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1000)

PKCE (Proof Key for Code Exchange) challenge data for OAuth 2.1 authentication
Used internally by OAuth client providers to generate and store PKCE parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/mcp.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1002)

Random code verifier string (43-128 characters, URL-safe)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/mcp.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1004)

SHA-256 hash of code verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/mcp.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1006)

Challenge method - always "S256" per OAuth 2.1 specification
