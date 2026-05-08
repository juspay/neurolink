[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientApiResponse

# Type Alias: ClientApiResponse\<T\>

> **ClientApiResponse**\<`T`\> = `object`

Defined in: [types/client.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L82)

Response wrapper with metadata for all API responses

## Type Parameters

### T

`T`

## Properties

### data

> **data**: `T`

Defined in: [types/client.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L84)

Response data

---

### status

> **status**: `number`

Defined in: [types/client.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L86)

HTTP status code

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L88)

Response headers

---

### duration

> **duration**: `number`

Defined in: [types/client.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L90)

Request duration in milliseconds

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/client.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L92)

Request ID for tracing
