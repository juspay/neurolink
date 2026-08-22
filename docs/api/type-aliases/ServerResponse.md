[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerResponse

# Type Alias: ServerResponse\<T\>

> **ServerResponse**\<`T`\> = `object`

Defined in: [types/server.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L324)

Server response object

## Type Parameters

### T

`T` = `unknown`

## Properties

### data?

> `optional` **data?**: `T`

Defined in: [types/server.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L326)

Response data

---

### error?

> `optional` **error?**: `object`

Defined in: [types/server.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L329)

Error information

#### code

> **code**: `string`

#### message

> **message**: `string`

#### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/server.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L336)

Response metadata

#### requestId

> **requestId**: `string`

#### timestamp

> **timestamp**: `string`

#### duration?

> `optional` **duration?**: `number`
