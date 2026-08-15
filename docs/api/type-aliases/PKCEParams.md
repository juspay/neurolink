[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PKCEParams

# Type Alias: PKCEParams

> **PKCEParams** = `object`

Defined in: [types/subscription.ts:1028](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L1028)

PKCE (Proof Key for Code Exchange) parameters

## Properties

### codeVerifier

> **codeVerifier**: `string`

Defined in: [types/subscription.ts:1030](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L1030)

Code verifier - random string used to generate challenge

---

### codeChallenge

> **codeChallenge**: `string`

Defined in: [types/subscription.ts:1032](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L1032)

Code challenge - SHA-256 hash of verifier, base64url encoded

---

### codeChallengeMethod

> **codeChallengeMethod**: `"S256"`

Defined in: [types/subscription.ts:1034](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L1034)

Code challenge method - always "S256"
