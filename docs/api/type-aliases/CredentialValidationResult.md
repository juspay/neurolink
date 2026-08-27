[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L324)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L325)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L326)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L327)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L328)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L329)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L330)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L331)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
