[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTConfig

# Type Alias: JWTConfig

> **JWTConfig** = `object`

JWT provider configuration

## Properties

### secret?

> `optional` **secret?**: `string`

JWT secret for HMAC algorithms

---

### publicKey?

> `optional` **publicKey?**: `string`

Public key for RSA/EC algorithms

---

### algorithms?

> `optional` **algorithms?**: `string`[]

Supported algorithms

---

### issuer?

> `optional` **issuer?**: `string`

Token issuer

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Token audience
