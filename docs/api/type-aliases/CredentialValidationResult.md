[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L343)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L344)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L345)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L346)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L347)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L348)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L349)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L350)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
