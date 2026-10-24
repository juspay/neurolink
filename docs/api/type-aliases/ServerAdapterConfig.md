[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterConfig

# Type Alias: ServerAdapterConfig

> **ServerAdapterConfig** = `object`

Server adapter configuration

## Properties

### port?

> `optional` **port?**: `number`

Server port (default: 3000)

---

### host?

> `optional` **host?**: `string`

Server host (default: "0.0.0.0")

---

### basePath?

> `optional` **basePath?**: `string`

Base path for all routes (default: "/api")

---

### cors?

> `optional` **cors?**: [`CORSConfig`](CORSConfig.md)

CORS configuration

---

### rateLimit?

> `optional` **rateLimit?**: [`RateLimitConfig`](RateLimitConfig.md)

Rate limiting configuration

---

### bodyParser?

> `optional` **bodyParser?**: [`BodyParserConfig`](BodyParserConfig.md)

Body parser configuration

---

### logging?

> `optional` **logging?**: [`LoggingConfig`](LoggingConfig.md)

Logging configuration

---

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds (default: 30000)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Enable metrics endpoint (default: true)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Enable Swagger/OpenAPI documentation (default: false)

---

### disableBuiltInHealth?

> `optional` **disableBuiltInHealth?**: `boolean`

Disable built-in health routes (use when registering healthRoutes separately)

---

### redaction?

> `optional` **redaction?**: [`RedactionConfig`](RedactionConfig.md)

Stream redaction configuration (disabled by default)

---

### shutdown?

> `optional` **shutdown?**: [`ShutdownConfig`](ShutdownConfig.md)

Shutdown configuration for graceful shutdown behavior

---

### carryMiddlewareState?

> `optional` **carryMiddlewareState?**: `boolean`

Carry what middleware sets on its context (`ctx.user`, `ctx.session`,
`ctx.metadata`, `ctx.abortSignal` and `ctx.abortController`) to later
middleware and to the route handler, on every built-in adapter (default:
`false`). It does not apply to a context you build yourself: a custom
adapter, or a route handler called directly, can supply a context that
already has `ctx.user` set.

Off, each adapter propagates context as it always did. Express, Fastify
and Koa build a fresh context for every middleware step and for the
handler and carry only `responseHeaders`; Hono shares one context between
the steps and the handler only when the caller sent its own
`X-Request-ID`. So a role guard, a permission guard or a rate-limit
`keyGenerator` registered after authentication sees `ctx.user` only on
that Hono request shape: on Express, Fastify and Koa, and on Hono without
a caller `X-Request-ID`, the user never reaches it and the guard refuses
everyone.

On, the user and the rest reach later middleware and the handler on every
built-in adapter. Set it when guards or key generators depend on `ctx.user`.
`registerAllRoutes()` turns it on for the server by itself when called with
`perUserAuth`, which needs the user in the handler. A caller that builds
the agent routes with `createAgentRoutes(basePath, { perUserAuth: true })`
and registers them itself must set this on the server: with it off, such a
request has a user only on Hono when the client sent its own
`X-Request-ID`, and every other request runs as anonymous (no `userId`, no
session).

The agent routes' warning about a body naming another user is raised only
with this on. With it off, a handler that does receive `ctx.user` (Hono
when the caller sent its own `X-Request-ID`) takes the user from it and
ignores the body's `userId`, so nothing is named over it; every other
request reaches the handler without a `ctx.user` to compare against.
