[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientReactProviderDescriptor

# Type Alias: ClientReactProviderDescriptor

> **ClientReactProviderDescriptor** = (`props`) => `never` & `object`

What `type` holds on the element `NeuroLinkProvider` returns: React's context
provider descriptor, an exotic component that carries a `$$typeof` tag and is
not meant to be called.

Spelled without importing React, for the reason given on `ClientReactElement`.
The call signature never returns, so the descriptor cannot be called for a
value, and `props` is `unknown` so it still fits React's `JSXElementConstructor`.

## Type Declaration

### $$typeof

> `readonly` **$$typeof**: `symbol`
