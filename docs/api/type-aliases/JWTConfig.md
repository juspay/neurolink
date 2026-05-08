[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTConfig

# Type Alias: JWTConfig

> **JWTConfig** = `object`

Defined in: [types/auth.ts:781](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L781)

JWT provider configuration

## Properties

### secret?

> `optional` **secret?**: `string`

Defined in: [types/auth.ts:783](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L783)

JWT secret for HMAC algorithms

---

### publicKey?

> `optional` **publicKey?**: `string`

Defined in: [types/auth.ts:785](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L785)

Public key for RSA/EC algorithms

---

### algorithms?

> `optional` **algorithms?**: `string`[]

Defined in: [types/auth.ts:787](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L787)

Supported algorithms

---

### issuer?

> `optional` **issuer?**: `string`

Defined in: [types/auth.ts:789](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L789)

Token issuer

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Defined in: [types/auth.ts:791](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L791)

Token audience
