[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkProviderProps

# Type Alias: NeuroLinkProviderProps

> **NeuroLinkProviderProps** = `object`

Props for the NeuroLinkProvider React component.

`children` is typed as `unknown` so this module stays React-agnostic;
the provider component in reactHooks.tsx narrows it to `ReactNode`.

## Properties

### config

> **config**: [`ClientConfig`](ClientConfig.md)

Client configuration

---

### children

> **children**: `unknown`

Child components (ReactNode at runtime)
