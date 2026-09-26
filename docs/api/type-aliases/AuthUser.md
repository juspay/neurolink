[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUser

# Type Alias: AuthUser

> **AuthUser** = `object`

User information from authentication

## Properties

### id

> **id**: `string`

Unique user identifier

---

### email?

> `optional` **email?**: `string`

User's email address

---

### name?

> `optional` **name?**: `string`

User's display name

---

### picture?

> `optional` **picture?**: `string`

Profile picture URL

---

### roles

> **roles**: `string`[]

User's roles

---

### permissions

> **permissions**: `string`[]

User's permissions

---

### providerData?

> `optional` **providerData?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Provider-specific user data

---

### metadata?

> `optional` **metadata?**: [`UnknownRecord`](UnknownRecord.md)

Provider-specific metadata

---

### organizationId?

> `optional` **organizationId?**: `string`

Organization/tenant ID for multi-tenant apps

---

### emailVerified?

> `optional` **emailVerified?**: `boolean`

Email verification status

---

### createdAt?

> `optional` **createdAt?**: `Date`

Account creation timestamp

---

### updatedAt?

> `optional` **updatedAt?**: `Date`

Last update timestamp

---

### lastLoginAt?

> `optional` **lastLoginAt?**: `Date`

Last login timestamp
