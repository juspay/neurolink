[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenClaims

# Type Alias: TokenClaims

> **TokenClaims** = `object`

Token claims extracted from JWT

## Indexable

> \[`key`: `string`\]: [`JsonValue`](JsonValue.md) \| `undefined`

Custom claims

## Properties

### sub?

> `optional` **sub?**: `string`

Subject (user ID)

---

### iss?

> `optional` **iss?**: `string`

Issuer

---

### aud?

> `optional` **aud?**: `string` \| `string`[]

Audience

---

### exp?

> `optional` **exp?**: `number`

Expiration time

---

### iat?

> `optional` **iat?**: `number`

Issued at

---

### nbf?

> `optional` **nbf?**: `number`

Not before

---

### jti?

> `optional` **jti?**: `string`

JWT ID

---

### email?

> `optional` **email?**: `string`

Email

---

### email_verified?

> `optional` **email_verified?**: `boolean`

Email verified

---

### name?

> `optional` **name?**: `string`

Name

---

### picture?

> `optional` **picture?**: `string`

Picture
