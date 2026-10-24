[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareDefinition

# Type Alias: MiddlewareDefinition

> **MiddlewareDefinition** = `object`

Middleware definition

## Properties

### name

> **name**: `string`

Middleware name

---

### order?

> `optional` **order?**: `number`

Where this middleware belongs relative to the others, for reading and for
the debug log. Informational only: the adapters do not sort by it, they run
middleware in the order it was registered. The built-ins' numbers (for
example authentication 10, session 12) say what to register first.

---

### handler

> **handler**: [`MiddlewareHandler`](MiddlewareHandler.md)

Middleware handler

---

### paths?

> `optional` **paths?**: `string`[]

Paths to apply middleware to (default: all)

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Paths to exclude from middleware
