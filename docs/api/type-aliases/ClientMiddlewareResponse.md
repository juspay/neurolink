[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddlewareResponse

# Type Alias: ClientMiddlewareResponse

> **ClientMiddlewareResponse** = `object`

Defined in: [types/client.ts:487](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L487)

ClientMiddleware response object

## Properties

### status

> **status**: `number`

Defined in: [types/client.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L489)

HTTP status code

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L491)

Response headers

---

### body

> **body**: `unknown`

Defined in: [types/client.ts:493](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L493)

Response body

---

### context

> **context**: [`ClientMiddlewareContext`](ClientMiddlewareContext.md)

Defined in: [types/client.ts:495](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L495)

ClientMiddleware context
