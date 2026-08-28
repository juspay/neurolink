[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L326)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L327)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L328)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L329)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L330)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L331)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L332)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L333)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
