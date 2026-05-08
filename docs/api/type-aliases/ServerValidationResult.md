[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerValidationResult

# Type Alias: ServerValidationResult\<T\>

> **ServerValidationResult**\<`T`\> = \{ `success`: `true`; `data`: `T`; `error?`: `undefined`; \} \| \{ `success`: `false`; `error`: [`ErrorResponse`](ErrorResponse.md); `data?`: `undefined`; \}

Defined in: [types/server.ts:1199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1199)

Generic validation result with type-safe data or error.
Named ServerValidationResult to avoid collision with tools.ts ValidationResult.

## Type Parameters

### T

`T`
