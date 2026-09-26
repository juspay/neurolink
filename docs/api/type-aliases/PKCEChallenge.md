[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEChallenge

# Type Alias: PKCEChallenge

> **PKCEChallenge** = `object`

PKCE (Proof Key for Code Exchange) challenge data for OAuth 2.1 authentication
Used internally by OAuth client providers to generate and store PKCE parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Random code verifier string (43-128 characters, URL-safe)

---

### codeChallenge

> **codeChallenge**: `string`

SHA-256 hash of code verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Challenge method - always "S256" per OAuth 2.1 specification
