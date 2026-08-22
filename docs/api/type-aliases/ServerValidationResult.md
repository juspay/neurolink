[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerValidationResult

# Type Alias: ServerValidationResult\<T\>

> **ServerValidationResult**\<`T`\> = \{ `success`: `true`; `data`: `T`; `error?`: `undefined`; \} \| \{ `success`: `false`; `error`: [`ErrorResponse`](ErrorResponse.md); `data?`: `undefined`; \}

Defined in: [types/server.ts:1199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1199)

Generic validation result with type-safe data or error.
Named ServerValidationResult to avoid collision with tools.ts ValidationResult.

## Type Parameters

### T

`T`
