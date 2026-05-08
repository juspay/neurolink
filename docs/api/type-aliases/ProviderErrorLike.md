[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorLike

# Type Alias: ProviderErrorLike

> **ProviderErrorLike** = `Error` & `object`

Defined in: [types/providers.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L107)

Structural type for provider errors from external sources.
For throwing errors, use the ProviderError class from errors.ts.

## Type Declaration

### code?

> `optional` **code?**: `string` \| `number`

### statusCode?

> `optional` **statusCode?**: `number`

### provider?

> `optional` **provider?**: `string`

### originalError?

> `optional` **originalError?**: `unknown`
