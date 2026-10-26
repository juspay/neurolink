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

Paths to apply middleware to (default: all). An entry matches the path
itself and everything under it at a segment boundary (`/api/agent` matches
`/api/agent/execute`, never `/api/agents`).

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Paths to exclude from middleware, matched the same way as `paths`.

---

### authenticates?

> `optional` **authenticates?**: `boolean`

`true` when this middleware authenticates requests (sets `ctx.user` or
refuses). `createAuthMiddleware` and `createBearerAuthMiddleware` set it.
The adapter's `hasAuthenticationMiddleware()` reads it, and so the tool
and MCP execution routes decide whether the server is open to anyone who
can reach it. Set it on your own authentication middleware.
