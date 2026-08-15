[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorLike

# Type Alias: ProviderErrorLike

> **ProviderErrorLike** = `Error` & `object`

Defined in: [types/providers.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L127)

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
