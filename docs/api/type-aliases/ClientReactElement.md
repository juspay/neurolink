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

`type` is either a host-element tag (a string) or the provider's descriptor,
which is what the element returned by `NeuroLinkProvider` carries at runtime.
Narrow it before use (`typeof element.type === "string"`); a string method
called on it directly is a compile error. Nothing should rely on it: it names
React's internal representation, which React may change.

## Properties

### type

> **type**: `string` \| [`ClientReactProviderDescriptor`](ClientReactProviderDescriptor.md)

---

### props

> **props**: `unknown`

---

### key

> **key**: `string` \| `null`
