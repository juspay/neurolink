[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L331)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L332)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L333)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L334)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L335)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L336)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L337)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L338)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
