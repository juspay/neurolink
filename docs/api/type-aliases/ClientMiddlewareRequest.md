[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddlewareRequest

# Type Alias: ClientMiddlewareRequest

> **ClientMiddlewareRequest** = `object`

Defined in: [types/client.ts:471](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L471)

ClientMiddleware request object

## Properties

### url

> **url**: `string`

Defined in: [types/client.ts:473](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L473)

Request URL

---

### method

> **method**: `string`

Defined in: [types/client.ts:475](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L475)

HTTP method

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:477](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L477)

Request headers

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/client.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L479)

Request body

---

### context

> **context**: [`ClientMiddlewareContext`](ClientMiddlewareContext.md)

Defined in: [types/client.ts:481](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L481)

ClientMiddleware context
