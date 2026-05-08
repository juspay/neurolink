[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenClaims

# Type Alias: TokenClaims

> **TokenClaims** = `object`

Defined in: [types/auth.ts:211](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L211)

Token claims extracted from JWT

## Indexable

> \[`key`: `string`\]: [`JsonValue`](JsonValue.md) \| `undefined`

Custom claims

## Properties

### sub?

> `optional` **sub?**: `string`

Defined in: [types/auth.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L213)

Subject (user ID)

---

### iss?

> `optional` **iss?**: `string`

Defined in: [types/auth.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L215)

Issuer

---

### aud?

> `optional` **aud?**: `string` \| `string`[]

Defined in: [types/auth.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L217)

Audience

---

### exp?

> `optional` **exp?**: `number`

Defined in: [types/auth.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L219)

Expiration time

---

### iat?

> `optional` **iat?**: `number`

Defined in: [types/auth.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L221)

Issued at

---

### nbf?

> `optional` **nbf?**: `number`

Defined in: [types/auth.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L223)

Not before

---

### jti?

> `optional` **jti?**: `string`

Defined in: [types/auth.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L225)

JWT ID

---

### email?

> `optional` **email?**: `string`

Defined in: [types/auth.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L227)

Email

---

### email_verified?

> `optional` **email_verified?**: `boolean`

Defined in: [types/auth.ts:229](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L229)

Email verified

---

### name?

> `optional` **name?**: `string`

Defined in: [types/auth.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L231)

Name

---

### picture?

> `optional` **picture?**: `string`

Defined in: [types/auth.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L233)

Picture
