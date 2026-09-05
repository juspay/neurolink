[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEParams

# Type Alias: PKCEParams

> **PKCEParams** = `object`

Defined in: [types/subscription.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1029)

PKCE (Proof Key for Code Exchange) parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/subscription.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1031)

Code verifier - random string used to generate challenge

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/subscription.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1033)

Code challenge - SHA-256 hash of verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/subscription.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1035)

Code challenge method - always "S256"
