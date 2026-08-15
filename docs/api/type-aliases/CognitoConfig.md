[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CognitoConfig

# Type Alias: CognitoConfig

> **CognitoConfig** = `object`

Defined in: [types/auth.ts:725](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L725)

AWS Cognito provider configuration

## Properties

### userPoolId

> **userPoolId**: `string`

Defined in: [types/auth.ts:727](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L727)

Cognito user pool ID

---

### clientId

> **clientId**: `string`

Defined in: [types/auth.ts:729](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L729)

Cognito client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/auth.ts:731](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L731)

Cognito client secret

---

### region

> **region**: `string`

Defined in: [types/auth.ts:733](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L733)

AWS region

---

### customAttributes?

> `optional` **customAttributes?**: `string`[]

Defined in: [types/auth.ts:735](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L735)

Custom attributes to extract as claims
