[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEParams

# Type Alias: PKCEParams

> **PKCEParams** = `object`

Defined in: [types/subscription.ts:946](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L946)

PKCE (Proof Key for Code Exchange) parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/subscription.ts:948](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L948)

Code verifier - random string used to generate challenge

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/subscription.ts:950](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L950)

Code challenge - SHA-256 hash of verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/subscription.ts:952](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L952)

Code challenge method - always "S256"
