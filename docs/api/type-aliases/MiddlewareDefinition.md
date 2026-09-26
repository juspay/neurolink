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

Execution order (lower = earlier)

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
