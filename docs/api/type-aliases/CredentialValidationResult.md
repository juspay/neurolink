[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

---

### credentialSource

> **credentialSource**: `string`

---

### region

> **region**: `string`

---

### hasExpiration

> **hasExpiration**: `boolean`

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

---

### error?

> `optional` **error?**: `string`

---

### debugInfo

> **debugInfo**: `object`

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
