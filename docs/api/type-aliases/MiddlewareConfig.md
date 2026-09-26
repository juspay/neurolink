[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareConfig

# Type Alias: MiddlewareConfig

> **MiddlewareConfig** = `object`

Middleware configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Whether the middleware is enabled

---

### config?

> `optional` **config?**: `Record`\<`string`, `unknown`\>

Middleware-specific configuration

---

### conditions?

> `optional` **conditions?**: [`MiddlewareConditions`](MiddlewareConditions.md)

Conditions under which to apply this middleware
