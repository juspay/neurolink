[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerMemoryActor

# Type Alias: ServerMemoryActor

> **ServerMemoryActor** = `object`

Who is calling a memory route. `user` is the authenticated user the request
is scoped to, and `undefined` when the routes are unscoped (no `perUserAuth`).

## Properties

### user

> **user**: [`AuthenticatedUser`](AuthenticatedUser.md) \| `undefined`

---

### admin

> **admin**: `boolean`
