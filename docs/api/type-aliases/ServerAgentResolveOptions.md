[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAgentResolveOptions

# Type Alias: ServerAgentResolveOptions

> **ServerAgentResolveOptions** = [`ServerAgentRouteOptions`](ServerAgentRouteOptions.md) & `object`

The route options plus the one thing that belongs to a single call:
`resolveAgentInput` options. A signal is not route configuration, so it is
kept off [ServerAgentRouteOptions](ServerAgentRouteOptions.md), where `createAgentRoutes` would
apply it to every request.

## Type Declaration

### signal?

> `optional` **signal?**: `AbortSignal`

Cancels the resolution: an `https` download in flight is aborted and no
further attachment is started. Omitted, nothing can cancel it.
