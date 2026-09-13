[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L333)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L334)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L335)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L336)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L337)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L338)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L339)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L340)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
