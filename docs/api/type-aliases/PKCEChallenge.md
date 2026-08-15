[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEChallenge

# Type Alias: PKCEChallenge

> **PKCEChallenge** = `object`

Defined in: [types/mcp.ts:962](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L962)

PKCE (Proof Key for Code Exchange) challenge data for OAuth 2.1 authentication
Used internally by OAuth client providers to generate and store PKCE parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/mcp.ts:964](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L964)

Random code verifier string (43-128 characters, URL-safe)

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/mcp.ts:966](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L966)

SHA-256 hash of code verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/mcp.ts:968](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L968)

Challenge method - always "S256" per OAuth 2.1 specification
