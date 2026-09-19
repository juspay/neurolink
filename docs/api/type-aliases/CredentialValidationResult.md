[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L352)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L353)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L354)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L355)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:356](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L356)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L357)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L358)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L359)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
