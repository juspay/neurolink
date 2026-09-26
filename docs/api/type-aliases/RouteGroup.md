[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteGroup

# Type Alias: RouteGroup

> **RouteGroup** = `object`

Route group for organizing related routes

## Properties

### prefix

> **prefix**: `string`

Group prefix

---

### routes

> **routes**: [`RouteDefinition`](RouteDefinition.md)[]

Routes in this group

---

### middleware?

> `optional` **middleware?**: [`MiddlewareDefinition`](MiddlewareDefinition.md)[]

Middleware specific to this group

---

### auth?

> `optional` **auth?**: `boolean`

Group-level authentication

---

### roles?

> `optional` **roles?**: `string`[]

Group-level roles
