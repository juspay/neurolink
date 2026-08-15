[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTConfig

# Type Alias: JWTConfig

> **JWTConfig** = `object`

Defined in: [types/auth.ts:781](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L781)

JWT provider configuration

## Properties

### secret?

> `optional` **secret?**: `string`

Defined in: [types/auth.ts:783](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L783)

JWT secret for HMAC algorithms

---

### publicKey?

> `optional` **publicKey?**: `string`

Defined in: [types/auth.ts:785](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L785)

Public key for RSA/EC algorithms

---

### algorithms?

> `optional` **algorithms?**: `string`[]

Defined in: [types/auth.ts:787](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L787)

Supported algorithms

---

### issuer?

> `optional` **issuer?**: `string`

Defined in: [types/auth.ts:789](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L789)

Token issuer

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Defined in: [types/auth.ts:791](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L791)

Token audience
