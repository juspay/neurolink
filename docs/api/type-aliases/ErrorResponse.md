[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorResponse

# Type Alias: ErrorResponse

> **ErrorResponse** = `object`

Defined in: [types/server.ts:1182](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1182)

Standardized error response format

## Properties

### error

> **error**: `object`

Defined in: [types/server.ts:1183](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1183)

#### code

> **code**: `string`

#### message

> **message**: `string`

#### details?

> `optional` **details?**: `unknown`

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/server.ts:1188](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1188)

#### timestamp

> **timestamp**: `string`

#### requestId?

> `optional` **requestId?**: `string`

---

### httpStatus?

> `optional` **httpStatus?**: `number`

Defined in: [types/server.ts:1192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1192)
