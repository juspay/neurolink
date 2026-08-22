[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkProviderProps

# Type Alias: NeuroLinkProviderProps

> **NeuroLinkProviderProps** = `object`

Defined in: [types/client.ts:522](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L522)

Props for the NeuroLinkProvider React component.

`children` is typed as `unknown` so this module stays React-agnostic;
the provider component in reactHooks.tsx narrows it to `ReactNode`.

## Properties

### config

> **config**: [`ClientConfig`](ClientConfig.md)

Defined in: [types/client.ts:524](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L524)

Client configuration

---

### children

> **children**: `unknown`

Defined in: [types/client.ts:526](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L526)

Child components (ReactNode at runtime)
