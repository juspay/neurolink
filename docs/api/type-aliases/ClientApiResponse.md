[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientApiResponse

# Type Alias: ClientApiResponse\<T\>

> **ClientApiResponse**\<`T`\> = `object`

Response wrapper with metadata for all API responses

## Type Parameters

### T

`T`

## Properties

### data

> **data**: `T`

Response data

---

### status

> **status**: `number`

HTTP status code

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Response headers

---

### duration

> **duration**: `number`

Request duration in milliseconds

---

### requestId?

> `optional` **requestId?**: `string`

Request ID for tracing
