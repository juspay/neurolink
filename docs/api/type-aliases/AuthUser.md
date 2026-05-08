[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUser

# Type Alias: AuthUser

> **AuthUser** = `object`

Defined in: [types/auth.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L119)

User information from authentication

## Properties

### id

> **id**: `string`

Defined in: [types/auth.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L121)

Unique user identifier

---

### email?

> `optional` **email?**: `string`

Defined in: [types/auth.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L123)

User's email address

---

### name?

> `optional` **name?**: `string`

Defined in: [types/auth.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L125)

User's display name

---

### picture?

> `optional` **picture?**: `string`

Defined in: [types/auth.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L127)

Profile picture URL

---

### roles

> **roles**: `string`[]

Defined in: [types/auth.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L129)

User's roles

---

### permissions

> **permissions**: `string`[]

Defined in: [types/auth.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L131)

User's permissions

---

### providerData?

> `optional` **providerData?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/auth.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L133)

Provider-specific user data

---

### metadata?

> `optional` **metadata?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/auth.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L135)

Provider-specific metadata

---

### organizationId?

> `optional` **organizationId?**: `string`

Defined in: [types/auth.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L137)

Organization/tenant ID for multi-tenant apps

---

### emailVerified?

> `optional` **emailVerified?**: `boolean`

Defined in: [types/auth.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L139)

Email verification status

---

### createdAt?

> `optional` **createdAt?**: `Date`

Defined in: [types/auth.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L141)

Account creation timestamp

---

### updatedAt?

> `optional` **updatedAt?**: `Date`

Defined in: [types/auth.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L143)

Last update timestamp

---

### lastLoginAt?

> `optional` **lastLoginAt?**: `Date`

Defined in: [types/auth.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L145)

Last login timestamp
