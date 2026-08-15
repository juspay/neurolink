[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerValidationResult

# Type Alias: ServerValidationResult\<T\>

> **ServerValidationResult**\<`T`\> = \{ `success`: `true`; `data`: `T`; `error?`: `undefined`; \} \| \{ `success`: `false`; `error`: [`ErrorResponse`](ErrorResponse.md); `data?`: `undefined`; \}

Defined in: [types/server.ts:1199](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1199)

Generic validation result with type-safe data or error.
Named ServerValidationResult to avoid collision with tools.ts ValidationResult.

## Type Parameters

### T

`T`
