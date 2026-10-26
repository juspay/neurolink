[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMCPRoutes

# Function: createMCPRoutes()

> **createMCPRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create MCP server management routes

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerSensitiveRouteOptions`](../type-aliases/ServerSensitiveRouteOptions.md)

`hasAuthentication` / `allowUnauthenticated`: whether the
routes that change or use servers (reconnect, remove, execute a tool)
answer an unauthenticated caller (see `ServerSensitiveRouteOptions`).

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
