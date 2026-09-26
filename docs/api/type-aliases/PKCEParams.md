[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEParams

# Type Alias: PKCEParams

> **PKCEParams** = `object`

PKCE (Proof Key for Code Exchange) parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Code verifier - random string used to generate challenge

---

### codeChallenge

> **codeChallenge**: `string`

Code challenge - SHA-256 hash of verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Code challenge method - always "S256"
