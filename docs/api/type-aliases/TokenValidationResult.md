[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenValidationResult

# Type Alias: TokenValidationResult

> **TokenValidationResult** = `object`

Token validation result

## Properties

### valid

> **valid**: `boolean`

Whether the token is valid

---

### payload?

> `optional` **payload?**: [`UnknownRecord`](UnknownRecord.md)

Decoded token payload

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

Associated user if token is valid

---

### claims?

> `optional` **claims?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Decoded token claims

---

### error?

> `optional` **error?**: `string`

Error message if invalid

---

### errorCode?

> `optional` **errorCode?**: [`AuthErrorCode`](AuthErrorCode.md)

Error code for programmatic handling

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Token expiration time

---

### tokenType?

> `optional` **tokenType?**: [`TokenType`](TokenType.md)

Token type

---

### issuer?

> `optional` **issuer?**: `string`

Token issuer

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Token audience
