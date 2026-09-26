[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorResponse

# Type Alias: ErrorResponse

> **ErrorResponse** = `object`

Defined in: [types/server.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1191)

Standardized error response format

## Properties

### error

> **error**: `object`

Defined in: [types/server.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1192)

#### code

> **code**: `string`

#### message

> **message**: `string`

#### details?

> `optional` **details?**: `unknown`

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/server.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1197)

#### timestamp

> **timestamp**: `string`

#### requestId?

> `optional` **requestId?**: `string`

---

### httpStatus?

> `optional` **httpStatus?**: `number`

Defined in: [types/server.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1201)
