[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkProviderProps

# Type Alias: NeuroLinkProviderProps

> **NeuroLinkProviderProps** = `object`

Defined in: [types/client.ts:522](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L522)

Props for the NeuroLinkProvider React component.

`children` is typed as `unknown` so this module stays React-agnostic;
the provider component in reactHooks.tsx narrows it to `ReactNode`.

## Properties

### config

> **config**: [`ClientConfig`](ClientConfig.md)

Defined in: [types/client.ts:524](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L524)

Client configuration

---

### children

> **children**: `unknown`

Defined in: [types/client.ts:526](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L526)

Child components (ReactNode at runtime)
