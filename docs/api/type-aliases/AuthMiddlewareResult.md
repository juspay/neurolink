[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareResult

# Type Alias: AuthMiddlewareResult

> **AuthMiddlewareResult** = `object`

Defined in: [types/auth.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1318)

Result produced by an auth middleware handler.

## Properties

### proceed

> **proceed**: `boolean`

Defined in: [types/auth.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1319)

---

### context?

> `optional` **context?**: [`AuthenticatedContext`](AuthenticatedContext.md)

Defined in: [types/auth.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1320)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/auth.ts:1321](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L1321)

#### statusCode

> **statusCode**: `number`

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`
