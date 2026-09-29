[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAllRoutes

# Function: createAllRoutes()

> **createAllRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)[]

Create all standard routes
Convenience method that combines all route groups

NOTE on the Codex outbound fallback's `anthropic` target: this function
does not thread `loopbackPort`/`internalDispatch` into
`createCodexProxyRoutes`, so that target cannot dispatch when the feature
is enabled through `options.runtimeConfigProvider` here — only the CLI
proxy command wires the in-process loopback directly. Route creation logs
one warning when this gap applies; see `CreateRoutesOptions.runtimeConfigProvider`
and docs/features/codex-proxy-support.md.

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`CreateRoutesOptions`](../type-aliases/CreateRoutesOptions.md)

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)[]
