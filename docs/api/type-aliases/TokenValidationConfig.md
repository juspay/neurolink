[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenValidationConfig

# Type Alias: TokenValidationConfig

> **TokenValidationConfig** = `object`

Token validation configuration

## Properties

### issuer?

> `optional` **issuer?**: `string`

Token issuer to validate against

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Token audience to validate against

---

### clockTolerance?

> `optional` **clockTolerance?**: `number`

Clock tolerance in seconds for expiration checks

---

### extractClaims?

> `optional` **extractClaims?**: `string`[]

Custom claims to extract

---

### validateSignature?

> `optional` **validateSignature?**: `boolean`

Whether to validate token signature

---

### jwksUri?

> `optional` **jwksUri?**: `string`

JWKS endpoint for signature verification

---

### jwksCacheDuration?

> `optional` **jwksCacheDuration?**: `number`

Cache JWKS for this duration (ms)
