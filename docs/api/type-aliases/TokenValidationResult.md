[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenValidationResult

# Type Alias: TokenValidationResult

> **TokenValidationResult** = `object`

Defined in: [types/auth.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L185)

Token validation result

## Properties

### valid

> **valid**: `boolean`

Defined in: [types/auth.ts:187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L187)

Whether the token is valid

---

### payload?

> `optional` **payload?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/auth.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L189)

Decoded token payload

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

Defined in: [types/auth.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L191)

Associated user if token is valid

---

### claims?

> `optional` **claims?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/auth.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L193)

Decoded token claims

---

### error?

> `optional` **error?**: `string`

Defined in: [types/auth.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L195)

Error message if invalid

---

### errorCode?

> `optional` **errorCode?**: [`AuthErrorCode`](AuthErrorCode.md)

Defined in: [types/auth.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L197)

Error code for programmatic handling

---

### expiresAt?

> `optional` **expiresAt?**: `Date`

Defined in: [types/auth.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L199)

Token expiration time

---

### tokenType?

> `optional` **tokenType?**: [`TokenType`](TokenType.md)

Defined in: [types/auth.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L201)

Token type

---

### issuer?

> `optional` **issuer?**: `string`

Defined in: [types/auth.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L203)

Token issuer

---

### audience?

> `optional` **audience?**: `string` \| `string`[]

Defined in: [types/auth.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L205)

Token audience
