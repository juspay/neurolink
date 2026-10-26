[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSensitiveRouteOptions

# Type Alias: ServerSensitiveRouteOptions

> **ServerSensitiveRouteOptions** = `object`

Options of the route groups that act on the host (tool execution, MCP
server execution and removal). `createAllRoutes` derives them from
`CreateRoutesOptions.allowUnauthenticated` / `hasAuthentication`.

## Properties

### hasAuthentication?

> `optional` **hasAuthentication?**: () => `boolean`

Whether the server authenticates its callers, read on every request. When
it answers `false` the execution routes refuse with 403. Omitted, the
routes cannot tell and stay open.

#### Returns

`boolean`

---

### allowUnauthenticated?

> `optional` **allowUnauthenticated?**: `boolean`

Serve the execution routes to unauthenticated callers regardless.
