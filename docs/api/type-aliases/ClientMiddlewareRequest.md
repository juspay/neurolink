[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientMiddlewareRequest

# Type Alias: ClientMiddlewareRequest

> **ClientMiddlewareRequest** = `object`

Defined in: [types/client.ts:471](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L471)

ClientMiddleware request object

## Properties

### url

> **url**: `string`

Defined in: [types/client.ts:473](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L473)

Request URL

---

### method

> **method**: `string`

Defined in: [types/client.ts:475](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L475)

HTTP method

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:477](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L477)

Request headers

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/client.ts:479](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L479)

Request body

---

### context

> **context**: [`ClientMiddlewareContext`](ClientMiddlewareContext.md)

Defined in: [types/client.ts:481](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L481)

ClientMiddleware context
