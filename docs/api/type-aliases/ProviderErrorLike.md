[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorLike

# Type Alias: ProviderErrorLike

> **ProviderErrorLike** = `Error` & `object`

Defined in: [types/providers.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L127)

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
