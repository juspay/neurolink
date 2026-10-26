[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createToolRoutes

# Function: createToolRoutes()

> **createToolRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create tool routes

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerSensitiveRouteOptions`](../type-aliases/ServerSensitiveRouteOptions.md)

`hasAuthentication` / `allowUnauthenticated`: whether the
execution routes answer an unauthenticated caller (see
`ServerSensitiveRouteOptions`). `createAllRoutes` supplies them.

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
