[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAgentRoutes

# Function: createAgentRoutes()

> **createAgentRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create agent routes

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerAgentRouteOptions`](../type-aliases/ServerAgentRouteOptions.md)

Limits for `input.images` / `input.files`:
`allowedInputRoots` (default: none, every local-path attachment is
refused), `maxInputBytes` per attachment (default 50 MiB),
`maxInputAttachments` per request (default 20, images and files together)
and `maxInputTotalBytes` per request (default 100 MiB, one budget shared by
images and files).

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
