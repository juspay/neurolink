[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSessionConfig

# Type Alias: ServerSessionConfig

> **ServerSessionConfig** = `object`

Session middleware configuration

The middleware only has an effect on a server that carries middleware state
(`ServerAdapterConfig.carryMiddlewareState`, which `registerAllRoutes()`
turns on when given `perUserAuth`); without it the handler does not see the
session it sets, except on Hono for a request whose client sent its own
`X-Request-ID`, which shares one context with the handler either way (with
`perUserAuth` off, the agent routes can then use that session).

## Properties

### headerName?

> `optional` **headerName?**: `string`

Header that carries the session id (default: "X-Session-Id"). A header
holding an invalid id is a 400; an empty one counts as absent. The default
is in the servers' default CORS allowed headers; a different name is not,
so a browser client on another origin needs it added to `cors.headers`.

---

### cookieName?

> `optional` **cookieName?**: `string`

Cookie that carries the session id, read when the header is absent or
empty. Off by default: a cookie is sent by the browser on its own, so
enabling it is the operator's decision. A cookie holding an invalid id is
ignored, as if absent, rather than failing the request.

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Skip the middleware for certain paths
