[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticatedUser

# Type Alias: AuthenticatedUser

> **AuthenticatedUser** = `object`

Authenticated user information

## Properties

### id

> **id**: `string`

---

### shared?

> `optional` **shared?**: `boolean`

`true` when this identity stands for every holder of one credential, such
as a shared API key, rather than for one person. The agent routes then do
not warn when a request names a different `userId` in its body: with a
shared key every caller is one trust domain and the body is how callers
keep separate conversation memory. Middleware that sets one fixed user for
everyone holding a key should set this; per-person middleware should not.

---

### email?

> `optional` **email?**: `string`

---

### name?

> `optional` **name?**: `string`

---

### roles?

> `optional` **roles?**: `string`[]

---

### permissions?

> `optional` **permissions?**: `string`[]

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
