[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareResult

# Type Alias: AuthMiddlewareResult

> **AuthMiddlewareResult** = `object`

Result produced by an auth middleware handler.

## Properties

### proceed

> **proceed**: `boolean`

---

### context?

> `optional` **context?**: [`AuthenticatedContext`](AuthenticatedContext.md)

---

### error?

> `optional` **error?**: `object`

#### statusCode

> **statusCode**: `number`

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`
