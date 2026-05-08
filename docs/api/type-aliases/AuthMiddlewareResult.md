[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareResult

# Type Alias: AuthMiddlewareResult

> **AuthMiddlewareResult** = `object`

Defined in: [types/auth.ts:1318](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1318)

Result produced by an auth middleware handler.

## Properties

### proceed

> **proceed**: `boolean`

Defined in: [types/auth.ts:1319](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1319)

---

### context?

> `optional` **context?**: [`AuthenticatedContext`](AuthenticatedContext.md)

Defined in: [types/auth.ts:1320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1320)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/auth.ts:1321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1321)

#### statusCode

> **statusCode**: `number`

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`
