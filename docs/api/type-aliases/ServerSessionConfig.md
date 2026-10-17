[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSessionConfig

# Type Alias: ServerSessionConfig

> **ServerSessionConfig** = `object`

Session middleware configuration

## Properties

### headerName?

> `optional` **headerName?**: `string`

Header that carries the session id (default: "X-Session-Id")

---

### cookieName?

> `optional` **cookieName?**: `string`

Cookie that carries the session id, read when the header is absent.
Off by default: a cookie is sent by the browser on its own, so enabling it
is the operator's decision.

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Skip the middleware for certain paths
