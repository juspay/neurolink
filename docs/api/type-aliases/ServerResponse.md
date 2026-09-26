[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerResponse

# Type Alias: ServerResponse\<T\>

> **ServerResponse**\<`T`\> = `object`

Server response object

## Type Parameters

### T

`T` = `unknown`

## Properties

### data?

> `optional` **data?**: `T`

Response data

---

### error?

> `optional` **error?**: `object`

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

Response metadata

#### requestId

> **requestId**: `string`

#### timestamp

> **timestamp**: `string`

#### duration?

> `optional` **duration?**: `number`
