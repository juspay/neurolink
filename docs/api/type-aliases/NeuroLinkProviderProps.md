[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkProviderProps

# Type Alias: NeuroLinkProviderProps

> **NeuroLinkProviderProps** = `object`

Props for the NeuroLinkProvider React component.

`children` is typed as `unknown` so the declaration needs no React types.
Anything React accepts as a child is accepted, and so is anything else: the
type does not check it. The component renders it as a React node, so a value
React cannot render (a function, a plain object) compiles and then fails in
React at render time.

## Properties

### config

> **config**: [`ClientConfig`](ClientConfig.md)

Client configuration

---

### children

> **children**: `unknown`

Child components. Typed `unknown` and rendered as a React node without a type check.
