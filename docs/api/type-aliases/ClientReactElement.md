[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientReactElement

# Type Alias: ClientReactElement

> **ClientReactElement** = `object`

What `NeuroLinkProvider` returns, spelled without importing React.

The published declaration of the hooks module cannot name a React type: `react`
is an optional peer, and a consumer without it fails to compile the whole
`@juspay/neurolink/client` entry point (TS2307). This is the shape of React's
element, so a value of this type is still a valid JSX component return and
assignable to `ReactNode` and `ReactElement`.

`type` is declared `string` only so the value stays assignable to React's
element type. At runtime the provider's element carries the context
provider's descriptor there, as every `JSX.Element` does; do not read it.

## Properties

### type

> **type**: `string`

---

### props

> **props**: `unknown`

---

### key

> **key**: `string` \| `null`
