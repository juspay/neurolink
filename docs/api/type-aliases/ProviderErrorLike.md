[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorLike

# Type Alias: ProviderErrorLike

> **ProviderErrorLike** = `Error` & `object`

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
