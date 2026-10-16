[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerMemoryRouteOptions

# Type Alias: ServerMemoryRouteOptions

> **ServerMemoryRouteOptions** = `object`

Options for `createMemoryRoutes()`.

## Properties

### adminRoles?

> `optional` **adminRoles?**: `string`[]

Roles allowed to read another user's sessions, read memory statistics and
clear every session. Default `["admin"]`. Only consulted when the request
carries an authenticated user: a server with no per-user authentication
(no auth, or one shared API key) has no identity to scope by, and its
memory routes behave as they always have.
