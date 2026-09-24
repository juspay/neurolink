[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CredentialValidationResult

# Type Alias: CredentialValidationResult

> **CredentialValidationResult** = `object`

Defined in: [types/providers.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L387)

AWS Credential Validation Result

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/providers.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L388)

---

### credentialSource

> **credentialSource**: `string`

Defined in: [types/providers.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L389)

---

### region

> **region**: `string`

Defined in: [types/providers.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L390)

---

### hasExpiration

> **hasExpiration**: `boolean`

Defined in: [types/providers.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L391)

---

### expirationTime?

> `optional` **expirationTime?**: `Date`

Defined in: [types/providers.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L392)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L393)

---

### debugInfo

> **debugInfo**: `object`

Defined in: [types/providers.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L394)

#### accessKeyId

> **accessKeyId**: `string`

#### hasSessionToken

> **hasSessionToken**: `boolean`

#### providerConfig

> **providerConfig**: `Readonly`\<`Required`\<[`AWSCredentialConfig`](AWSCredentialConfig.md)\>\>
