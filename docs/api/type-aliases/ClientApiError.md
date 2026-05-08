[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientApiError

# Type Alias: ClientApiError

> **ClientApiError** = `object`

Defined in: [types/client.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L98)

Error response from API

## Properties

### code

> **code**: `string`

Defined in: [types/client.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L100)

Error code (e.g., "RATE_LIMIT_EXCEEDED", "INVALID_REQUEST")

---

### message

> **message**: `string`

Defined in: [types/client.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L102)

Human-readable error message

---

### status

> **status**: `number`

Defined in: [types/client.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L104)

HTTP status code

---

### details?

> `optional` **details?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L106)

Additional error details

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/client.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L108)

Whether the error is retryable

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/client.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L110)

Request ID for tracing
