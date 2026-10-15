[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthResult

# Type Alias: AuthResult

> **AuthResult** = `object`

## Properties

### id

> **id**: `string`

User ID

---

### email?

> `optional` **email?**: `string`

User email (optional)

---

### roles?

> `optional` **roles?**: `string`[]

User roles (optional)

---

### shared?

> `optional` **shared?**: `boolean`

`true` when this identity stands for every holder of one credential, such
as a shared API key, rather than one person. Carried to `ctx.user.shared`;
see `AuthenticatedUser.shared`.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Additional user data
