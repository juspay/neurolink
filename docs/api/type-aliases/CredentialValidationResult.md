[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L372)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L373)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L374)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L375)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L376)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L377)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L378)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L379)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
